import Share from '../../models/share/share.model.js';
import Student from '../../models/student/student.model.js';
import { calculateStudentEnabledStatus, updateStudentEnabledStatus } from '../../utils/student.utils.js';
import logger from '../../winston/logger.js';

// Obtener todas las cuotas
export const getAllShares = async (req, res) => {
    try {
        const { year } = req.query; // Filtro por año
        const query = { student: { $ne: null } };
        if (year) {
            query.year = parseInt(year);
        }

        const shares = await Share.find(query)
            .populate({
                path: 'student',
                select: 'name lastName mail dni school category color isEnabled',
            });

        if (shares.length === 0) {
            return res.status(200).json({ message: 'No hay cuotas disponibles' });
        }
        res.status(200).json(shares);
    } catch (error) {
        console.error('Error en getAllShares:', error);
        return res.status(500).json({ message: 'Error al obtener cuotas', error: error.message });
    }
};
// Crear una nueva cuota (individual)
export const createShare = async (req, res) => {
    logger.info('Entrando en createShare', { path: req.path, body: req.body });
  const { student, paymentName, year, amount, paymentDate, paymentMethod, paymentType } = req.body;

  if (!student || !paymentName || !year) {
    logger.warn('Faltan campos obligatorios en createShare', { student, paymentName, year });
    return res.status(400).json({ message: 'Faltan campos obligatorios: student, paymentName, year' });
  }

  try {
    logger.info('Iniciando creación de nueva cuota', { student, paymentName, year });
    const studentExists = await Student.findById(student);
    if (!studentExists) {
      logger.error('Estudiante no encontrado', { student });
      return res.status(404).json({ message: 'Estudiante no encontrado' });
    }

    const userName = req.user?.name || 'UsuarioDesconocido';
  logger.info('Asignando registeredBy:', { userName });

    const newShare = await Share.create({
      student,
      paymentName,
      year,
      amount: amount || null,
      paymentDate: paymentDate || null,
      paymentMethod: paymentDate ? paymentMethod : null,
      paymentType: paymentDate ? paymentType : null,
      status: paymentDate ? 'Pagado' : 'Pendiente',
      registeredBy: userName,
    });

    logger.info('Cuota creada exitosamente', { shareId: newShare._id, registeredBy: userName });
    await updateStudentEnabledStatus(student);
    logger.info('Estado del estudiante actualizado', { student });

    res.status(201).json({
      message: 'La cuota se agregó exitosamente',
      share: newShare,
    });
  } catch (error) {
    logger.error('Error al crear la cuota', { error: error.message, stack: error.stack });
    return res.status(500).json({ message: 'Error al crear la cuota', error: error.message });
  }
};
// Crear cuotas masivas
export const createMassiveShares = async (req, res) => {
    const { paymentName, year } = req.body;

    if (!paymentName || !year) {
        logger.warn('Faltan campos obligatorios en createMassiveShares', { paymentName, year });
        return res.status(400).json({ message: 'Faltan campos obligatorios: paymentName y year son requeridos.' });
    }

    try {
        // Validar el formato del año
        const parsedYear = parseInt(year);
        if (isNaN(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
            logger.warn('Año inválido', { year });
            return res.status(400).json({ message: `El año ${year} es inválido. Debe ser un número entre 2000 y 2100.` });
        }

        // Validar el formato de paymentName
        const validNames = [
            `Primera cuota - Semestre 1 - ${parsedYear}`,
            `Segunda cuota - Semestre 1 - ${parsedYear}`,
            `Primera cuota - Semestre 2 - ${parsedYear}`,
            `Segunda cuota - Semestre 2 - ${parsedYear}`,
        ];
        if (!validNames.includes(paymentName)) {
            logger.warn('Nombre de cuota inválido', { paymentName, validNames });
            return res.status(400).json({ message: `El nombre de la cuota "${paymentName}" no es válido para el año ${parsedYear}.` });
        }

        // Obtener estudiantes activos
        const students = await Student.find({ status: "Activo" }, '_id dni');
        if (students.length === 0) {
            logger.info('No hay estudiantes activos', { year: parsedYear });
            return res.status(404).json({ message: 'No hay estudiantes activos registrados en el sistema.' });
        }

        const sharesToCreate = [];
        const skippedStudents = [];
        const errors = [];

        // Determinar si es una segunda cuota
        const isSecondShare = paymentName.includes('Segunda cuota');
        const isSemestre1 = paymentName.includes('Semestre 1');
        const firstShareName = isSemestre1
            ? `Primera cuota - Semestre 1 - ${parsedYear}`
            : `Primera cuota - Semestre 2 - ${parsedYear}`;

        for (const student of students) {
            try {
                // Verificar si el estudiante ya tiene la cuota solicitada
                const existingShare = await Share.findOne({
                    student: student._id,
                    paymentName,
                    year: parsedYear,
                });

                if (existingShare) {
                    logger.info('Cuota ya existe para estudiante', { student: student._id, paymentName });
                    skippedStudents.push(student._id);
                    continue;
                }

                // Para primeras cuotas, crear para todos los estudiantes activos
                if (!isSecondShare) {
                    sharesToCreate.push({
                        student: student._id,
                        paymentName,
                        year: parsedYear,
                        amount: null,
                        paymentDate: null,
                        paymentMethod: null,
                        paymentType: null,
                        status: 'Pendiente',
                    });
                    logger.info('Creando primera cuota para estudiante', { student: student._id, paymentName });
                    continue;
                }

                // Para segundas cuotas, verificar la primera cuota del mismo semestre
                if (isSecondShare) {
                    const firstShare = await Share.findOne({
                        student: student._id,
                        paymentName: firstShareName,
                        year: parsedYear,
                    });

                    // Si no existe la primera cuota, omitir
                    if (!firstShare) {
                        logger.info('Primera cuota no encontrada para estudiante', { student: student._id, firstShareName });
                        skippedStudents.push(student._id);
                        continue;
                    }

                    // Si la primera cuota está Pendiente y no tiene datos de pago, omitir
                    if (
                        firstShare.status === 'Pendiente' &&
                        !firstShare.amount &&
                        !firstShare.paymentMethod &&
                        !firstShare.paymentDate &&
                        !firstShare.paymentType
                    ) {
                        logger.info('Primera cuota pendiente sin datos de pago, omitiendo', { student: student._id, firstShareName });
                        skippedStudents.push(student._id);
                        continue;
                    }

                    // Si la primera cuota tiene Pago Total, omitir
                    if (firstShare.paymentType === 'Pago Total') {
                        logger.info('Primera cuota con Pago Total, omitiendo', { student: student._id, firstShareName });
                        skippedStudents.push(student._id);
                        continue;
                    }

                    // Si la primera cuota tiene Pago Parcial y está Pagada, crear la segunda cuota
                    if (firstShare.paymentType === 'Pago Parcial' && firstShare.status === 'Pagado') {
                        sharesToCreate.push({
                            student: student._id,
                            paymentName,
                            year: parsedYear,
                            amount: null,
                            paymentDate: null,
                            paymentMethod: null,
                            paymentType: null,
                            status: 'Pendiente',
                        });
                        logger.info('Creando segunda cuota para estudiante con Pago Parcial', { student: student._id, paymentName });
                    } else {
                        logger.info('Primera cuota no cumple criterios (no Pagada o sin Pago Parcial), omitiendo', { student: student._id, firstShareName });
                        skippedStudents.push(student._id);
                    }
                }
            } catch (error) {
                logger.error(`Error al procesar estudiante con DNI ${student.dni || 'desconocido'}`, { error: error.message });
                errors.push(`Error al procesar el estudiante con DNI ${student.dni || 'desconocido'}: ${error.message}`);
            }
        }

        if (errors.length > 0) {
            logger.warn('Errores al procesar estudiantes', { errors });
            return res.status(400).json({
                message: `Se encontraron errores al procesar algunos estudiantes.`,
                errors,
                created: sharesToCreate.length,
                skipped: skippedStudents.length,
            });
        }

        if (sharesToCreate.length === 0) {
            logger.info('No se crearon cuotas', { skipped: skippedStudents.length });
            return res.status(200).json({
                message: 'No se crearon cuotas porque todos los estudiantes activos ya tienen esta cuota o no cumplen los criterios.',
                skipped: skippedStudents.length,
            });
        }

        const newShares = await Share.insertMany(sharesToCreate);
        logger.info('Cuotas masivas creadas exitosamente', { created: newShares.length, skipped: skippedStudents.length });

        for (const student of students) {
            await updateStudentEnabledStatus(student._id);
        }

        res.status(201).json({
            message: `Se crearon ${newShares.length} cuotas exitosamente. Se omitieron ${skippedStudents.length} estudiantes que ya tenían la cuota o no cumplen los criterios.`,
            shares: newShares,
            skipped: skippedStudents.length,
        });
    } catch (error) {
        logger.error('Error al crear cuotas masivas', { error: error.message, stack: error.stack });
        return res.status(500).json({
            message: 'Error al crear cuotas masivas.',
            error: error.message,
            details: error.stack,
        });
    }
};
// Actualizar una cuota (registrar pago)
export const updateShare = async (req, res) => {
  const { paymentName, amount, paymentDate, paymentMethod, paymentType } = req.body;

  try {
    logger.info('Iniciando actualización de cuota', { shareId: req.params.id });
    const share = await Share.findById(req.params.id);
    if (!share) {
      logger.error('Cuota no encontrada', { shareId: req.params.id });
      return res.status(404).json({ message: 'Cuota no encontrada' });
    }

       // Cambiar la validación para permitir 0
    if (paymentDate && (amount == null || !paymentMethod || !paymentType)) {
      logger.warn('Faltan campos obligatorios para registrar el pago', { amount, paymentMethod, paymentType });
      return res.status(400).json({ message: 'Faltan campos obligatorios para registrar el pago: Monto, Metodo de pago, Tipo de pago' });
    }

    const userName = req.user?.name || 'UsuarioDesconocido';
    logger.info('Usuario asignado para registeredBy en actualización', { userName });
    share.paymentName = paymentName !== undefined ? paymentName : share.paymentName;
    share.year = share.year;
    share.amount = amount !== undefined ? amount : share.amount;
    share.paymentDate = paymentDate !== undefined ? paymentDate : share.paymentDate;
    share.paymentMethod = paymentMethod !== undefined ? paymentMethod : share.paymentMethod;
    share.paymentType = paymentType !== undefined ? paymentType : share.paymentType;
    share.status = paymentDate ? 'Pagado' : 'Pendiente';
    share.registeredBy = userName;

    await share.save();
    logger.info('Cuota actualizada exitosamente', { shareId: share._id, registeredBy: userName });

    await updateStudentEnabledStatus(share.student);
    logger.info('Estado del estudiante actualizado tras pago', { student: share.student });

    res.status(200).json({
      message: 'Cuota actualizada correctamente',
      share,
    });
  } catch (error) {
    logger.error('Error al actualizar la cuota', { error: error.message, stack: error.stack });
    return res.status(500).json({ message: 'Error al actualizar la cuota', error: error.message });
  }
};
// Eliminar una cuota
export const deleteShare = async (req, res) => {
    try {
        const share = await Share.findById(req.params.id);
        if (!share) {
            return res.status(404).json({ message: 'Cuota no encontrada' });
        }

        const studentId = share.student;
        await Share.findByIdAndDelete(req.params.id);

        await updateStudentEnabledStatus(studentId);

        res.json({ message: 'Cuota eliminada correctamente' });
    } catch (error) {
        return res.status(500).json({ message: 'Error al eliminar la cuota', error: error.message });
    }
};
// Obtener cuotas por estudiante
export const getSharesByStudent = async (req, res) => {
    try {
        const { year } = req.query; // Filtro por año
        const query = { student: req.params.id };
        if (year) {
            query.year = parseInt(year);
        }

        const shares = await Share.find(query)
            .populate({
                path: 'student',
                select: 'name lastName dni mail isEnabled',
            });

        if (shares.length === 0) {
            return res.status(200).json({ message: 'No hay cuotas para este estudiante' });
        }
        res.status(200).json(shares || []);
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener cuotas', error: error.message });
    }
};
// Obtener nombres de cuotas disponibles para un año
export const getAvailableShareNames = async (req, res) => {
    try {
        const { year } = req.query;
        if (!year) {
            logger.warn('Falta el campo year', { year });
            return res.status(400).json({ message: 'El campo year es obligatorio.' });
        }

        const parsedYear = parseInt(year);
        const possibleNames = [
            `Primera cuota - Semestre 1 - ${parsedYear}`,
            `Segunda cuota - Semestre 1 - ${parsedYear}`,
            `Primera cuota - Semestre 2 - ${parsedYear}`,
            `Segunda cuota - Semestre 2 - ${parsedYear}`,
        ];

        // Obtener estudiantes activos
        const activeStudents = await Student.find({ status: "Activo" }, '_id');
        const activeStudentIds = activeStudents.map(student => student._id);
        const totalActiveStudents = activeStudents.length;

        const availableNames = await Promise.all(possibleNames.map(async (name) => {
            let studentsNeedingShare = [...activeStudentIds];

            // Para segundas cuotas, filtrar estudiantes con Pago Parcial en la primera cuota del mismo semestre
            if (name.includes('Segunda cuota')) {
                const firstShareName = name.includes('Semestre 1')
                    ? `Primera cuota - Semestre 1 - ${parsedYear}`
                    : `Primera cuota - Semestre 2 - ${parsedYear}`;

                const firstShares = await Share.find({
                    paymentName: firstShareName,
                    year: parsedYear,
                    student: { $in: activeStudentIds },
                });

                studentsNeedingShare = firstShares
                    .filter(
                        (share) =>
                            share.paymentType === 'Pago Parcial' &&
                            share.status === 'Pagado' &&
                            share.amount &&
                            share.paymentMethod &&
                            share.paymentDate
                    )
                    .map((share) => share.student.toString());
            }

            // Contar cuántos estudiantes que necesitan esta cuota la tienen
            const shareCount = await Share.countDocuments({
                paymentName: name,
                year: parsedYear,
                student: { $in: studentsNeedingShare },
            });

            // La cuota está bloqueada si todos los que la necesitan ya la tienen
            const isBlocked = shareCount === studentsNeedingShare.length && totalActiveStudents > 0;

            return { name, isBlocked };
        }));

        res.status(200).json(availableNames);
    } catch (error) {
        logger.error('Error en getAvailableShareNames', { error: error.message });
        return res.status(500).json({ message: 'Error al obtener nombres disponibles.', error: error.message });
    }
};

export const getSharesBySemester = async (req, res) => {
    try {
        const { semester } = req.query;
        if (!semester) {
            logger.warn('Falta el parámetro semester', { semester });
            return res.status(400).json({ message: 'El parámetro semester es obligatorio' });
        }

        // Dividir el semester y extraer año y número de semestre
        const parts = semester.split(' ');
        if (parts.length < 3 || isNaN(parseInt(parts[2]))) {
            logger.warn('Formato de semestre inválido', { semester });
            return res.status(400).json({ message: 'El formato del parámetro semester es inválido. Use "Semestre X YYYY"' });
        }
        const semesterNumber = parts[1]; // "2" de "Semestre 2 2025"
        const year = parts[2]; // "2025" de "Semestre 2 2025"

        logger.info('Parámetros de entrada', { semester, year, semesterNumber });

        // Construir el patrón como string para $regex
        const regexPattern = `.*Semestre\\s*${semesterNumber}\\s*-\\s*${year}`;
        logger.info('Patrón de regex generado', { regexPattern });

        const aggregation = await Share.aggregate([
            {
                $match: {
                    year: parseInt(year),
                    paymentName: { $regex: regexPattern, $options: 'i' },
                    student: { $ne: null }
                }
            },
            {
                $sort: { paymentName: 1 } // Ordenar por paymentName para que la última cuota esté al final
            },
            {
                $group: {
                    _id: "$student",
                    paymentTypes: { $push: { $ifNull: ["$paymentType", null] } }, // Todos los paymentTypes
                    latestPaymentType: { $last: { $ifNull: ["$paymentType", null] } }, // Último paymentType
                    latestStatus: { $last: { $ifNull: ["$status", "Pendiente"] } }, // Último status
                    amounts: { $push: { $cond: [{ $eq: ["$status", "Pagado"] }, { $ifNull: ["$amount", 0] }, 0] } } // Amounts de cuotas pagadas
                }
            },
            {
                $group: {
                    _id: null,
                    alumnosConPagoParcial: {
                        $sum: { $cond: [
                            { $and: [
                                { $eq: ["$latestPaymentType", "Pago Parcial"] },
                                { $eq: ["$latestStatus", "Pagado"] }
                            ] },
                            1, 0
                        ]}
                    },
                    alumnosConPagoTotal: {
                        $sum: { $cond: [
                            { $eq: ["$latestPaymentType", "Pago Total"] },
                            1, 0
                        ]}
                    },
                    alumnosConCuotasPendientes: {
                        $sum: { $cond: [
                            { $eq: ["$latestStatus", "Pendiente"] },
                            1, 0
                        ]}
                    },
                    montoRecaudado: {
                        $sum: {
                            $reduce: {
                                input: "$amounts",
                                initialValue: 0,
                                in: { $add: ["$$value", "$$this"] }
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    alumnosConPagoParcial: 1,
                    alumnosConPagoTotal: 1,
                    alumnosConCuotasPendientes: 1,
                    montoRecaudado: 1
                }
            }
        ]);

        logger.info('Resultados de la agregación', { aggregationLength: aggregation.length, aggregation: aggregation });

        if (aggregation.length === 0 || !aggregation[0]) {
            logger.warn(`No se encontraron datos para ${semester}`, { semester, year, regexPattern });
            return res.status(200).json({
                message: `No hay datos disponibles para ${semester}`,
                data: {
                    alumnosConPagoParcial: 0,
                    alumnosConPagoTotal: 0,
                    alumnosConCuotasPendientes: 0,
                    montoRecaudado: 0
                }
            });
        }

        const result = aggregation[0];
        logger.info(`Estadísticas calculadas para ${semester}`, { result });
        res.status(200).json({
            alumnosConPagoParcial: result.alumnosConPagoParcial,
            alumnosConPagoTotal: result.alumnosConPagoTotal,
            alumnosConCuotasPendientes: result.alumnosConCuotasPendientes,
            montoRecaudado: result.montoRecaudado
        });
    } catch (error) {
        logger.error('Error en getSharesBySemester:', { error: error.message });
        return res.status(500).json({ message: 'Error al obtener estadísticas de cuotas por semestre', error: error.message });
    }
};