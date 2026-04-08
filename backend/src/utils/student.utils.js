import Student from '../models/student/student.model.js';
import Share from '../models/share/share.model.js';

export const calculateStudentEnabledStatus = async (studentId) => {
  try {
    const student = await Student.findById(studentId).select('status');
    if (!student || student.status !== 'Activo') {
      return false;
    }

    const shares = await Share.find({ student: studentId }).select('status');

    if (!shares || shares.length === 0) {
      return false;
    }

    const hasPendingShare = shares.some((share) => share.status === 'Pendiente');
    return !hasPendingShare;
  } catch (error) {
    console.error('Error al calcular el estado de habilitación:', error);
    return false;
  }
};

export const updateStudentEnabledStatus = async (studentId) => {
  try {
    const isEnabled = await calculateStudentEnabledStatus(studentId);
    await Student.findByIdAndUpdate(studentId, { isEnabled }, { new: true });
    return isEnabled;
  } catch (error) {
    console.error('Error al actualizar el estado de habilitación:', error);
    return false;
  }
};
