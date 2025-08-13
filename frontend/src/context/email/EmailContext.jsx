import { createContext, useContext, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import html2canvas from 'html2canvas';
import validator from 'validator';

export const EmailContext = createContext();

export const EmailProvider = ({ children }) => {
  const [progress, setProgress] = useState({ sent: 0, success: 0, failed: 0 });

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${day}/${month}/${year}`;
  };

  const fetchActiveStudents = async () => {
    try {
      const response = await axios.get('/api/students', { withCredentials: true });
      return response.data.filter(student => student.status === 'Activo');
    } catch (error) {
      console.error('Error fetching students:', error);
      Swal.fire('Error', 'No se pudieron obtener los estudiantes', 'error');
      return [];
    }
  };

  const fetchDebtors = async () => {
    try {
      const activeStudents = await fetchActiveStudents();
      const sharesResponse = await axios.get('/api/shares', { withCredentials: true });
      const debtors = activeStudents.filter(student => {
        const studentShares = sharesResponse.data.filter(share => share.student._id.toString() === student._id.toString());
        return studentShares.some(share => share.status === 'Pendiente' || (share.status === 'Pagado' && share.paymentType === 'Pago Parcial'));
      });
      return debtors;
    } catch (error) {
      console.error('Error fetching debtors:', error);
      Swal.fire('Error', 'No se pudieron obtener los deudores', 'error');
      return [];
    }
  };

  const fetchSchools = async () => {
    try {
      const response = await axios.get('/api/students', { withCredentials: true });
      const schools = [...new Set(response.data.map(student => student.school))].filter(Boolean);
      return schools;
    } catch (error) {
      console.error('Error fetching schools:', error);
      Swal.fire('Error', 'No se pudieron obtener las escuelas', 'error');
      return [];
    }
  };

  const classifyErrorReason = (errorMessage, email, missing) => {
    if (missing) return 'Sin correo registrado';
    if (!email) return 'Correo no proporcionado';
    if (errorMessage?.includes('550') || errorMessage?.includes('recipient address rejected') || errorMessage?.includes('address not found')) {
      return 'Correo rebotado - Dirección no encontrada';
    }
    if (errorMessage?.includes('554') || errorMessage?.includes('delivery not allowed')) {
      return 'Correo rebotado - No puede recibir correos';
    }
    return 'Correo rebotado - Error desconocido';
  };

  const sendEmail = async (recipients, subject, message, emailType, studentsData, onSuccess) => {
    if (!recipients.length || !subject) {
      Swal.fire('Error', 'Selecciona al menos un destinatario y un asunto.', 'error');
      return false;
    }

    const allStudents = studentsData.map(s => s.student || s);
    const studentsWithEmail = allStudents.filter(s => s.mail && validator.isEmail(s.mail));
    const validRecipients = [...new Set(recipients)].filter(r => studentsWithEmail.some(s => s.mail === r));

    if (validRecipients.length === 0) {
      Swal.fire('Error', 'No hay destinatarios válidos.', 'error');
      if (onSuccess) onSuccess();
      return false;
    }

    setProgress({ sent: 0, success: 0, failed: 0 });

    const batchSize = 50;
    const batches = [];
    for (let i = 0; i < validRecipients.length; i += batchSize) {
      batches.push(validRecipients.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const batchMessages = emailType === 'debtors'
        ? batch.map(recipient => {
            const student = studentsData.find(s => (s.student ? s.student.mail : s.mail) === recipient);
            const studentShares = studentsData.find(s => s._id === student._id)?.shares || [];
            const pendingShare = studentShares.find(share => share.status === 'Pendiente');
            const partialShare = studentShares.find(share => share.status === 'Pagado' && share.paymentType === 'Pago Parcial');
            let owed = parseFloat(message.match(/\$\d+(?:\.\d{2})?/)?.[0].replace('$', '')) || 0; // Extraer monto base del mensaje

            if (partialShare && partialShare.amount) {
              owed = owed - partialShare.amount;
            } else if (pendingShare && !pendingShare.amount) {
              owed = owed;
            }

            return {
              recipient,
              message: `
                <div style="font-family: Arial, sans-serif; color: #333;">
                  <img src="https://res.cloudinary.com/dmjjwnvq8/image/upload/v1753137918/vo3rj04kyhxnustqzowe.png" alt="Liga de Fútbol Infantil" style="width: 150px;" />
                  <h2>Estimado/a ${student.name},</h2>
                  <p>Le recordamos que tiene una deuda pendiente de $${owed.toLocaleString('es-AR')}.</p>
                  <p>Por favor, regularice su situación antes del ${formatDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000))}.</p>
                  <p>Datos bancarios: Cuenta: 123456, CBU: 789012, Banco: Banco Ejemplo.</p>
                  <p>Saludos cordiales,<br>Liga de Fútbol Infantil</p>
                </div>
              `,
            };
          })
        : batch.map(recipient => {
            const student = studentsData.find(s => (s.student ? s.student.mail : s.mail) === recipient);
            let personalizedMessage = message;
            if (emailType === 'general' && personalizedMessage.includes('[Nombre del niño o niña]')) {
              personalizedMessage = personalizedMessage.replace('[Nombre del niño o niña]', `${student.name} ${student.lastName}`);
            }
            return { recipient, message: personalizedMessage };
          });

      try {
        const response = await axios.post(
          '/api/email/send',
          {
            recipients: batch,
            subject,
            messages: batchMessages,
            studentsData: allStudents,
          },
          { withCredentials: true }
        );
        setProgress(prev => ({
          sent: prev.sent + batch.length,
          success: prev.success + (response.data.successEmails?.length || 0),
          failed: prev.failed,
        }));
      } catch (error) {
        console.error('Error response from server:', error.response?.data || error.message);
        setProgress(prev => ({
          sent: prev.sent + batch.length,
          success: prev.success,
          failed: prev.failed + batch.length,
        }));
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    Swal.fire('Éxito', 'Todos los correos se enviaron correctamente', 'success');
    if (onSuccess) onSuccess();
    return true;
  };

  const sendReceiptEmail = async (student, share, onSuccess) => {
    if (!student || !student.mail) {
      Swal.fire('Error', 'El estudiante no tiene un correo registrado. Por favor, actualiza los datos del estudiante.', 'error');
      return false;
    }

    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(student.mail)) {
      Swal.fire('Error', 'El correo registrado no tiene un formato válido.', 'error');
      return false;
    }

    try {
      const div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.left = '-9999px';
      document.body.appendChild(div);

      const logoUrl = 'https://res.cloudinary.com/dmjjwnvq8/image/upload/v1753137918/vo3rj04kyhxnustqzowe.png';
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = logoUrl;
        img.onload = resolve;
        img.onerror = () => {
          console.error('Error al cargar el logo:', logoUrl);
          reject(new Error('No se pudo cargar el logo'));
        };
      });

      const { default: Receipt } = await import('../../components/voucher/Receipt');
      const { renderToString } = await import('react-dom/server');
      div.innerHTML = renderToString(<Receipt student={student} share={share} contactEmail="ligafutbolinfantil01@gmail.com" />);

      const canvas = await html2canvas(div, {
        scale: 3,
        useCORS: true,
      });
      const imageData = canvas.toDataURL('image/png', 1.0);
      const base64Data = imageData.split(',')[1];

      document.body.removeChild(div);

      const subject = `Comprobante de Pago - ${student.name} ${student.lastName}`;
      const message = `
        <p>Hola ${student.name},</p>
        <p>Adjuntamos el comprobante de tu pago por la cuota de ${formatDate(share.paymentDate)}.</p>
        <p>Monto pagado: $${share.amount.toLocaleString('es-ES')}</p>
        <p>Gracias por tu pago.</p>
        <p>Saludos cordiales,<br>Liga de Fútbol Infantil</p>
      `;

      const response = await axios.post(
        '/api/email/send',
        {
          recipients: [student.mail],
          subject,
          message,
          attachment: base64Data,
        },
        { withCredentials: true }
      );
      Swal.fire('¡Éxito!', 'Comprobante enviado exitosamente', 'success');
      if (onSuccess) onSuccess();
      return true;
    } catch (error) {
      console.error('Error al enviar el comprobante:', error);
      console.error('Detalles del error:', error.response?.data);
      Swal.fire('Error', error.response?.data?.message || 'No se pudo enviar el comprobante', 'error');
      return false;
    }
  };

  return (
    <EmailContext.Provider value={{ sendEmail, sendReceiptEmail, fetchActiveStudents, fetchDebtors, fetchSchools, progress }}>
      {children}
    </EmailContext.Provider>
  );
};

export const useEmail = () => useContext(EmailContext);