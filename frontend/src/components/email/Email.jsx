import React, { useState, useEffect, useContext } from 'react';
import { StudentsContext } from '../../context/student/StudentContext';
import { useEmail } from '../../context/email/EmailContext'; // Nuevo contexto
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaBars,FaTrash, FaUsers,FaAddressCard, FaMoneyBill,FaRegListAlt, FaChartBar, FaExchangeAlt, FaUserCog, FaCog, FaEnvelope, FaHome, FaArrowLeft, FaFileExcel } from 'react-icons/fa';
import { LuClipboardList } from "react-icons/lu";
import './email.css';

const Email = () => {
    const { estudiantes, obtenerEstudiantes } = useContext(StudentsContext);
    const { sendEmail } = useEmail(); // Usar el nuevo contexto
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredStudents, setFilteredStudents] = useState([]);
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(true);

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
        { name: 'Envios de Mail', route: '/email-notifications', icon: <FaEnvelope /> },
        { name: 'Volver Atrás', route: null, action: () => navigate(-1), icon: <FaArrowLeft /> },
    ];

    useEffect(() => {
        obtenerEstudiantes();
    }, []);

    useEffect(() => {
        const filtered = estudiantes.filter(student => {
            const fullName = `${student.name} ${student.lastName}`.toLowerCase();
            return fullName.includes(searchTerm.toLowerCase()) && !selectedStudents.some(s => s._id === student._id);
        });
        setFilteredStudents(filtered);
    }, [searchTerm, estudiantes, selectedStudents]);

    const handleSelectStudent = (student) => {
        if (student.state === 'Inactivo') {
            Swal.fire('Error', 'No se puede seleccionar un estudiante inactivo.', 'error');
            return;
        }
        setSelectedStudents([...selectedStudents, student]);
        setSearchTerm('');
    };

    const handleRemoveStudent = (studentId) => {
        setSelectedStudents(selectedStudents.filter(s => s._id !== studentId));
    };

    const handleSelectAll = () => {
        const activeStudents = estudiantes.filter(s => s.state === 'Activo' && s.mail);
        setSelectedStudents(activeStudents);
        setSearchTerm('');
    };

    const handleCancel = () => {
        setSelectedStudents([]);
        setSubject('');
        setMessage('');
        setSearchTerm('');
    };

    const handleClearEmail = () => {
        setSubject('');
        setMessage('');
    };

    const handleSendIndividualEmail = async () => {
        if (selectedStudents.length !== 1) {
            Swal.fire('Error', 'Selecciona exactamente un estudiante para esta opción.', 'error');
            return;
        }
        setLoading(true);
        const success = await sendEmail(
            [selectedStudents[0].mail],
            subject,
            message,
            handleCancel // Limpiar el formulario si el envío es exitoso
        );
        setLoading(false);
    };
    const handleSendToAll = async () => {
        const recipients = selectedStudents.map(s => s.mail).filter(email => email);
        if (recipients.length !== selectedStudents.length) {
            Swal.fire('Error', 'Algunos estudiantes seleccionados no tienen correo registrado.', 'error');
            return;
        }
        setLoading(true);
        const success = await sendEmail(recipients, subject, message, handleCancel);
        setLoading(false);
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

                <div className="student-selection-card">
                    <h3>Seleccionar Estudiantes</h3>
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
                                            <FaCheck className="check-icon" /> {student.name} {student.lastName} ({student.mail || 'Sin correo'}) {student.state === 'Inactivo' && '[Inactivo]'}
                                        </li>
                                    ))
                                ) : (
                                    <li>No hay coincidencias</li>
                                )}
                            </ul>
                        )}
                    </div>

                    <div className="selected-students">
                        {selectedStudents.map(student => (
                            <div key={student._id} className="selected-student-chip">
                                {student.name} {student.lastName}
                                <FaTimes className="remove-icon" onClick={() => handleRemoveStudent(student._id)} />
                            </div>
                        ))}
                    </div>

                    <div className="selection-actions">
                        <button onClick={handleSelectAll} disabled={loading} className="select-all-btn">Todos Activos</button>
                        <button onClick={handleCancel} disabled={loading} className="cancel-btn">Cancelar</button>
                    </div>
                </div>

                <div className="email-composer-card">
                    <h3>Componer Correo</h3>
                    <input
                        type="text"
                        placeholder="Asunto"
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        className="email-subject"
                    />
                    <textarea
                        placeholder="Escribe tu mensaje aquí..."
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        className="email-message"
                    />
                    <div className="email-actions">
                        <button onClick={handleClearEmail} disabled={loading} className="clear-btn">
                            <FaTrash /> Borrar
                        </button>
                        {selectedStudents.length === 1 && (
                            <button onClick={handleSendIndividualEmail} disabled={loading}>
                                {loading ? 'Enviando...' : 'Enviar a Seleccionado'}
                            </button>
                        )}
                        <button onClick={handleSendToAll} disabled={loading}>
                            {loading ? 'Enviando...' : `Enviar a ${selectedStudents.length} Seleccionado(s)`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Email;