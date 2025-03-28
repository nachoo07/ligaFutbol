import Share from '../../models/share/share.model.js';
import Student from '../../models/student/student.model.js';
import { calculateStudentEnabledStatus, updateStudentEnabledStatus } from '../../utils/student.utils.js'; // Ajusta la ruta según tu estructura

// Obtener todas las cuotas
export const getAllShares = async (req, res) => {
    try {
      const shares = await Share.find({ student: { $ne: null } }) // Excluir cuotas con student null
        .populate({
          path: 'student',
          select: 'name lastName mail dni school category color isEnabled',
        });
      console.log('Cuotas válidas enviadas al frontend:', shares);
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
  const { student, paymentName, amount, paymentDate, paymentMethod } = req.body;

  if (!student || !paymentName || !amount) {
    return res.status(400).json({ message: 'Faltan campos obligatorios: student, paymentName, amount' });
  }

  try {
    const studentExists = await Student.findById(student);
    if (!studentExists) {
      return res.status(404).json({ message: 'Estudiante no encontrado' });
    }

    const newShare = await Share.create({
      student,
      paymentName,
      amount,
      paymentDate: paymentDate || null,
      paymentMethod: paymentDate ? paymentMethod : null,
      status: paymentDate ? 'Pagado' : 'Pendiente',
    });

    // Actualizar el estado de habilitación del estudiante
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
  const { paymentName, amount } = req.body;

  if (!paymentName || !amount) {
    return res.status(400).json({ message: 'Faltan campos obligatorios: paymentName, amount' });
  }

  try {
    const students = await Student.find({}, '_id');
    if (students.length === 0) {
      return res.status(404).json({ message: 'No hay estudiantes registrados' });
    }

    const sharesToCreate = students.map(student => ({
      student: student._id,
      paymentName,
      amount,
      paymentDate: null,
      paymentMethod: null,
      status: 'Pendiente',
    }));

    const newShares = await Share.insertMany(sharesToCreate);

    // Actualizar el estado de habilitación de todos los estudiantes afectados
    for (const student of students) {
      await updateStudentEnabledStatus(student._id);
    }

    res.status(201).json({
      message: `Se crearon ${newShares.length} cuotas exitosamente`,
      shares: newShares,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error al crear cuotas masivas', error: error.message });
  }
};

// Actualizar una cuota (registrar pago)
export const updateShare = async (req, res) => {
  const { paymentName, amount, paymentDate, paymentMethod } = req.body;

  try {
    const share = await Share.findById(req.params.id);
    if (!share) {
      return res.status(404).json({ message: 'Cuota no encontrada' });
    }

    share.paymentName = paymentName !== undefined ? paymentName : share.paymentName;
    share.amount = amount !== undefined ? amount : share.amount;
    share.paymentDate = paymentDate !== undefined ? paymentDate : share.paymentDate;
    share.paymentMethod = paymentMethod !== undefined ? paymentMethod : share.paymentMethod;
    share.status = share.paymentDate ? 'Pagado' : 'Pendiente';

    await share.save();

    // Actualizar el estado de habilitación del estudiante
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

    // Actualizar el estado de habilitación del estudiante
    await updateStudentEnabledStatus(studentId);

    res.json({ message: 'Cuota eliminada correctamente' });
  } catch (error) {
    return res.status(500).json({ message: 'Error al eliminar la cuota', error: error.message });
  }
};

// Obtener cuotas por estudiante
export const getSharesByStudent = async (req, res) => {
  try {
    const shares = await Share.find({ student: req.params.id })
      .populate({
        path: 'student',
        select: 'name lastName isEnabled',
      });
    if (shares.length === 0) {
      return res.status(200).json({ message: 'No hay cuotas para este estudiante' });
    }
    res.status(200).json(shares || []);
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener cuotas', error: error.message });
  }
};