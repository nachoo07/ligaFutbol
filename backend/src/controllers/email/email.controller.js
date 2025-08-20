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
  const { recipients, subject, messages, studentsData, attachment } = req.body;

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0 || !subject || !messages || !Array.isArray(messages)) {
    return res.status(400).json({ message: 'Faltan campos requeridos o recipients/messages no es un arreglo válido' });
  }

  if (recipients.length > 100) {
    return res.status(400).json({ message: 'Demasiados destinatarios. El límite es 100 por correo.' });
  }

  const allStudents = studentsData.map(s => s.student || s);
  const validRecipients = [...new Set(recipients)].filter(r => allStudents.some(s => s.mail === r));

  if (validRecipients.length === 0) {
    return res.status(400).json({ message: 'No hay destinatarios válidos' });
  }

  const successEmails = [];

  try {
    for (let i = 0; i < validRecipients.length; i++) {
      const recipient = validRecipients[i];
      let mailOptions = {
        from: `"Liga de Futbol Infantil" <${process.env.EMAIL_USER}>`,
        to: recipient,
        subject,
        text: messages[i].message.replace(/<[^>]+>/g, ''),
        html: messages[i].message,
      };

      // Agregar adjunto si existe
      if (attachment) {
        mailOptions.attachments = [{
          filename: attachment.filename,
          content: Buffer.from(attachment.content, 'base64'),
          encoding: 'base64',
        }];
      }

      try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Correo enviado a ${recipient}:`, info.response);
        successEmails.push(recipient);
      } catch (sendError) {
        console.error(`Error enviando a ${recipient}:`, sendError);
      }
    }

    res.status(200).json({ message: 'Correos enviados exitosamente', successEmails });
  } catch (error) {
    console.error('Error general enviando correos:', error);
    res.status(500).json({ message: 'Error al enviar correos', error: error.message });
  }
};