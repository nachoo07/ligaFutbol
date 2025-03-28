import Student from '../models/student/student.model.js';
import Share from '../models/share/share.model.js';

// Función para calcular si un estudiante está habilitado
export const calculateStudentEnabledStatus = async (studentId) => {
  try {
    // Buscar todas las cuotas del estudiante
    const shares = await Share.find({ student: studentId });

    // Si no hay cuotas, el estudiante NO está habilitado
    if (!shares || shares.length === 0) {
      return false;
    }

    // Si hay al menos una cuota en estado "Pendiente", el estudiante no está habilitado
    const hasPendingShare = shares.some((share) => share.status === 'Pendiente');
    return !hasPendingShare; // true si no hay cuotas pendientes, false si hay al menos una
  } catch (error) {
    console.error('Error al calcular el estado de habilitación:', error);
    return false; // En caso de error, asumimos que no está habilitado
  }
};

// Función para actualizar el estado de habilitación de un estudiante
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