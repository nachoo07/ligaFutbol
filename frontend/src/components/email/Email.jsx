import React, { useState, useEffect, useContext, useRef } from 'react';
import { StudentsContext } from '../../context/student/StudentContext';
import { emailSignatureHtml, useEmail } from '../../context/email/EmailContext';
import { FaSearch, FaCheck, FaTimes, FaTrash, FaBold, FaItalic, FaUnderline, FaPaperclip, FaEye } from 'react-icons/fa';
import './email.css';
import Swal from 'sweetalert2';

const Email = () => {
  const { estudiantes, obtenerEstudiantes } = useContext(StudentsContext);
  const { sendEmail, fetchActiveStudents, fetchSchools, progress } = useEmail();
  const [emailType, setEmailType] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [manualSelection, setManualSelection] = useState(false);
  const [recipientCount, setRecipientCount] = useState(0);
  const [attachments, setAttachments] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const isMounted = useRef(false);

  const maxAttachmentTotalBytes = 18 * 1024 * 1024;
  const buildMessageWithSignature = () => `${message || ''}${emailSignatureHtml}`;

  const getStudentRecipients = (students) => {
    const emails = students.flatMap((student) => {
      // Preparado para sumar un segundo mail del alumno más adelante.
      return [student.mail].filter(Boolean);
    });

    return [...new Set(emails)];
  };

  const formatFileSize = (bytes) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  const fileToAttachment = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result).split(',')[1];
      resolve({
        filename: file.name,
        content,
        encoding: 'base64',
        contentType: file.type || 'application/octet-stream',
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const applyFormat = (command, value = null) => {
    document.execCommand(command, false, value);
  };

  const handleEditorChange = (e) => {
    setMessage(e.target.innerHTML);
  };

  useEffect(() => {
    if (!isMounted.current) {
      const loadInitialData = async () => {
        try {
          await obtenerEstudiantes();
          isMounted.current = true;
        } catch {
          Swal.fire('Error', 'No se pudieron cargar los datos iniciales.', 'error');
        }
      };
      loadInitialData();
    }
  }, [obtenerEstudiantes]);

  useEffect(() => {
    const filtered = estudiantes.filter(student => {
      const fullName = `${student.name} ${student.lastName}`.toLowerCase();
      return fullName.includes(searchTerm.toLowerCase()) && !selectedStudents.some(s => s._id === student._id);
    });
    setFilteredStudents(filtered);
  }, [searchTerm, estudiantes, selectedStudents]);

  useEffect(() => {
    if (emailType !== 'school' || !selectedSchool) {
      return;
    }

    const selectedSchoolStudents = estudiantes.filter(
      (student) => student.status === 'Activo' && student.school === selectedSchool
    );

    setSelectedStudents(selectedSchoolStudents);
    setRecipientCount(selectedSchoolStudents.length);
    setManualSelection(false);

    setMessage(`
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Estimado/a,</h2>
        <p>Le informamos que las actividades en <strong>${selectedSchool}</strong> se realizarán el [HORARIO] en [LUGAR].</p>
        <p>Saludos cordiales,<br>Liga de Fútbol Infantil</p>
      </div>
    `);
  }, [emailType, selectedSchool, estudiantes]);

  const handleSelectStudent = (student) => {
    if (student.status === 'Inactivo') {
      Swal.fire('Error', 'No se puede seleccionar un estudiante inactivo.', 'error');
      return;
    }
    setSelectedStudents([...selectedStudents, student]);
    setSearchTerm('');
    setManualSelection(true);
    setRecipientCount(selectedStudents.length + 1);
  };

  const handleRemoveStudent = (studentId) => {
    const updatedStudents = selectedStudents.filter(s => s._id !== studentId);
    setSelectedStudents(updatedStudents);
    if (updatedStudents.length === 0) setManualSelection(false);
    setRecipientCount(updatedStudents.length);
  };

  const handleCancel = () => {
    setEmailType('');
    setSelectedStudents([]);
    setSchools([]);
    setSelectedSchool('');
    setSubject('');
    setMessage('');
    setSearchTerm('');
    setManualSelection(false);
    setRecipientCount(0);
    setAttachments([]);
    setShowPreview(false);
    Swal.fire('Cancelado', 'Todos los datos han sido borrados.', 'info');
  };

  const handleGeneralEmail = async () => {
    setEmailType('general');
    setManualSelection(false);
    setSelectedSchool('');
    setSchools([]);
    const students = await fetchActiveStudents();
    setSelectedStudents(students);
    setRecipientCount(students.length);
    setSubject('');
    setMessage('');
  };

  const handleSchoolEmail = async () => {
    setEmailType('school');
    setManualSelection(false);
    setSelectedStudents([]);
    setRecipientCount(0);
    setSelectedSchool('');
    const schoolOptions = await fetchSchools();
    setSchools(schoolOptions);
    setSubject('Comunicado de Actividades - Liga de Fútbol Infantil');
    setMessage(`
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Estimado/a,</h2>
        <p>Le informamos que las actividades en <strong>[ESCUELA]</strong> se realizarán el [HORARIO] en [LUGAR].</p>
        <p>Saludos cordiales,<br>Liga de Fútbol Infantil</p>
      </div>
    `);
  };

  const handleIndividualEmail = () => {
    setEmailType('individual');
    setSelectedStudents([]);
    setSchools([]);
    setSelectedSchool('');
    setSubject('');
    setMessage('');
    setSearchTerm('');
    setManualSelection(true);
    setRecipientCount(0);
  };

  const handleSendToAll = async () => {
    const recipients = getStudentRecipients(selectedStudents);

    if (recipients.length === 0 && selectedStudents.length > 0) {
      Swal.fire('Error', 'No hay estudiantes seleccionados con correo registrado.', 'error');
      return;
    }

    if (!subject.trim() || !message.trim()) {
      Swal.fire('Error', 'Completá el asunto y el mensaje antes de enviar.', 'error');
      return;
    }

    setLoading(true);
    try {
      const preparedAttachments = await Promise.all(attachments.map(({ file }) => fileToAttachment(file)));
      await sendEmail(recipients, subject, buildMessageWithSignature(), emailType, selectedStudents, () => {
        setSelectedStudents([]);
        setSubject('');
        setMessage('');
        setSearchTerm('');
        setEmailType('');
        setManualSelection(false);
        setRecipientCount(0);
        setAttachments([]);
        setShowPreview(false);
      }, preparedAttachments);
    } catch (error) {
      Swal.fire('Error', error.message || 'No se pudieron preparar los adjuntos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClearEmail = () => {
    setSubject('');
    setMessage('');
  };

  const handleAttachmentChange = (e) => {
    const files = Array.from(e.target.files || []);
    const nextAttachments = [
      ...attachments,
      ...files.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      })),
    ];
    const totalBytes = nextAttachments.reduce((sum, item) => sum + item.file.size, 0);

    if (totalBytes > maxAttachmentTotalBytes) {
      Swal.fire('Error', 'Los adjuntos no pueden superar 18 MB en total.', 'error');
      e.target.value = '';
      return;
    }

    setAttachments(nextAttachments);
    e.target.value = '';
  };

  const handleRemoveAttachment = (attachmentId) => {
    setAttachments((current) => {
      const attachment = current.find(item => item.id === attachmentId);
      if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
      return current.filter(item => item.id !== attachmentId);
    });
  };

  const totalAttachmentBytes = attachments.reduce((sum, item) => sum + item.file.size, 0);

  return (
      <div className="email-notification-container">
      <div className="email-notification-content">
        <h1 className="email-notification-title">Enviar Correos</h1>

        <div className="email-type-buttons">
          <button onClick={handleGeneralEmail} disabled={loading} className="type-btn">General</button>
          <button onClick={handleSchoolEmail} disabled={loading} className="type-btn">Por Escuela</button>
          <button onClick={handleIndividualEmail} disabled={loading} className="type-btn">Individual</button>
          <button onClick={handleCancel} disabled={!emailType} className="type-btn cancel-btn">Cancelar</button>
        </div>

        {emailType === 'school' && (
          <div className="school-selection">
            <label>Seleccionar escuela:</label>
            <select value={selectedSchool} onChange={e => setSelectedSchool(e.target.value)} className="school-select">
              <option value="">Seleccione una escuela</option>
              {schools.map(school => (
                <option key={school} value={school}>{school}</option>
              ))}
            </select>
          </div>
        )}

        {emailType === 'individual' && (
        <div className="student-selection-card">
          <h3>Buscar Estudiante (Opcional)</h3>
          <div className="search-container">
            <input
              type="text"
              placeholder="Buscar estudiante..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="student-search-input"
            />
            <FaSearch className="search-icon" />
            {searchTerm && (
              <ul className="student-search-results">
                {filteredStudents.length ? (
                  filteredStudents.map(student => (
                    <li key={student._id} onClick={() => handleSelectStudent(student)}>
                      <FaCheck className="check-icon" /> {student.name} {student.lastName} ({student.mail || 'Sin correo'}) {student.status === 'Inactivo' && '[Inactivo]'}
                    </li>
                  ))
                ) : (
                  <li>No hay coincidencias</li>
                )}
              </ul>
            )}
          </div>

          {manualSelection && selectedStudents.length > 0 && (
            <div className="selected-students">
              <h4>Estudiantes seleccionados manualmente:</h4>
              <div className="selected-students-list">
                {selectedStudents.map(student => (
                  <div key={student._id} className="selected-student-chip">
                    {student.name} {student.lastName}
                    <FaTimes className="remove-icon" onClick={() => handleRemoveStudent(student._id)} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        )}

        <div className="email-composer-card">
          <h3>
            Componer Correo
            {emailType && ` (Plantilla: ${
              emailType === 'general'
                ? 'General'
                : emailType === 'school'
                  ? 'Por Escuela'
                  : 'Individual'
            })`}
          </h3>
          <input
            type="text"
            placeholder="Asunto"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="email-subject"
          />
          
          <div className="editor-toolbar">
            <button
              type="button"
              onClick={() => applyFormat('bold')}
              className="toolbar-btn"
              title="Negrita"
            >
              <FaBold />
            </button>
            <button
              type="button"
              onClick={() => applyFormat('italic')}
              className="toolbar-btn"
              title="Cursiva"
            >
              <FaItalic />
            </button>
            <button
              type="button"
              onClick={() => applyFormat('underline')}
              className="toolbar-btn"
              title="Subrayado"
            >
              <FaUnderline />
            </button>
          </div>
          
          <div
            contentEditable
            dangerouslySetInnerHTML={{ __html: message }}
            onInput={handleEditorChange}
            className="email-message-editor"
          />

          <div className="email-attachments-panel">
            <label className="attachment-upload-btn">
              <FaPaperclip /> Adjuntar archivos
              <input
                type="file"
                multiple
                onChange={handleAttachmentChange}
                disabled={loading}
              />
            </label>
            <span className="attachment-limit">
              {attachments.length} archivo(s) · {formatFileSize(totalAttachmentBytes)} / 18 MB
            </span>
            {attachments.length > 0 && (
              <div className="attachment-list">
                {attachments.map((attachment) => (
                  <div className="attachment-item" key={attachment.id}>
                    {attachment.previewUrl ? (
                      <img src={attachment.previewUrl} alt={attachment.file.name} className="attachment-thumb" />
                    ) : (
                      <FaPaperclip className="attachment-file-icon" />
                    )}
                    <div className="attachment-info">
                      <strong>{attachment.file.name}</strong>
                      <span>{formatFileSize(attachment.file.size)}</span>
                    </div>
                    <button type="button" onClick={() => handleRemoveAttachment(attachment.id)} disabled={loading}>
                      <FaTimes />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="email-actions">
            <button onClick={handleClearEmail} disabled={loading} className="clear-btn">
              <FaTrash /> Borrar
            </button>
            <button
              onClick={() => setShowPreview(true)}
              disabled={!subject.trim() || !message.trim()}
              className="preview-btn"
            >
              <FaEye /> Vista previa
            </button>
            <button
              onClick={handleSendToAll}
              disabled={loading || recipientCount === 0 || !subject.trim() || !message.trim()}
              className="send-btn"
            >
              {loading ? 'Enviando...' : `Enviar a ${recipientCount} Destinatario(s)`}
            </button>
          </div>
        </div>

        {progress.isSending && (
          <div className="progress-card">
            <div className="progress-header">
              <strong>Progreso del envío</strong>
              <span>{progress.percentage || 0}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress.percentage || 0}%` }} />
            </div>
            <div className="progress-meta">
              <span>Lote {progress.currentBatch || 0} de {progress.totalBatches || 0}</span>
              <span>{progress.sent} procesados de {progress.total || 0}</span>
            </div>
            <div className="progress-meta">
              <span>{progress.success} exitosos</span>
              <span>{progress.failed} fallidos</span>
            </div>
          </div>
        )}

        {showPreview && (
          <div className="email-preview-backdrop" role="dialog" aria-modal="true">
            <div className="email-preview-modal">
              <div className="preview-header">
                <div>
                  <span>Vista previa</span>
                  <h3>{subject}</h3>
                </div>
                <button type="button" onClick={() => setShowPreview(false)} disabled={loading}>
                  <FaTimes />
                </button>
              </div>
              <div className="preview-meta">
                <span>{recipientCount} destinatario(s)</span>
                <span>{attachments.length} adjunto(s)</span>
              </div>
              <div className="preview-body" dangerouslySetInnerHTML={{ __html: buildMessageWithSignature() }} />
              {attachments.length > 0 && (
                <div className="preview-attachments">
                  <strong>Adjuntos</strong>
                  {attachments.map((attachment) => (
                    <div className="preview-attachment" key={attachment.id}>
                      {attachment.previewUrl && <img src={attachment.previewUrl} alt={attachment.file.name} />}
                      <span>{attachment.file.name}</span>
                      <small>{formatFileSize(attachment.file.size)}</small>
                    </div>
                  ))}
                </div>
              )}
              <div className="preview-actions">
                <button type="button" onClick={() => setShowPreview(false)} disabled={loading}>Cerrar</button>
                <button type="button" onClick={handleSendToAll} disabled={loading || recipientCount === 0 || !subject.trim() || !message.trim()}>
                  {loading ? 'Enviando...' : 'Enviar ahora'}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="email-sending-overlay" role="status" aria-live="polite">
            <div className="sending-box">
              <strong>Enviando correos</strong>
              <span>{progress.percentage || 0}%</span>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progress.percentage || 0}%` }} />
              </div>
              <p>{progress.sent} procesados de {progress.total || recipientCount}</p>
              <small>No cierres esta pantalla hasta que finalice el envío.</small>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Email;
