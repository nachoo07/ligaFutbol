import React, { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaBars, FaUsers, FaBell, FaMoneyBill, FaChartBar, FaExchangeAlt, FaCalendarCheck, FaUserCog, FaCog, FaEnvelope, FaHome, FaArrowLeft, FaDownload } from 'react-icons/fa';
import { StudentsContext } from "../../context/student/StudentContext";
import StudentFormModal from '../modal/StudentFormModal';
import Swal from 'sweetalert2';
import axios from 'axios';
import "./detailStudent.css";

const StudentDetail = () => {
    const { estudiantes, updateEstudiante, deleteEstudiante } = useContext(StudentsContext);
    const { id } = useParams();
    const navigate = useNavigate();
    const [student, setStudent] = useState(null);
    const [show, setShow] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(true);
    const [formData, setFormData] = useState({
        name: '', lastName: '', dni: '', birthDate: '', address: '', mail: '', category: '',
        motherName: '', motherPhone: '', fatherName: '', fatherPhone: '', profileImage: null,
        school: '', color: '', sex: '', status: 'Activo', archived: [], archivedNames: []
    });
    const [loading, setLoading] = useState(true);

    const menuItems = [
        { name: 'Inicio', route: '/', icon: <FaHome /> },
        { name: 'Alumnos', route: '/student', icon: <FaUsers /> },
        { name: 'Notificaciones', route: '/notification', icon: <FaBell /> },
        { name: 'Cuotas', route: '/share', icon: <FaMoneyBill /> },
        { name: 'Reportes', route: '/report', icon: <FaChartBar /> },
        { name: 'Movimientos', route: '/motion', icon: <FaExchangeAlt /> },
        { name: 'Asistencia', route: '/attendance', icon: <FaCalendarCheck /> },
        { name: 'Usuarios', route: '/user', icon: <FaUserCog /> },
        { name: 'Ajustes', route: '/settings', icon: <FaCog /> },
        { name: 'Envios de Mail', route: '/email-notifications', icon: <FaEnvelope /> },
        { name: 'Volver Atrás', route: null, action: () => navigate(-1), icon: <FaArrowLeft /> }
    ];

    useEffect(() => {
        const fetchStudent = async () => {
            setLoading(true);
            let selectedStudent = estudiantes.find((est) => est._id === id);
    
            if (!selectedStudent) {
                try {
                    const response = await axios.get(`http://localhost:4001/api/students/${id}`, {
                        withCredentials: true,
                    });
                    selectedStudent = response.data;
                    setStudent(selectedStudent);
                } catch (error) {
                    console.error("Error al obtener el estudiante:", error);
                    Swal.fire("¡Error!", "No se pudo cargar el estudiante.", "error");
                    navigate('/student');
                    return;
                }
            } else {
                setStudent(selectedStudent);
            }
    
            if (selectedStudent) {
                let formattedBirthDate = selectedStudent.birthDate || '';
                if (formattedBirthDate && !formattedBirthDate.includes('/')) {
                    const [year, month, day] = formattedBirthDate.split('-');
                    formattedBirthDate = `${day}/${month}/${year}`;
                }

                setFormData({
                    ...selectedStudent,
                    birthDate: formattedBirthDate,
                    profileImage: null,
                    archived: selectedStudent.archived || [],
                    archivedNames: selectedStudent.archivedNames || [],
                    sex: selectedStudent.sex || '',
                    status: selectedStudent.status || 'Activo'
                });
            }
            setLoading(false);
        };
    
        fetchStudent();
    }, [id, estudiantes, navigate]);

    if (loading) {
        return <div>Cargando...</div>;
    }

    if (!student) {
        return <div>No se encontró el estudiante.</div>;
    }

    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);

    const handleChange = (e) => {
        const { name, value, type, files } = e.target;
        if (type === 'file') {
            if (name === 'profileImage') {
                setFormData({ ...formData, [name]: files[0] });
            } else if (name === 'archived') {
                setFormData({ ...formData, [name]: Array.from(files), archivedNames: Array.from(files).map(f => f.name) });
            }
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.dni || !formData.name || !formData.lastName || !formData.birthDate || !formData.address ||
            !formData.motherName || !formData.fatherName || !formData.motherPhone || !formData.fatherPhone ||
            !formData.category || !formData.school || !formData.sex || !formData.status) {
            Swal.fire("¡Error!", "Todos los campos obligatorios deben estar completos.", "error");
            return;
        }

        const formDataToSend = new FormData();
        Object.keys(formData).forEach(key => {
            if (key === 'profileImage' && formData[key] instanceof File) {
                formDataToSend.append(key, formData[key]);
            } else if (key === 'archived' && formData[key].length > 0) {
                formData[key].forEach(file => formDataToSend.append('archived', file));
            } else if (key !== 'archivedNames' && key !== 'profileImage') {
                formDataToSend.append(key, formData[key]);
            }
        });

        try {
            const response = await updateEstudiante(student._id, formDataToSend);
            if (response && (response.data.success || response.status === 200)) {
                await Swal.fire("¡Éxito!", "El perfil ha sido actualizado.", "success");
                handleClose();
                setStudent(response.data.student || response.data);
            } else {
                await Swal.fire("¡Error!", response?.data?.message || "No se pudo actualizar el perfil.", "error");
            }
        } catch (error) {
            console.error("Error al actualizar estudiante:", error);
            await Swal.fire("¡Error!", error.response?.data?.message || "Ha ocurrido un error al actualizar el perfil.", "error");
        }
    };

    const handleDelete = async () => {
        try {
            const success = await deleteEstudiante(student._id);
            if (success) {
                navigate("/student");
            }
        } catch (error) {
            Swal.fire('Error', 'Hubo un problema al eliminar el perfil.', 'error');
        }
    };

    const formatDate = (isoDate) => {
        if (!isoDate) return '';
        return isoDate;
    };

    const handleViewShares = () => {
        navigate(`/share/${student._id}`, { state: { fromStudentDetail: true } });
    };

    const handleImageError = (e) => {
        setImageError(true);
        e.target.src = 'https://i.pinimg.com/736x/24/f2/25/24f22516ec47facdc2dc114f8c3de7db.jpg';
    };

    const handleDownload = async (url, fileName) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName || 'archivo_descargado';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error('Error al descargar el archivo:', error);
            Swal.fire('Error', 'No se pudo descargar el archivo.', 'error');
        }
    };

    const capitalizeInitials = (text) => {
        if (!text) return '';
        return text
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

    return (
        <div className="dashboard-container-detail">
            <div className={`sidebar ${isMenuOpen ? 'open' : 'closed'}`}>
                <div className="sidebar-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                    <FaBars />
                </div>
                {menuItems.map((item, index) => (
                    <div
                        key={index}
                        className="sidebar-item"
                        onClick={() => item.action ? item.action() : navigate(item.route)}
                    >
                        <span className="icon">{item.icon}</span>
                        <span className="text">{item.name}</span>
                    </div>
                ))}
            </div>
            <div className='content-detail'>
                <div className="perfil-container">
                    <div className="perfil-header">
                        <div className="perfil-avatar">
                            <img
                                src={student.profileImage}
                                alt="Perfil"
                                onError={handleImageError}
                            />
                        </div>
                        <div className="perfil-info">
                            <h2>{capitalizeInitials(student.name)} {capitalizeInitials(student.lastName)}</h2>
                            <button className="btn-ver-cuotas" onClick={handleViewShares}>Ver Cuotas</button>
                        </div>
                    </div>
                    <form className="perfil-formulario">
                        <div className="perfil-row">
                            <div><label>DNI</label><input type="text" value={student.dni} readOnly /></div>
                            <div><label>Fecha de Nacimiento</label><input type="text" value={formatDate(student.birthDate)} readOnly /></div>
                            <div><label>Categoría</label><input type="text" value={student.category} readOnly /></div>
                        </div>
                        <div className="perfil-row">
                            <div><label>Dirección</label><input type="text" value={student.address} readOnly /></div>
                            <div><label>Email</label><input type="text" value={student.mail || ''} readOnly /></div>
                            <div><label>Escuela</label><input type="text" value={student.school} readOnly /></div>
                        </div>
                        <div className="perfil-row">
                            <div><label>Nombre Mamá</label><input type="text" value={student.motherName} readOnly /></div>
                            <div><label>Celular Mamá</label><input type="text" value={student.motherPhone} readOnly /></div>
                        </div>
                        <div className="perfil-row">
                            <div><label>Nombre Papá</label><input type="text" value={student.fatherName} readOnly /></div>
                            <div><label>Celular Papá</label><input type="text" value={student.fatherPhone} readOnly /></div>
                        </div>
                        <div className="perfil-row">
                            <div><label>Sexo</label><input type="text" value={student.sex} readOnly /></div>
                            <div><label>Estado</label><input type="text" value={student.status} readOnly /></div>
                            <div><label>Color</label><input type="text" value={student.color || ''} readOnly /></div>
                        </div>
                        <div className="perfil-row">
                            <div>
                                <label>Habilitado para Jugar</label>
                                <input
                                    type="text"
                                    value={student.isEnabled ? "Habilitado" : "No Habilitado"}
                                    readOnly
                                    className={student.isEnabled ? "habilitado" : "no-habilitado"}
                                />
                            </div>
                        </div>
                        {student.archived && student.archived.length > 0 && (
                            <div className="perfil-row archived-section">
                                <label>Archivos Adjuntos</label>
                                {student.archived.map((url, index) => (
                                    <div key={index} className="archived-item">
                                        <a href={url} target="_blank" rel="noopener noreferrer">
                                            {`archivo${index + 1}`} {/* Mostrar archivo1, archivo2 en la interfaz */}
                                        </a>
                                        <button
                                            type="button"
                                            className="btn-download"
                                            onClick={() => handleDownload(url, `archivo${index + 1}`)}
                                            title="Descargar archivo"
                                        >
                                            <FaDownload />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="perfil-actions">
                            <button type="button" className="btn-editar" onClick={handleShow}>Editar Perfil</button>
                            <button type="button" className="btn-eliminar" onClick={handleDelete}>Eliminar Perfil</button>
                        </div>
                    </form>
                </div>
                <StudentFormModal
                    show={show}
                    handleClose={handleClose}
                    handleSubmit={handleSubmit}
                    handleChange={handleChange}
                    formData={formData}
                />
            </div>
        </div>
    );
};

export default StudentDetail;