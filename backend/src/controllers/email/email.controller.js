import nodemailer from 'nodemailer';
import 'dotenv/config';
import validator from 'validator';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

transporter.verify((error, success) => {
    if (error) {
        console.error('Error en la configuración del transporter:', error);
    } else {
        console.log('Transporter configurado correctamente, listo para enviar correos');
    }
});

export const sendEmail = async (req, res) => {
    const { recipients, subject, message, attachment } = req.body;

    // Validar campos requeridos
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0 || !subject || !message) {
        return res.status(400).json({ message: 'Faltan campos requeridos o recipients no es un arreglo válido' });
    }

    // Validar direcciones de correo
    const invalidEmails = recipients.filter(email => !validator.isEmail(email));
    if (invalidEmails.length > 0) {
        return res.status(400).json({ message: 'Correos inválidos', invalidEmails });
    }

    // Validar límite de destinatarios
    if (recipients.length > 100) {
        return res.status(400).json({ message: 'Demasiados destinatarios. El límite es 100 por correo.' });
    }

    try {
        const mailOptions = {
            from: `"Liga de Futbol Infantil" <${process.env.EMAIL_USER}>`,
            to: recipients.join(', '),
            subject,
            text: message.replace(/<[^>]+>/g, ''),
            html: message,
        };

        // Si hay un adjunto, agregarlo al correo
        if (attachment) {
            mailOptions.attachments = [
                {
                    filename: 'comprobante-pago.png',
                    content: Buffer.from(attachment, 'base64'),
                    contentType: 'image/png',
                },
            ];
        }

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Correos enviados exitosamente' });
    } catch (error) {
        console.error('Error enviando correos:', error);
        res.status(500).json({ message: 'Error al enviar correos', error: error.message, code: error.code });
    }
};