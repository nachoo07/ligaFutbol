import React, { useState, useEffect, useContext, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { FaSearch, FaDownload, FaBars, FaUsers, FaAddressCard, FaMoneyBill, FaListUl, FaRegListAlt, FaChartBar, FaExchangeAlt, FaUserCog, FaCog, FaEnvelope, FaHome, FaArrowLeft } from 'react-icons/fa';
import { LuClipboardList } from "react-icons/lu";
import { StudentsContext } from "../../context/student/StudentContext";
import { LoginContext } from "../../context/login/LoginContext";
import StudentFormModal from '../modal/StudentFormModal';
import Swal from 'sweetalert2';
import "./detailStudent.css";

const StudentDetail = () => {
    const { estudiante: student, obtenerEstudiante, updateEstudiante, deleteEstudiante } = useContext(StudentsContext);
    const { auth } = useContext(LoginContext);
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [show, setShow] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(true);
    const [formData, setFormData] = useState({
        name: '',
        lastName: '',
        dni: '',
        birthDate: '',
        address: '',
        mail: '',
        category: '',
        motherName: '',
        motherPhone: '',
        fatherName: '',
        fatherPhone: '',
        profileImage: null,
        school: '',
        color: '',
        sex: '',
        status: 'Activo',
        archived: [],
        archivedNames: []
    });
    const [initialFormData, setInitialFormData] = useState(null);
    const [loading, setLoading] = useState(true);
    const isMounted = useRef(false);

    const defaultImage = 'https://i.pinimg.com/736x/24/f2/25/24f22516ec47facdc2dc114f8c3de7db.jpg';

    const adminMenuItems = [
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
        { name: 'Detalle Diario', route: '/share/detail', icon: <FaRegListAlt /> },
        {
            name: 'Volver Atrás',
            route: null,
            action: () => {
                const queryParams = new URLSearchParams(location.search);
                const page = queryParams.get('page') || 1;
                navigate(`/student?page=${page}`, { state: { fromDetailStudent: true } });
            },
            icon: <FaArrowLeft />
        },
    ];

    const userMenuItems = [{ name: 'Inicio', route: '/', icon: <FaHome /> }];

    const getCachedImage = (url) => {
        if (!url || url === defaultImage) return defaultImage;
        const cacheKey = `image_${btoa(url)}`;
        const cachedImage = localStorage.getItem(cacheKey);
        return cachedImage || url;
    };

    const preloadImage = (url) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = url;
            img.onload = () => {
                const cacheKey = `image_${btoa(url)}`;
                localStorage.setItem(cacheKey, url);
                resolve(url);
            };
            img.onerror = () => resolve(defaultImage);
        });
    };

    useEffect(() => {
        const fetchData = async () => {
            if (isMounted.current) return;
            isMounted.current = true;
            setLoading(true);
            try {
                console.log('[DEBUG] StudentDetail - Obteniendo estudiante:', id);
                await obtenerEstudiante(id);
                if (student?.profileImage) {
                    await preloadImage(student.profileImage);
                }
            } catch (error) {
                console.error('[DEBUG] Error al obtener estudiante:', error);
                Swal.fire("¡Error!", "No se pudo cargar el estudiante.", "error");
                navigate('/student', { state: { fromDetailStudent: false } });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, obtenerEstudiante, navigate]);

    useEffect(() => {
        if (student) {
            const formattedBirthDate = student.birthDate && !student.birthDate.includes('/')
                ? new Date(student.birthDate + 'T00:00:00Z').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).split('/').reverse().join('/')
                : student.birthDate || '';
            const initialData = {
                ...student,
                birthDate: formattedBirthDate,
                profileImage: student.profileImage || null,
                archived: student.archived || [],
                archivedNames: student.archivedNames || [],
                sex: student.sex || '',
                status: student.status || 'Activo'
            };
            setFormData(initialData);
            setInitialFormData(initialData);
        }
    }, [student]);

    useEffect(() => {
        const handleShareUpdate = () => {
            console.log('[DEBUG] StudentDetail - Detectado shareUpdated, actualizando estudiante');
            obtenerEstudiante(id);
        };
        window.addEventListener('shareUpdated', handleShareUpdate);
        if (window.shareUpdatedPending) {
            obtenerEstudiante(id);
            window.shareUpdatedPending = false;
        }
        return () => window.removeEventListener('shareUpdated', handleShareUpdate);
    }, [id, obtenerEstudiante]);

    if (loading) {
        return (
            <div className="dashboard-container-detail">
                <div className="content-detail">
                    <div className="perfil-container">
                        <div className="perfil-header">
                            <div className="perfil-header-row">
                                <div className="perfil-avatar"><div className="skeleton-image"></div></div>
                                <div className="perfil-info">
                                    <div className="skeleton-text skeleton-text-title"></div>
                                    <div className="skeleton-text skeleton-text-medium"></div>
                                </div>
                                <div className="perfil-actions-header">
                                    <div className="skeleton-button skeleton-button-large"></div>
                                </div>
                            </div>
                        </div>
                        <form className="perfil-formulario">
                            <div className="perfil-row">
                                <div><div className="skeleton-text skeleton-text-medium"></div></div>
                                <div><div className="skeleton-text skeleton-text-medium"></div></div>
                                <div><div className="skeleton-text skeleton-text-medium"></div></div>
                            </div>
                            <div className="perfil-row">
                                <div><div className="skeleton-text skeleton-text-medium"></div></div>
                                <div><div className="skeleton-text skeleton-text-medium"></div></div>
                                <div><div className="skeleton-text skeleton-text-medium"></div></div>
                            </div>
                            <div className="perfil-row">
                                <div><div className="skeleton-text skeleton-text-medium"></div></div>
                                <div><div className="skeleton-text skeleton-text-medium"></div></div>
                            </div>
                            <div className="perfil-row">
                                <div><div className="skeleton-text skeleton-text-medium"></div></div>
                                <div><div className="skeleton-text skeleton-text-medium"></div></div>
                            </div>
                            <div className="perfil-row">
                                <div><div className="skeleton-text skeleton-text-medium"></div></div>
                            </div>
                            <div className="perfil-actions">
                                <div className="skeleton-button skeleton-button-action"></div>
                                <div className="skeleton-button skeleton-button-action"></div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    if (!student) {
        return <div>No se encontró el estudiante.</div>;
    }

    const handleClose = () => {
        setFormData(initialFormData || formData);
        setShow(false);
    };

    const handleShow = () => {
        setFormData(initialFormData || formData);
        setShow(true);
    };

    const handleChange = (e) => {
        const { name, value, type, files } = e.target;
        if (type === 'file') {
            if (name === 'profileImage') {
                setFormData({ ...formData, [name]: files[0] });
            } else if (name === 'archived') {
                setFormData({
                    ...formData,
                    [name]: Array.from(files),
                    archivedNames: Array.from(files).map(f => f.name)
                });
            }
        } else {
            setFormData({
                ...formData,
                [name]: name === 'color' ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : value
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formDataToSend = new FormData();
        Object.keys(formData).forEach(key => {
            if (key === 'profileImage' && formData[key] instanceof File) {
                formDataToSend.append('profileImage', formData[key]);
            } else if (key === 'archived' && Array.isArray(formData[key])) {
                formData[key].forEach((item, index) => {
                    if (item instanceof File) {
                        formDataToSend.append('archived', item);
                    } else if (typeof item === 'string' && item.startsWith('http')) {
                        formDataToSend.append('existingArchived', item);
                    }
                });
            } else if (key !== 'archivedNames' && key !== 'profileImage' && key !== 'archived' && key !== 'isEnabled') {
                formDataToSend.append(key, formData[key] || '');
            }
        });
        const archivedNames = Array.isArray(formData.archivedNames) ? formData.archivedNames : [];
        const existingNames = Array.isArray(student.archivedNames) ? student.archivedNames : [];
        const combinedNames = formData.archived.map((item, index) => {
            if (item instanceof File) {
                return archivedNames[index] || item.name || `Archivo ${index + 1}`;
            } else if (typeof item === 'string' && item.startsWith('http')) {
                return existingNames[index] || archivedNames[index] || `Archivo ${index + 1}`;
            }
            return null;
        }).filter(name => name !== null);
        formDataToSend.append('archivedNames', JSON.stringify(combinedNames));
        if (!formData.archived || formData.archived.length === 0) {
            formDataToSend.append('archived', JSON.stringify([]));
        }
        try {
            const response = await updateEstudiante(student._id, formDataToSend);
            if (response && (response.data.success || response.status === 200)) {
                const updatedStudent = response.data.student || response.data;
                const updatedData = {
                    ...updatedStudent,
                    birthDate: updatedStudent.birthDate.includes('/')
                        ? updatedStudent.birthDate
                        : new Date(updatedStudent.birthDate + 'T00:00:00Z').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).split('/').reverse().join('/'),
                    profileImage: updatedStudent.profileImage || formData.profileImage,
                    archived: updatedStudent.archived || [],
                    archivedNames: updatedStudent.archivedNames || []
                };
                setFormData(updatedData);
                setInitialFormData(updatedData);
                await obtenerEstudiante(student._id);
                await Swal.fire("¡Éxito!", "El perfil ha sido actualizado.", "success");
                handleClose();
                window.dispatchEvent(new Event('shareUpdated'));
            } else {
                await Swal.fire("¡Error!", response?.data?.message || "No se pudo actualizar el perfil.", "error");
            }
        } catch (error) {
            console.error("[DEBUG] Error al actualizar estudiante:", error);
            await Swal.fire("¡Error!", error.response?.data?.message || "Ha ocurrido un error al actualizar el perfil.", "error");
        }
    };

    const handleDelete = async () => {
        try {
            const success = await deleteEstudiante(student._id);
            if (success) {
                navigate("/student", { state: { fromDetailStudent: false } });
            }
        } catch (error) {
            Swal.fire('Error', 'Hubo un problema al eliminar el perfil.', 'error');
        }
    };

    const handleViewShares = () => {
        navigate(`/share/${student._id}`, { state: { fromStudentDetail: true } });
    };

    const handleImageError = (e) => {
        setImageError(true);
        e.target.src = defaultImage;
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
        return text.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    };

    return (
        <div className="dashboard-container-detail">
            <div className="content-detail">
                <div className="perfil-container">
                    <div className="perfil-header">
                        <div className="perfil-header-row">
                            <div className="perfil-avatar">
                                <img
                                    src={getCachedImage(student.profileImage)}
                                    alt="Perfil"
                                    onError={handleImageError}
                                    style={{ display: imageError ? 'none' : 'block' }}
                                />
                                {imageError && <img src={defaultImage} alt="Default" />}
                            </div>
                            <div className="perfil-info">
                                <h2>{capitalizeInitials(student.name)} {capitalizeInitials(student.lastName)}</h2>
                                {auth === 'admin' && (
                                    <button className="btn-ver-cuotas btn-ver-cuotas-large" onClick={handleViewShares}>
                                        Ver Cuotas
                                    </button>
                                )}
                            </div>
                            <div className="perfil-actions-header">
                                <button
                                    className="btn-volver-atras btn-volver-atras-large"
                                    onClick={() => {
                                        const queryParams = new URLSearchParams(location.search);
                                        const page = queryParams.get('page') || 1;
                                        navigate(`/student?page=${page}`, { state: { fromDetailStudent: true } });
                                    }}
                                >
                                    Volver atrás
                                </button>
                            </div>
                        </div>
                        <div className="perfil-actions-mobile">
                            {auth === 'admin' && (
                                <button className="btn-ver-cuotas btn-ver-cuotas-mobile" onClick={handleViewShares}>
                                    Ver Cuotas
                                </button>
                            )}
                            <button
                                className="btn-volver-atras btn-volver-atras-mobile"
                                onClick={() => {
                                    const queryParams = new URLSearchParams(location.search);
                                    const page = queryParams.get('page') || 1;
                                    navigate(`/student?page=${page}`, { state: { fromDetailStudent: true } });
                                }}
                            >
                                Volver atrás
                            </button>
                        </div>
                    </div>
                    <form className="perfil-formulario">
                        {/* Información Personal */}
                        <div className="perfil-row">
                            <h3>📋 Información Personal</h3>
                            <div className="perfil-inputs-grid grid-4">
                                <div className="input-field">
                                    <label>DNI</label>
                                    <input type="text" value={student.dni || ''} readOnly />
                                </div>
                                <div className="input-field">
                                    <label>Fecha de Nacimiento</label>
                                    <input type="text" value={student.birthDate || ''} readOnly />
                                </div>
                                <div className="input-field">
                                    <label>Categoría</label>
                                    <input type="text" value={student.category || ''} readOnly />
                                </div>
                                <div className="input-field">
                                    <label>Sexo</label>
                                    <input type="text" value={student.sex || ''} readOnly />
                                </div>
                                {auth === 'admin' && (
                                    <div className="input-field">
                                        <label>Dirección</label>
                                        <input type="text" value={student.address || ''} readOnly />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Información de Contacto */}
                        {auth === 'admin' && (
                            <div className="perfil-row">
                                <h3>📞 Información de Contacto</h3>
                                <div className="perfil-inputs-grid grid-3">
                                    <div className="input-field">
                                        <label>Email</label>
                                        <input type="text" value={student.mail || ''} readOnly />
                                    </div>
                                    <div className="input-field">
                                        <label>Nombre Mamá</label>
                                        <input type="text" value={capitalizeInitials(student.motherName) || ''} readOnly />
                                    </div>
                                    <div className="input-field">
                                        <label>Teléfono Mamá</label>
                                        <input type="text" value={student.motherPhone || ''} readOnly />
                                    </div>
                                    <div className="input-field">
                                        <label>Nombre Papá</label>
                                        <input type="text" value={capitalizeInitials(student.fatherName) || ''} readOnly />
                                    </div>
                                    <div className="input-field">
                                        <label>Teléfono Papá</label>
                                        <input type="text" value={student.fatherPhone || ''} readOnly />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Otros Datos y Archivos Adjuntos en dos columnas */}
                        <div className="two-column-layout">
                            {/* Otros Datos */}
                            <div className="perfil-row">
                                <h3>⚽ Otros Datos</h3>
                                <div className="perfil-inputs-grid grid-2">
                                    <div className="input-field">
                                        <label>Escuela</label>
                                        <input type="text" value={student.school || ''} readOnly />
                                    </div>
                                    <div className="input-field">
                                        <label>Color</label>
                                        <input type="text" value={student.color || ''} readOnly />
                                    </div>
                                    {auth === 'admin' && (
                                        <div className="input-field">
                                            <label>Estado</label>
                                            <input type="text" value={student.status || ''} readOnly />
                                        </div>
                                    )}
                                    <div className="input-field">
                                        <label>Habilitado para Jugar</label>
                                        <input
                                            type="text"
                                            value={student.isEnabled ? "Habilitado" : "No Habilitado"}
                                            readOnly
                                            className={student.isEnabled ? "habilitado" : "no-habilitado"}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Archivos Adjuntos */}
                            {auth === 'admin' && (
                                <div className="perfil-row archived-section">
                                    <h3>📎 Archivos Adjuntos</h3>
                                    {student.archived && student.archived.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                                            {student.archived.slice(0, 2).map((url, index) => (
                                                <div key={index} className="archived-item">
                                                    <a
                                                        href={url || '#'}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => !url && e.preventDefault()}
                                                        style={{ flex: 1, fontSize: '14px' }}
                                                    >
                                                        {student.archivedNames && student.archivedNames[index]
                                                            ? student.archivedNames[index]
                                                            : `Archivo ${index + 1}`}
                                                    </a>
                                                    <button
                                                        type="button"
                                                        className="btn-download"
                                                        onClick={() => url && handleDownload(url, student.archivedNames[index] || `Archivo ${index + 1}`)}
                                                        title="Descargar archivo"
                                                        disabled={!url}
                                                    >
                                                        <FaDownload />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p style={{ fontSize: '14px', color: '#666', fontStyle: 'italic' }}>No hay archivos adjuntos.</p>
                                    )}

                 
                                </div>
                                
                            )}
                            
                        </div>
                                              {/* Botones de acción MOVIDOS al final del contenedor */}
                    {auth === 'admin' && (
                        <div className="perfil-actions">
                            <button type="button" className="btn-editar" onClick={handleShow}>Editar Perfil</button>
                            <button type="button" className="btn-eliminar" onClick={handleDelete}>Eliminar Perfil</button>
                        </div>
                    )}
                    </form>

                 
                </div>
                {auth === 'admin' && (
                    <StudentFormModal
                        show={show}
                        handleClose={handleClose}
                        handleSubmit={handleSubmit}
                        handleChange={handleChange}
                        formData={formData}
                        student={student}
                    />
                )}
            </div>
        </div>
    );
};

export default StudentDetail;