import React, { useState, useEffect, useContext, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { FaDownload } from 'react-icons/fa';
import { StudentsContext } from "../../context/student/StudentContext";
import { LoginContext } from "../../context/login/LoginContext";
import StudentFormModal from '../modal/StudentFormModal';
import Swal from 'sweetalert2';
import "./detailStudent.css";

const formatDate = (date) => {
    if (!date) return '';
    if (date.includes('/')) return date;
    return new Date(date + 'T00:00:00Z').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).split('/').reverse().join('/');
};

const initialStudentFormData = {
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
    archivedNames: [],
};

const buildStudentFormData = (student = {}) => ({
    ...student,
    birthDate: formatDate(student.birthDate),
    profileImage: student.profileImage || null,
    archived: student.archived || [],
    archivedNames: student.archivedNames || [],
    sex: student.sex || '',
    status: student.status || 'Activo',
});

const StudentDetail = () => {
    const { estudiante: student, obtenerEstudiante, updateEstudiante, deleteEstudiante } = useContext(StudentsContext);
    const { auth } = useContext(LoginContext);
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [show, setShow] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [formData, setFormData] = useState(initialStudentFormData);
    const [initialFormData, setInitialFormData] = useState(initialStudentFormData);
    const [loading, setLoading] = useState(true);
    const hasFetched = useRef(false);
    const defaultImage = 'https://i.pinimg.com/736x/24/f2/25/24f22516ec47facdc2dc114f8c3de7db.jpg';


    const getImageUrl = (url) => {
        if (!url || url === defaultImage) return defaultImage;
        return url;
    };

    useEffect(() => {
        const fetchData = async () => {
            if (hasFetched.current) return;
            hasFetched.current = true;
            setLoading(true);
            try {
                await obtenerEstudiante(id);
            } catch (error) {
                console.error('Error al obtener estudiante:', error);
                Swal.fire("¡Error!", "No se pudo cargar el estudiante.", "error");
                navigate('/student', { state: { fromDetailStudent: false } });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, obtenerEstudiante, navigate]);

    useEffect(() => {
        if (student && student._id === id) {
            const initialData = buildStudentFormData(student);
            setFormData(initialData);
            setInitialFormData(initialData);
            setImageError(false);
        }
    }, [student, id]);

    if (loading) {
        return (
            <div className="dashboard-container">
                <div className="content-student">
                    <div className="perfil-container">
                        <div className="perfil-header">
                            <div className="perfil-header-row">
                                <div className="perfil-avatar">
                                    <div className="skeleton-image"></div>
                                </div>
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
                                <div className="perfil-inputs-grid grid-4">
                                    {[...Array(4)].map((_, i) => (
                                        <div key={i} className="input-field">
                                            <div className="skeleton-text skeleton-text-medium"></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {auth === 'admin' && (
                                <>
                                    <div className="perfil-row">
                                        <div className="perfil-inputs-grid grid-3">
                                            {[...Array(5)].map((_, i) => (
                                                <div key={i} className="input-field">
                                                    <div className="skeleton-text skeleton-text-medium"></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="perfil-row">
                                        <div className="perfil-inputs-grid grid-2">
                                            {[...Array(2)].map((_, i) => (
                                                <div key={i} className="input-field">
                                                    <div className="skeleton-text skeleton-text-medium"></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                            <div className="perfil-actions">
                                <div className="skeleton-button skeleton-action"></div>
                                <div className="skeleton-button skeleton-action"></div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    if (!student || student._id !== id) {
        return <div>No se encontró el estudiante.</div>;
    }

    const archivedFiles = Array.isArray(student.archived) ? student.archived.slice(0, 2) : [];

    const handleClose = () => {
        setFormData(initialFormData);
        setShow(false);
    };

    const handleShow = () => {
        setShow(true);
    };

    const handleChange = (e) => {
        const { name, value, type, files } = e.target;

        setFormData((prev) => {
            if (type === 'file') {
                if (name === 'profileImage') {
                    return { ...prev, [name]: files[0] };
                }

                if (name === 'archived') {
                    const selectedFiles = Array.from(files);
                    return {
                        ...prev,
                        archived: selectedFiles,
                        archivedNames: selectedFiles.map((file) => file.name),
                    };
                }
            }

            return {
                ...prev,
                [name]: name === 'color'
                    ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
                    : value,
            };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formDataToSend = new FormData();
        Object.keys(formData).forEach((key) => {
            if (key === 'profileImage' && formData[key] instanceof File) {
                formDataToSend.append('profileImage', formData[key]);
                return;
            }

            if (key === 'archived') {
                if (Array.isArray(formData.archived)) {
                    formData.archived.forEach((item) => {
                        if (item instanceof File) {
                            formDataToSend.append('archived', item);
                        } else if (typeof item === 'string' && item.startsWith('http')) {
                            formDataToSend.append('existingArchived', item);
                        }
                    });
                }

                return;
            }

            if (key === 'archivedNames') {
                return;
            }

            if (key !== 'profileImage') {
                formDataToSend.append(key, formData[key] || '');
            }
        });

        // Señal explícita de borrado: había foto y el usuario la quitó sin subir una nueva
        const seBorroLaFoto =
            !(formData.profileImage instanceof File) && !formData.profileImage;
        if (seBorroLaFoto) {
            formDataToSend.append('deleteProfileImage', 'true');
        }

        const archivedNames = Array.isArray(formData.archivedNames) ? formData.archivedNames : [];
        const existingNames = Array.isArray(student.archivedNames) ? student.archivedNames : [];
        const combinedNames = (Array.isArray(formData.archived) ? formData.archived : [])
            .map((item, index) => {
                if (item instanceof File) {
                    return archivedNames[index] || item.name || `Archivo ${index + 1}`;
                }

                if (typeof item === 'string' && item.startsWith('http')) {
                    return existingNames[index] || archivedNames[index] || `Archivo ${index + 1}`;
                }

                return null;
            })
            .filter(Boolean);

        formDataToSend.append('archivedNames', JSON.stringify(combinedNames));

        if (!formData.archived || formData.archived.length === 0) {
            formDataToSend.append('archived', JSON.stringify([]));
        }
        try {
            const response = await updateEstudiante(student._id, formDataToSend);
            if (response && (response.data.success || response.status === 200)) {
                const updatedStudent = response.data.student || response.data;
                const updatedData = buildStudentFormData({
                    ...updatedStudent,
                    profileImage: updatedStudent.profileImage || formData.profileImage,
                });
                setFormData(updatedData);
                setInitialFormData(updatedData);
                await obtenerEstudiante(student._id);
                handleClose();
            } else {
                await Swal.fire("¡Error!", response?.data?.message || "No se pudo actualizar el perfil.", "error");
            }
        } catch (error) {
            console.error("Error al actualizar estudiante:", error);
            await Swal.fire("¡Error!", error.response?.data?.message || "Ha ocurrido un error al actualizar el perfil.", "error");
        }
    };

    const handleDelete = async () => {
        const result = await Swal.fire({
            title: '¿Eliminar perfil?',
            text: 'Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#dc3545',
        });

        if (!result.isConfirmed) return;

        try {
            const success = await deleteEstudiante(student._id);
            if (success) {
                navigate("/student", { state: { fromDetailStudent: false } });
            }
        } catch {
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

    const handleBackToStudents = () => {
        const queryParams = new URLSearchParams(location.search);
        const page = queryParams.get('page') || 1;

        navigate(`/student?page=${page}`, {
            state: { fromDetailStudent: true },
        });
    };

    return (
        <div className="dashboard-container">
            <div className="content-detail">
                <div className="perfil-container">
                    <div className="perfil-header">
                        <div className="perfil-header-row">
                            <div className="perfil-avatar">
                                <img
                                    src={getImageUrl(student.profileImage)}
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
                                <button className="btn-volver-atras" onClick={handleBackToStudents}>
                                    Volver atrás
                                </button>

                            </div>
                        </div>
                        <div className="perfil-actions-mobile">
                            {auth === 'admin' && (
                                <button className="btn-ver-cuotas" onClick={handleViewShares}>
                                    Ver Cuotas
                                </button>
                            )}
                            <button className="btn-volver-atras" onClick={handleBackToStudents}>
                                Volver atrás
                            </button>

                        </div>
                    </div>
                    <form className="perfil-formulario">
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
                        <div className="two-column-layout">
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
                                </div>
                            </div>
                            {auth === 'admin' && (
                                <div className="perfil-row archived-section">
                                    <h3>📎 Archivos Adjuntos</h3>
                                    {archivedFiles.length > 0 ? (
                                        <div className="archived-list">

                                            {archivedFiles.map((url, index) => (

                                                <div key={index} className="archived-item">
                                                    <a
                                                        href={url || '#'}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => !url && e.preventDefault()}
                                                        className="archived-link"
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
                        {auth === 'admin' && (
                            <div className="perfil-actions">
                                <button type="button" className="btn-editar-detail" onClick={handleShow}>Editar Perfil</button>
                                <button type="button" className="btn-eliminar-detail" onClick={handleDelete}>Eliminar Perfil</button>
                            </div>
                        )}
                    </form>
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
        </div>
    );
};

export default StudentDetail;
