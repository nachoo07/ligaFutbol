import Share from '../../models/share/share.model.js';
import Student from '../../models/student/student.model.js';
import { calculateStudentEnabledStatus, updateStudentEnabledStatus } from '../../utils/student.utils.js';
import logger from '../../winston/logger.js';

const normalizeShareYear = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const normalizeOptionalString = (value) => {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
};

const isValidPaymentPayload = ({ amount, paymentDate, paymentMethod, paymentType }) => {
  const hasAnyPaymentField =
    amount != null ||
    !!paymentDate ||
    !!paymentMethod ||
    !!paymentType;

  if (!hasAnyPaymentField) {
    return { isPayment: false, error: null };
  }

  if (
    amount == null ||
    paymentDate == null ||
    !paymentMethod ||
    !paymentType
  ) {
    return {
      isPayment: true,
      error: 'Para registrar un pago debes completar monto, fecha, método de pago y tipo de pago.',
    };
  }

  if (Number.isNaN(Number(amount)) || Number(amount) < 0) {
    return {
      isPayment: true,
      error: 'El monto debe ser un número mayor o igual a 0.',
    };
  }

  const parsedDate = new Date(paymentDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return {
      isPayment: true,
      error: 'La fecha de pago no es válida.',
    };
  }

  return { isPayment: true, error: null };
};

// Obtener todas las cuotas
export const getAllShares = async (req, res) => {
  try {
    const { year } = req.query;
    const query = { student: { $ne: null } };

    if (year) {
      query.year = parseInt(year);
    }

    const shares = await Share.find(query).populate({
      path: 'student',
      select: 'name lastName mail dni school category color isEnabled',
    });

    return res.status(200).json(shares);
  } catch (error) {
    console.error('Error en getAllShares:', error);
    return res.status(500).json({
      message: 'Error al obtener cuotas',
      error: error.message,
    });
  }
};

// Crear una nueva cuota (individual)
export const createShare = async (req, res) => {
  logger.info('Entrando en createShare', { path: req.path, body: req.body });

  const {
    student,
    paymentName,
    year,
    amount,
    paymentDate,
    paymentMethod,
    paymentType,
  } = req.body;

  const normalizedYear = normalizeShareYear(year);

  if (!student || !paymentName || !normalizedYear) {
    logger.warn('Faltan campos obligatorios en createShare', { student, paymentName, year });
    return res.status(400).json({
      message: 'Faltan campos obligatorios: student, paymentName, year',
    });
  }

  try {
    const studentExists = await Student.findById(student);
    if (!studentExists) {
      return res.status(404).json({ message: 'Estudiante no encontrado' });
    }

    const existingShare = await Share.findOne({
      student,
      paymentName: paymentName.trim(),
      year: normalizedYear,
    });

    if (existingShare) {
      return res.status(400).json({
        message: 'Ese alumno ya tiene registrada esa cuota para ese año.',
      });
    }

    const normalizedPaymentMethod = normalizeOptionalString(paymentMethod);
    const normalizedPaymentType = normalizeOptionalString(paymentType);
    const normalizedPaymentDate = paymentDate ? new Date(paymentDate) : null;
    const normalizedAmount = amount !== '' && amount != null ? Number(amount) : null;

    const paymentValidation = isValidPaymentPayload({
      amount: normalizedAmount,
      paymentDate: normalizedPaymentDate,
      paymentMethod: normalizedPaymentMethod,
      paymentType: normalizedPaymentType,
    });

    if (paymentValidation.error) {
      return res.status(400).json({ message: paymentValidation.error });
    }

    const userName = req.user?.name || 'UsuarioDesconocido';

    const newShare = await Share.create({
      student,
      paymentName: paymentName.trim(),
      year: normalizedYear,
      amount: paymentValidation.isPayment ? normalizedAmount : null,
      paymentDate: paymentValidation.isPayment ? normalizedPaymentDate : null,
      paymentMethod: paymentValidation.isPayment ? normalizedPaymentMethod : null,
      paymentType: paymentValidation.isPayment ? normalizedPaymentType : null,
      status: paymentValidation.isPayment ? 'Pagado' : 'Pendiente',
      registeredBy: userName,
    });

    await updateStudentEnabledStatus(student);

    return res.status(201).json({
      message: paymentValidation.isPayment
        ? 'La cuota se registró con pago correctamente'
        : 'La cuota pendiente se creó correctamente',
      share: newShare,
    });
  } catch (error) {
    logger.error('Error al crear la cuota', { error: error.message, stack: error.stack });

    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Ese alumno ya tiene registrada esa cuota para ese año.',
      });
    }

    return res.status(500).json({
      message: 'Error al crear la cuota',
      error: error.message,
    });
  }
};

// Crear cuotas masivas
export const createMassiveShares = async (req, res) => {
    const { paymentName, year, school } = req.body;

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
            `Tercera cuota - Semestre 1 - ${parsedYear}`,
            `Primera cuota - Semestre 2 - ${parsedYear}`,
            `Segunda cuota - Semestre 2 - ${parsedYear}`,
            `Tercera cuota - Semestre 2 - ${parsedYear}`,
        ];
        if (!validNames.includes(paymentName)) {
            logger.warn('Nombre de cuota inválido', { paymentName, validNames });
            return res.status(400).json({ message: `El nombre de la cuota "${paymentName}" no es válido para el año ${parsedYear}.` });
        }

        const isSecondShare = paymentName.includes('Segunda cuota');
        const isThirdShare = paymentName.includes('Tercera cuota');
        const isSemestre1 = paymentName.includes('Semestre 1');
        const firstShareName = isSemestre1
            ? `Primera cuota - Semestre 1 - ${parsedYear}`
            : `Primera cuota - Semestre 2 - ${parsedYear}`;
        const secondShareName = isSemestre1
            ? `Segunda cuota - Semestre 1 - ${parsedYear}`
            : `Segunda cuota - Semestre 2 - ${parsedYear}`;

        if (isThirdShare && !school?.trim()) {
            return res.status(400).json({
                message: 'Para crear una tercera cuota masiva tenés que seleccionar una escuela.',
            });
        }

        const studentQuery = { status: "Activo" };
        if (isThirdShare) {
            studentQuery.school = school.trim();
        }

        // Obtener estudiantes activos. Para tercera cuota, solo de la escuela seleccionada.
        const students = await Student.find(studentQuery, '_id dni school');
        if (students.length === 0) {
            logger.info('No hay estudiantes activos', { year: parsedYear, school });
            return res.status(404).json({
                message: isThirdShare
                    ? `No hay estudiantes activos registrados para la escuela "${school}".`
                    : 'No hay estudiantes activos registrados en el sistema.',
            });
        }

        const sharesToCreate = [];
        const skippedStudents = [];
        const errors = [];

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
                if (!isSecondShare && !isThirdShare) {
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

                // Para terceras cuotas, verificar la segunda cuota del mismo semestre.
                if (isThirdShare) {
                    const secondShare = await Share.findOne({
                        student: student._id,
                        paymentName: secondShareName,
                        year: parsedYear,
                    });

                    if (!secondShare) {
                        logger.info('Segunda cuota no encontrada para estudiante', { student: student._id, secondShareName });
                        skippedStudents.push(student._id);
                        continue;
                    }

                    if (
                        secondShare.status === 'Pendiente' &&
                        !secondShare.amount &&
                        !secondShare.paymentMethod &&
                        !secondShare.paymentDate &&
                        !secondShare.paymentType
                    ) {
                        logger.info('Segunda cuota pendiente sin datos de pago, omitiendo', { student: student._id, secondShareName });
                        skippedStudents.push(student._id);
                        continue;
                    }

                    if (secondShare.paymentType === 'Pago Total') {
                        logger.info('Segunda cuota con Pago Total, omitiendo', { student: student._id, secondShareName });
                        skippedStudents.push(student._id);
                        continue;
                    }

                    if (secondShare.paymentType === 'Pago Parcial' && secondShare.status === 'Pagado') {
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
                        logger.info('Creando tercera cuota para estudiante con segunda cuota parcial', {
                            student: student._id,
                            paymentName,
                            school: student.school,
                        });
                    } else {
                        logger.info('Segunda cuota no cumple criterios (no Pagada o sin Pago Parcial), omitiendo', {
                            student: student._id,
                            secondShareName,
                        });
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
                message: isThirdShare
                    ? 'No se crearon cuotas porque los estudiantes de esa escuela ya tienen esta cuota o no cumplen el criterio de segunda cuota parcial pagada.'
                    : 'No se crearon cuotas porque todos los estudiantes activos ya tienen esta cuota o no cumplen los criterios.',
                skipped: skippedStudents.length,
            });
        }

        const newShares = await Share.insertMany(sharesToCreate);
        logger.info('Cuotas masivas creadas exitosamente', {
            created: newShares.length,
            skipped: skippedStudents.length,
            school: isThirdShare ? school : undefined,
        });

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
  const { paymentName, year, amount, paymentDate, paymentMethod, paymentType } = req.body;

  try {
    const share = await Share.findById(req.params.id);

    if (!share) {
      return res.status(404).json({ message: 'Cuota no encontrada' });
    }

    const normalizedPaymentName = paymentName ? paymentName.trim() : share.paymentName;
    const normalizedYear = year ? normalizeShareYear(year) : share.year;

    if (!normalizedPaymentName || !normalizedYear) {
      return res.status(400).json({ message: 'paymentName y year son obligatorios.' });
    }

    const duplicateShare = await Share.findOne({
      _id: { $ne: share._id },
      student: share.student,
      paymentName: normalizedPaymentName,
      year: normalizedYear,
    });

    if (duplicateShare) {
      return res.status(400).json({
        message: 'Ese alumno ya tiene otra cuota con ese nombre y año.',
      });
    }

    const normalizedPaymentMethod = normalizeOptionalString(paymentMethod);
    const normalizedPaymentType = normalizeOptionalString(paymentType);
    const normalizedPaymentDate = paymentDate ? new Date(paymentDate) : null;
    const normalizedAmount = amount !== '' && amount != null ? Number(amount) : null;

    const paymentValidation = isValidPaymentPayload({
      amount: normalizedAmount,
      paymentDate: normalizedPaymentDate,
      paymentMethod: normalizedPaymentMethod,
      paymentType: normalizedPaymentType,
    });

    if (paymentValidation.error) {
      return res.status(400).json({ message: paymentValidation.error });
    }

    const userName = req.user?.name || 'UsuarioDesconocido';

    share.paymentName = normalizedPaymentName;
    share.year = normalizedYear;

    if (paymentValidation.isPayment) {
      share.amount = normalizedAmount;
      share.paymentDate = normalizedPaymentDate;
      share.paymentMethod = normalizedPaymentMethod;
      share.paymentType = normalizedPaymentType;
      share.status = 'Pagado';
      share.registeredBy = userName;
    } else {
      share.amount = null;
      share.paymentDate = null;
      share.paymentMethod = null;
      share.paymentType = null;
      share.status = 'Pendiente';
      share.registeredBy = userName;
    }

    await share.save();
    await updateStudentEnabledStatus(share.student);

    return res.status(200).json({
      message: paymentValidation.isPayment
        ? 'Cuota actualizada correctamente'
        : 'Cuota marcada como pendiente correctamente',
      share,
    });
  } catch (error) {
    logger.error('Error al actualizar la cuota', { error: error.message, stack: error.stack });

    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Ese alumno ya tiene otra cuota con ese nombre y año.',
      });
    }

    return res.status(500).json({
      message: 'Error al actualizar la cuota',
      error: error.message,
    });
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
    const { year } = req.query;
    const query = { student: req.params.id };

    if (year) {
      query.year = parseInt(year);
    }

    const shares = await Share.find(query).populate({
      path: 'student',
      select: 'name lastName dni mail isEnabled',
    });

    return res.status(200).json(shares);
  } catch (error) {
    return res.status(500).json({
      message: 'Error al obtener cuotas',
      error: error.message,
    });
  }
};

// Obtener nombres de cuotas disponibles para un año
export const getAvailableShareNames = async (req, res) => {
    try {
        const { year, studentId, school } = req.query;
        if (!year) {
            logger.warn('Falta el campo year', { year });
            return res.status(400).json({ message: 'El campo year es obligatorio.' });
        }

        const parsedYear = parseInt(year);
        const possibleNames = [
            `Primera cuota - Semestre 1 - ${parsedYear}`,
            `Segunda cuota - Semestre 1 - ${parsedYear}`,
            `Tercera cuota - Semestre 1 - ${parsedYear}`,
            `Primera cuota - Semestre 2 - ${parsedYear}`,
            `Segunda cuota - Semestre 2 - ${parsedYear}`,
            `Tercera cuota - Semestre 2 - ${parsedYear}`,
        ];

        if (studentId) {
            const student = await Student.findById(studentId).select('_id status');

            if (!student) {
                return res.status(404).json({ message: 'Estudiante no encontrado.' });
            }

            const studentShares = await Share.find({
                student: studentId,
                year: parsedYear,
            }).select('paymentName paymentType status amount paymentMethod paymentDate');

            const availableNames = possibleNames.map((name) => {
                const existingShare = studentShares.find((share) => share.paymentName === name);

                if (existingShare) {
                    return { name, isBlocked: true };
                }

                if (name.includes('Segunda cuota') || name.includes('Tercera cuota')) {
                    const previousShareName = name.includes('Tercera cuota')
                        ? name.includes('Semestre 1')
                            ? `Segunda cuota - Semestre 1 - ${parsedYear}`
                            : `Segunda cuota - Semestre 2 - ${parsedYear}`
                        : name.includes('Semestre 1')
                        ? `Primera cuota - Semestre 1 - ${parsedYear}`
                        : `Primera cuota - Semestre 2 - ${parsedYear}`;

                    const previousShare = studentShares.find((share) => share.paymentName === previousShareName);

                    const canCreateNextShare = Boolean(
                        previousShare &&
                        previousShare.paymentType === 'Pago Parcial' &&
                        previousShare.status === 'Pagado' &&
                        previousShare.amount &&
                        previousShare.paymentMethod &&
                        previousShare.paymentDate
                    );

                    return { name, isBlocked: !canCreateNextShare };
                }

                return { name, isBlocked: false };
            });

            return res.status(200).json(availableNames);
        }

        // Obtener estudiantes activos. El filtro por escuela solo aplica a terceras cuotas.
        const activeStudents = await Student.find({ status: "Activo" }, '_id');
        const schoolActiveStudents = school?.trim()
            ? await Student.find({ status: "Activo", school: school.trim() }, '_id')
            : [];
        const activeStudentIds = activeStudents.map(student => student._id);
        const totalActiveStudents = activeStudents.length;

        const availableNames = await Promise.all(possibleNames.map(async (name) => {
            const isThirdShare = name.includes('Tercera cuota');
            const scopedActiveStudentIds = isThirdShare && school?.trim()
                ? schoolActiveStudents.map(student => student._id)
                : activeStudentIds;

            let studentsNeedingShare = [...scopedActiveStudentIds];

            // Para segundas/terceras cuotas, filtrar estudiantes con Pago Parcial en la cuota previa del mismo semestre
            if (name.includes('Segunda cuota') || name.includes('Tercera cuota')) {
                const previousShareName = name.includes('Tercera cuota')
                    ? name.includes('Semestre 1')
                        ? `Segunda cuota - Semestre 1 - ${parsedYear}`
                        : `Segunda cuota - Semestre 2 - ${parsedYear}`
                    : name.includes('Semestre 1')
                        ? `Primera cuota - Semestre 1 - ${parsedYear}`
                        : `Primera cuota - Semestre 2 - ${parsedYear}`;

                const previousShares = await Share.find({
                    paymentName: previousShareName,
                    year: parsedYear,
                    student: { $in: scopedActiveStudentIds },
                });

                studentsNeedingShare = previousShares
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
