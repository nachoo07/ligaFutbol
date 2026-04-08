import nodemailer from 'nodemailer';
import 'dotenv/config';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const buildPlainText = (htmlMessage = '') => String(htmlMessage).replace(/<[^>]+>/g, '');

export const sendEmail = async (req, res) => {
  const { recipients, subject, messages, studentsData = [], attachment } = req.body;

  if (
    !recipients ||
    !Array.isArray(recipients) ||
    recipients.length === 0 ||
    !subject ||
    !messages ||
    !Array.isArray(messages)
  ) {
    return res.status(400).json({
      message: 'Faltan campos requeridos o recipients/messages no es un arreglo válido'
    });
  }

  if (recipients.length > 100) {
    return res.status(400).json({ message: 'Demasiados destinatarios. El límite es 100 por correo.' });
  }

  const allStudents = studentsData.map((s) => s.student || s);
  const validRecipients = [...new Set(recipients)].filter((recipient) =>
    allStudents.some((student) => student.mail === recipient)
  );

  if (validRecipients.length === 0) {
    return res.status(400).json({ message: 'No hay destinatarios válidos' });
  }

  const successEmails = [];
  const failedEmails = [];

  try {
    for (const recipient of validRecipients) {
      const messageEntry = messages.find((item) => item.recipient === recipient) || messages[0];

      if (!messageEntry?.message) {
        failedEmails.push({
          recipient,
          error: 'No se encontró un mensaje válido para este destinatario.',
        });
        continue;
      }

      const mailOptions = {
        from: `"Liga de Futbol Infantil" <${process.env.EMAIL_USER}>`,
        to: recipient,
        subject,
        text: buildPlainText(messageEntry.message),
        html: messageEntry.message,
      };

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
        failedEmails.push({
          recipient,
          error: sendError.message || 'Error desconocido al enviar el correo.',
        });
      }
    }

    const totalAttempted = validRecipients.length;
    const hasFailures = failedEmails.length > 0;
    const statusCode = successEmails.length > 0 ? 200 : 500;

    return res.status(statusCode).json({
      message: hasFailures
        ? 'El envío finalizó con errores parciales.'
        : 'Correos enviados exitosamente',
      totalAttempted,
      totalSucceeded: successEmails.length,
      totalFailed: failedEmails.length,
      successEmails,
      failedEmails,
    });
  } catch (error) {
    console.error('Error general enviando correos:', error);
    return res.status(500).json({ message: 'Error al enviar correos', error: error.message });
  }
};
