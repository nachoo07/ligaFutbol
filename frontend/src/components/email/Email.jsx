import React, { useState, useEffect, useContext, useRef } from 'react';
import { StudentsContext } from '../../context/student/StudentContext';
import { useEmail } from '../../context/email/EmailContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaSearch, FaCheck, FaTimes, FaBars, FaTrash, FaUsers, FaAddressCard, FaMoneyBill, FaRegListAlt, FaChartBar, FaExchangeAlt, FaUserCog, FaEnvelope, FaHome, FaArrowLeft, FaBold, FaItalic, FaUnderline } from 'react-icons/fa';
import { LuClipboardList } from "react-icons/lu";
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
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const isMounted = useRef(false);

  const menuItems = [
    { name: 'Inicio', route: '/', icon: <FaHome /> },
    { name: 'Alumnos', route: '/student', icon: <FaUsers /> },
    { name: 'Cuotas', route: '/share', icon: <FaMoneyBill /> },
    { name: 'Reportes', route: '/report', icon: <FaChartBar /> },
    { name: 'Movimientos', route: '/motion', icon: <FaExchangeAlt /> },
    { name: 'Carnet', route: '/carnet', icon: <FaAddressCard /> },
    { name: 'Lista buena fe', route: '/list', icon: <FaRegListAlt /> },
    { name: 'Deudores', route: '/pendingshare', icon: <LuClipboardList /> },
    { name: 'Usuarios', route: '/user', icon: <FaUserCog /> },
    { name: 'Envios de Mail', route: '/email', icon: <FaEnvelope /> },
    { name: 'Volver Atrás', route: null, action: () => navigate(-1), icon: <FaArrowLeft /> },
  ];

  const formatDate = (date) => {
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

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
        } catch (error) {
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
    Swal.fire('Cancelado', 'Todos los datos han sido borrados.', 'info');
  };

  const handleGeneralEmail = async () => {
    setEmailType('general');
    setManualSelection(false);
    const students = await fetchActiveStudents();
    setSelectedStudents(students);
    setRecipientCount(students.length);
    setSubject('Bienvenida Liga Infantil de Fútbol Yerba Buena 2025');
    setMessage(`
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <p><strong>Estimado/a padre, madre o tutor/a:</strong></p>
        <p>Nos alegra mucho darles la bienvenida a la segunda edición de la <strong>Liga Infantil de Fútbol Yerba Buena 2025</strong>. Estamos muy contentos de contar nuevamente con <strong>[Nombre del niño o niña]</strong> como parte de esta experiencia deportiva.</p>
        <p><strong>📅 Fecha de inicio del torneo:</strong> 23 de agosto</p>
        <p><strong>💰 Costo de inscripción:</strong> $50.000 (puede abonarse en dos cuotas o en un solo pago).</p>
        <p><strong>⚠️ Importante:</strong> Para pagos realizados después del 1 de septiembre, el valor de inscripción será de $55.000.</p>
        <p>Pronto recibirán más información por este medio, así que les pedimos estar atentos en estos días.</p>
        <p>Ante cualquier duda o consulta, pueden escribirnos a <strong>[TU CORREO]</strong> o comunicarse al <strong>[TU NÚMERO DE WHATSAPP]</strong>.</p>
        <p>¡Gracias por ser parte de esta nueva edición! Estamos seguros de que será una experiencia inolvidable para todos los chicos.</p>
        <p style="margin-top: 30px;">
          <strong>Saludos cordiales,</strong><br>
          Organización Liga Infantil de Fútbol Yerba Buena 2025
        </p>
      </div>
    `);
  };

  const handleSchoolEmail = async () => {
    setEmailType('school');
    setManualSelection(false);
    const schools = await fetchSchools();
    setSchools(schools);
    setRecipientCount(0);
    setSubject('Comunicado de Actividades - Liga de Fútbol Infantil');
    setMessage(`
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Estimado/a,</h2>
        <p>Le informamos que las actividades en <strong>${selectedSchool || '[ESCUELA]'}</strong> se realizarán el [HORARIO] en [LUGAR].</p>
        <p>Saludos cordiales,<br>Liga de Fútbol Infantil</p>
      </div>
    `);
  };

  const handleSendToAll = async () => {
    const recipients = selectedStudents.filter(s => s.mail).map(s => s.mail);

    if (recipients.length === 0 && selectedStudents.length > 0) {
      Swal.fire('Error', 'No hay estudiantes seleccionados con correo registrado.', 'error');
      return;
    }

    setLoading(true);
    await sendEmail(recipients, subject, message, emailType, selectedStudents, () => {
      setSelectedStudents([]);
      setSubject('');
      setMessage('');
      setSearchTerm('');
      setEmailType('');
      setManualSelection(false);
      setRecipientCount(0);
    });
    setLoading(false);
  };

  const handleClearEmail = () => {
    setSubject('');
    setMessage('');
  };

  return (
    <div className="email-notification-container">
      <div className={`sidebar ${isMenuOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          <FaBars />
        </div>
        {menuItems.map((item, index) => (
          <div key={index} className="sidebar-item" onClick={() => item.action ? item.action() : navigate(item.route)}>
            <span className="icon">{item.icon}</span>
            <span className="text">{item.name}</span>
          </div>
        ))}
      </div>
      <div className="email-notification-content">
        <h1 className="email-notification-title">Enviar Correos</h1>

        <div className="email-type-buttons">
          <button onClick={handleGeneralEmail} disabled={loading} className="type-btn">General</button>
          <button onClick={handleSchoolEmail} disabled={loading} className="type-btn">Por Escuela</button>
          <button onClick={handleCancel} disabled={!emailType} className="type-btn cancel-btn">Cancelar</button>
        </div>

        {emailType && (
          <div className="recipient-stats">
            {recipientCount > 0 && <p>{recipientCount} estudiantes seleccionados</p>}
          </div>
        )}

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

        <div className="email-composer-card">
          <h3>Componer Correo {emailType && `(Plantilla: ${emailType === 'general' ? 'General' : 'Por Escuela'})`}</h3>
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
          
          <div className="email-actions">
            <button onClick={handleClearEmail} disabled={loading} className="clear-btn">
              <FaTrash /> Borrar
            </button>
            <button onClick={handleSendToAll} disabled={loading || !selectedStudents.length} className="send-btn">
              {loading ? 'Enviando...' : `Enviar a ${recipientCount} Destinatario(s)`}
            </button>
          </div>
        </div>

        {progress.sent > 0 && (
          <div className="progress-bar">
            Progreso: {progress.sent} enviados ({progress.success} exitosos, {progress.failed} fallidos)
          </div>
        )}
      </div>
    </div>
  );
};

export default Email;