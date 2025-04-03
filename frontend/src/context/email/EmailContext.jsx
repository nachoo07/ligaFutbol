import React, { createContext, useContext } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import html2canvas from 'html2canvas';

export const EmailContext = createContext();

export const EmailProvider = ({ children }) => {
    // Función para formatear la fecha sin problemas de zona horaria
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        // Extraer año, mes y día directamente en UTC para evitar problemas de zona horaria
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // +1 porque los meses son 0-based
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${day}/${month}/${year}`; // Formato DD/MM/YYYY
    };

    const sendEmail = async (recipients, subject, message, onSuccess) => {
        if (!recipients.length || !subject || !message) {
            Swal.fire('Error', 'Selecciona al menos un estudiante, un asunto y un mensaje.', 'error');
            return false;
        }

        try {
            const response = await axios.post(
                'http://localhost:4001/api/email/send',
                { recipients, subject, message },
                { withCredentials: true }
            );
            Swal.fire('¡Éxito!', `Correo(s) enviado(s) a ${recipients.length} destinatario(s)`, 'success');
            if (onSuccess) onSuccess();
            return true;
        } catch (error) {
            Swal.fire('Error', error.response?.data?.message || 'No se pudo enviar el correo', 'error');
            return false;
        }
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

            // Pre-cargar la imagen del logo
            const logoUrl = 'https://res.cloudinary.com/dmjjwnvq8/image/upload/v1742739966/logo_nuc99w.png';
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

            // Aumentar la resolución y calidad de la imagen
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
                'http://localhost:4001/api/email/send',
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
        <EmailContext.Provider value={{ sendEmail, sendReceiptEmail }}>
            {children}
        </EmailContext.Provider>
    );
};

export const useEmail = () => useContext(EmailContext);