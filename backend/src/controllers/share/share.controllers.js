import Share from '../../models/share/share.model.js';
import Student from '../../models/student/student.model.js';
import { calculateStudentEnabledStatus, updateStudentEnabledStatus } from '../../utils/student.utils.js';

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
    const { student, paymentName, year, amount, paymentDate, paymentMethod, paymentType } = req.body;

    if (!student || !paymentName || !year) {
        return res.status(400).json({ message: 'Faltan campos obligatorios: student, paymentName, year' });
    }

    try {
        const studentExists = await Student.findById(student);
        if (!studentExists) {
            return res.status(404).json({ message: 'Estudiante no encontrado' });
        }

         const userName = req.user?.name;

        const newShare = await Share.create({
            student,
            paymentName,
            year,
            amount: amount || null, // Opcional
            paymentDate: paymentDate || null,
            paymentMethod: paymentDate ? paymentMethod : null,
            paymentType: paymentDate ? paymentType : null,
            status: paymentDate ? 'Pagado' : 'Pendiente',
            registeredBy: userName || null,
        });

        await updateStudentEnabledStatus(student);

        res.status(201).json({
            message: 'La cuota se agregó exitosamente',
            share: newShare,
        });
    } catch (error) {
        return res.status(500).json({ message: 'Error al crear la cuota', error: error.message });
    }
};

// Crear cuotas masivas
export const createMassiveShares = async (req, res) => {
    const { paymentName, year } = req.body;

    if (!paymentName || !year) {
        return res.status(400).json({ message: 'Faltan campos obligatorios: paymentName y year son requeridos.' });
    }

    try {
        // Validar el formato del año
        const parsedYear = parseInt(year);
        if (isNaN(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
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
            return res.status(400).json({ message: `El nombre de la cuota "${paymentName}" no es válido para el año ${parsedYear}.` });
        }

        // Solo obtener estudiantes con status "Activo"
        const students = await Student.find({ status: "Activo" }, '_id dni');
        if (students.length === 0) {
            return res.status(404).json({ message: 'No hay estudiantes activos registrados en el sistema.' });
        }

        const sharesToCreate = [];
        const skippedStudents = [];
        const errors = [];

        for (const student of students) {
            try {
                // Verificar si el estudiante ya tiene una cuota con el mismo paymentName y year
                const existingShare = await Share.findOne({
                    student: student._id,
                    paymentName,
                    year,
                });

                if (existingShare) {
                    skippedStudents.push(student._id);
                    continue;
                }

                // Determinar el semestre y el año a partir del nombre de la cuota
                const isSecondShareSemestre1 = paymentName.includes('Segunda cuota - Semestre 1');
                const isSecondShareSemestre2 = paymentName.includes('Segunda cuota - Semestre 2');
                const isSemestre1 = paymentName.includes('Semestre 1');
                const isSemestre2 = paymentName.includes('Semestre 2');

                // Si es una "Segunda cuota", verificamos si la primera cuota del mismo semestre tiene "Pago Total"
                if (isSecondShareSemestre1 || isSecondShareSemestre2) {
                    const firstShareName = isSecondShareSemestre1
                        ? `Primera cuota - Semestre 1 - ${year}`
                        : `Primera cuota - Semestre 2 - ${year}`;

                    const firstShare = await Share.findOne({
                        student: student._id,
                        paymentName: firstShareName,
                        year,
                    });

                    // Si la primera cuota existe y tiene "Pago Total", no creamos la segunda cuota
                    if (firstShare && firstShare.paymentType === 'Pago Total') {
                        skippedStudents.push(student._id);
                        continue;
                    }
                }

                // Si el estudiante no tiene la cuota y pasa las validaciones, creamos la cuota
                sharesToCreate.push({
                    student: student._id,
                    paymentName,
                    year,
                    amount: null,
                    paymentDate: null,
                    paymentMethod: null,
                    paymentType: null,
                    status: 'Pendiente',
                });
            } catch (error) {
                errors.push(`Error al procesar el estudiante con DNI ${student.dni || 'desconocido'}: ${error.message}`);
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({
                message: `Se encontraron errores al procesar algunos estudiantes.`,
                errors: errors,
                created: sharesToCreate.length,
                skipped: skippedStudents.length,
            });
        }

        if (sharesToCreate.length === 0) {
            return res.status(200).json({
                message: 'No se crearon cuotas porque todos los estudiantes activos ya tienen esta cuota o el semestre está pagado.',
                skipped: skippedStudents.length,
            });
        }

        const newShares = await Share.insertMany(sharesToCreate);

        for (const student of students) {
            await updateStudentEnabledStatus(student._id);
        }

        res.status(201).json({
            message: `Se crearon ${newShares.length} cuotas exitosamente. Se omitieron ${skippedStudents.length} estudiantes que ya tenían la cuota.`,
            shares: newShares,
            skipped: skippedStudents.length,
        });
    } catch (error) {
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
        const share = await Share.findById(req.params.id);
        if (!share) {
            return res.status(404).json({ message: 'Cuota no encontrada' });
        }

        if (paymentDate && (!amount || !paymentMethod || !paymentType)) {
            return res.status(400).json({ message: 'Faltan campos obligatorios para registrar el pago: amount, paymentMethod, paymentType' });
        }

        const userName = req.user?.name;

        share.paymentName = paymentName !== undefined ? paymentName : share.paymentName;
        share.year = share.year;
        share.amount = amount !== undefined ? amount : share.amount;
        share.paymentDate = paymentDate !== undefined ? paymentDate : share.paymentDate;
        share.paymentMethod = paymentMethod !== undefined ? paymentMethod : share.paymentMethod;
        share.paymentType = paymentType !== undefined ? paymentType : share.paymentType;
        share.status = paymentDate ? 'Pagado' : 'Pendiente';
        share.registeredBy = userName || share.registeredBy || null;

        await share.save();

        await updateStudentEnabledStatus(share.student);

        res.status(200).json({
            message: 'Cuota actualizada correctamente',
            share,
        });
    } catch (error) {
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

            // Si es una "Segunda cuota", excluir a los que tienen "Pago Total" en la primera del mismo semestre
            if (name === `Segunda cuota - Semestre 1 - ${parsedYear}` || name === `Segunda cuota - Semestre 2 - ${parsedYear}`) {
                const firstShareName = name.includes("Semestre 1")
                    ? `Primera cuota - Semestre 1 - ${parsedYear}`
                    : `Primera cuota - Semestre 2 - ${parsedYear}`;

                const studentsWithFullPayment = await Share.find({
                    paymentName: firstShareName,
                    year: parsedYear,
                    paymentType: 'Pago Total',
                    student: { $in: activeStudentIds },
                }).distinct('student');

                // Excluir estudiantes con "Pago Total"
                studentsNeedingShare = activeStudentIds.filter(
                    id => !studentsWithFullPayment.some(fullId => fullId.toString() === id.toString())
                );
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
        console.error('Error en getAvailableShareNames:', error);
        return res.status(500).json({ message: 'Error al obtener nombres disponibles.', error: error.message });
    }
};