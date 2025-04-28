import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { FaTimes } from 'react-icons/fa';
import Swal from 'sweetalert2';
import './studentModal.css';

const StudentFormModal = ({ show, handleClose, handleSubmit, handleChange, formData }) => {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    // Imagen por defecto
    const defaultImage = 'https://i.pinimg.com/736x/24/f2/25/24f22516ec47facdc2dc114f8c3de7db.jpg';

    // Inicializar archived y archivedNames cuando el modal se abre
    useEffect(() => {
        if (show && (!formData.archived || !Array.isArray(formData.archived))) {
            handleChange({
                target: {
                    name: 'archived',
                    value: [],
                    archivedNames: []
                }
            });
        }
    }, [show, handleChange]);

    // Función para transformar URLs de Cloudinary y añadir f_auto
    const getTransformedImageUrl = (url) => {
        if (!url || url === defaultImage) return defaultImage;

        if (typeof url === 'string' && url.startsWith('https://res.cloudinary.com')) {
            const urlParts = url.split('/upload/');
            if (urlParts.length < 2) return url;
            const transformedUrl = `${urlParts[0]}/upload/f_auto/${urlParts[1]}`;
            return `${transformedUrl}?t=${new Date().getTime()}`;
        }
        return url;
    };

    const capitalizeWords = (str) => {
        if (!str) return '';
        return str
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        const normalizedValue = value
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        handleChange({ target: { name, value: normalizedValue } });
    };

    const handleNumberInput = (e) => {
        const value = e.target.value.replace(/[^0-9]/g, '');
        handleChange({ target: { name: e.target.name, value } });
    };

    const handleFileChange = (e) => {
        const { name, files } = e.target;
        const validImageTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/heic', 'image/webp',
            'image/bmp', 'image/tiff'
        ];

        if (name === 'profileImage') {
            const file = files[0];
            if (file && !validImageTypes.includes(file.type)) {
                Swal.fire({
                    icon: 'error',
                    title: '¡Error!',
                    text: `Formato no soportado para Imagen de Perfil: ${file.type}. Usa JPEG, PNG, GIF, HEIC, WEBP, BMP o TIFF.`,
                    confirmButtonText: 'Aceptar',
                });
                return;
            }
            handleChange({ target: { name, value: file } });
        } else if (name === 'archived') {
            const selectedFiles = Array.from(files);
            const currentFiles = formData.archived || [];
            const currentFileCount = currentFiles.length;
            const newFileCount = selectedFiles.length;

            const invalidFiles = selectedFiles.filter(file => !validImageTypes.includes(file.type));
            if (invalidFiles.length > 0) {
                Swal.fire({
                    icon: 'error',
                    title: '¡Error!',
                    text: `Formatos no soportados: ${invalidFiles.map(f => f.type).join(', ')}. Usa JPEG, PNG, GIF, HEIC, WEBP, BMP o TIFF.`,
                    confirmButtonText: 'Aceptar',
                });
                return;
            }

            if (currentFileCount + newFileCount > 2) {
                Swal.fire({
                    icon: 'error',
                    title: '¡Error!',
                    text: 'Ya tienes 2 archivos. Elimina uno para agregar otro.',
                    confirmButtonText: 'Aceptar',
                });
                return;
            }

            const updatedFiles = [...currentFiles, ...selectedFiles];
            const updatedFileNames = updatedFiles.map(f => f.name);

            handleChange({
                target: {
                    name: 'archived',
                    value: updatedFiles,
                    archivedNames: updatedFileNames
                }
            });

            if (fileInputRef.current) {
                fileInputRef.current.value = null;
            }
        }
    };

    const handleRemoveFile = (index) => {
        const updatedFiles = formData.archived.filter((_, i) => i !== index);
        const updatedFileNames = formData.archivedNames?.filter((_, i) => i !== index);
        handleChange({
            target: {
                name: 'archived',
                value: updatedFiles,
                archivedNames: updatedFileNames
            }
        });
        if (fileInputRef.current) {
            fileInputRef.current.value = null;
        }
    };

    const handleRemoveProfileImage = () => {
        handleChange({ target: { name: 'profileImage', value: null } });
    };

    const handleDateChange = (e) => {
        const { value } = e.target;
        if (value) {
            const [year, month, day] = value.split('-');
            const formattedDate = `${day}/${month}/${year}`;
            handleChange({ target: { name: 'birthDate', value: formattedDate } });
        }
    };

    const dateForInput = formData.birthDate && typeof formData.birthDate === 'string'
        ? (() => {
            const [day, month, year] = formData.birthDate.split('/');
            return `${year}-${month}-${day}`;
        })()
        : '';

    // Validaciones adicionales
    const validateForm = () => {
        if (!formData.dni || !formData.name || !formData.lastName || !formData.birthDate || !formData.address ||
            !formData.mail || !formData.motherName || !formData.fatherName || !formData.motherPhone ||
            !formData.fatherPhone || !formData.category || !formData.school || !formData.color ||
            !formData.sex || !formData.status) {
            return 'Todos los campos obligatorios deben estar completos (DNI, Nombre, Apellido, Fecha de Nacimiento, Dirección, Email, Nombre y Teléfono de los Padres, Categoría, Escuela, Color, Sexo, Estado).';
        }

        // Validar formato de correo
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.mail)) {
            return 'El correo electrónico no tiene un formato válido.';
        }

        // Validar fecha de nacimiento
        const [day, month, year] = formData.birthDate.split('/');
        const birthDate = new Date(`${year}-${month}-${day}`);
        const today = new Date();
        if (isNaN(birthDate) || birthDate > today) {
            return 'La fecha de nacimiento no es válida o está en el futuro.';
        }

        // Validar longitud del DNI
        if (formData.dni.length < 8 || formData.dni.length > 10) {
            return 'El DNI debe tener entre 8 y 10 dígitos.';
        }

        // Validar números de teléfono
        if (formData.motherPhone.length < 10 || formData.motherPhone.length > 15 ||
            formData.fatherPhone.length < 10 || formData.fatherPhone.length > 15) {
            return 'Los números de teléfono deben tener entre 10 y 15 dígitos.';
        }

        return null;
    };

    const onSubmit = async (e) => {
        e.preventDefault();

        // Validaciones del frontend
        const validationError = validateForm();
        if (validationError) {
            Swal.fire({
                icon: 'error',
                title: '¡Error!',
                text: validationError,
                confirmButtonText: 'Aceptar',
            });
            return;
        }

        setUploading(true);
        try {
            await handleSubmit(e);
            handleClose();
        } catch (error) {
            // Procesar el mensaje de error del backend
            const rawMessage = error.response?.data?.message || 'Error al guardar el alumno. Por favor, intenta de nuevo.';
            let errorMessage = 'Ha ocurrido un error al guardar el estudiante: ';

            // Mapa de traducción para nombres de campos
            const fieldTranslations = {
                name: 'Nombre',
                lastName: 'Apellido',
                dni: 'DNI',
                birthDate: 'Fecha de Nacimiento',
                address: 'Dirección',
                motherName: 'Nombre de la Madre',
                fatherName: 'Nombre del Padre',
                motherPhone: 'Teléfono de la Madre',
                fatherPhone: 'Teléfono del Padre',
                category: 'Categoría',
                mail: 'Correo Electrónico',
                school: 'Escuela',
                sex: 'Sexo',
                status: 'Estado',
            };

            if (rawMessage.includes('duplicate key error')) {
                const match = rawMessage.match(/index: (\w+)_1/);
                const field = match ? match[1] : 'desconocido';
                const readableField = fieldTranslations[field] || field;
                errorMessage += `${readableField} duplicado.`;
            } else if (rawMessage.includes('validation failed')) {
                // Extraer los errores de validación
                const validationErrors = error.response?.data?.error?.errors || {};
                const errorMessages = Object.entries(validationErrors).map(([field, err]) => {
                    const readableField = fieldTranslations[field] || field;
                    if (err.kind === 'required') {
                        return `${readableField} es obligatorio.`;
                    } else if (err.kind === 'enum') {
                        return `${readableField} debe ser ${err.enumValues.map(v => `"${v}"`).join(' o ')}.`;
                    } else if (err.message) {
                        return `${readableField}: ${err.message}`;
                    }
                    return `${readableField}: Valor inválido.`;
                });
                errorMessage += errorMessages.join(' ');
            } else if (rawMessage.includes('Faltan campos obligatorios')) {
                errorMessage += 'Faltan campos obligatorios. Por favor, completa todos los campos requeridos.';
            } else if (rawMessage.includes('Se permiten máximo 2 archivos en archived')) {
                errorMessage += 'Solo se permiten máximo 2 archivos adjuntos.';
            } else if (rawMessage.includes('Error al subir profileImage')) {
                errorMessage += 'Hubo un problema al subir la imagen de perfil.';
            } else if (rawMessage.includes('Error al subir archived')) {
                errorMessage += 'Hubo un problema al subir los archivos adjuntos.';
            } else {
                errorMessage += rawMessage;
            }

            Swal.fire({
                icon: 'error',
                title: '¡Error!',
                text: errorMessage,
                confirmButtonText: 'Aceptar',
            });
        } finally {
            setUploading(false);
        }
    };

    const today = new Date().toISOString().split('T')[0];

    return (
        <Modal 
            show={show} 
            onHide={handleClose} 
            dialogClassName="student-modal" 
            backdrop="static"
            keyboard={false}
        >
            <Modal.Header closeButton>
                <Modal.Title>{formData._id ? "Editar Alumno" : "Agregar Alumno"}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form onSubmit={onSubmit} className="form-grid" encType="multipart/form-data">
                    <Form.Group controlId="formNombre">
                        <Form.Label>Nombre *</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Ej: Juan"
                            name="name"
                            value={formData.name || ''}
                            onChange={handleInputChange}
                            required
                            maxLength={50}
                        />
                    </Form.Group>
                    <Form.Group controlId="formLastName">
                        <Form.Label>Apellido *</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Ej: Pérez"
                            name="lastName"
                            value={formData.lastName || ''}
                            onChange={handleInputChange}
                            required
                            maxLength={50}
                        />
                    </Form.Group>
                    <Form.Group controlId="formDNI">
                        <Form.Label>DNI *</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="DNI"
                            name="dni"
                            value={formData.dni || ''}
                            onChange={handleNumberInput}
                            required
                            pattern="\d{8,10}"
                            title="DNI debe contener 8 a 10 dígitos."
                        />
                    </Form.Group>
                    <Form.Group controlId="formBirthDate">
                        <Form.Label>Fecha de Nacimiento *</Form.Label>
                        <Form.Control
                            type="date"
                            name="birthDate"
                            value={dateForInput}
                            onChange={handleDateChange}
                            max={today}
                            required
                        />
                    </Form.Group>
                    <Form.Group controlId="formDireccion">
                        <Form.Label>Dirección *</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Dirección"
                            name="address"
                            value={formData.address || ''}
                            onChange={handleInputChange}
                            required
                            maxLength={100}
                        />
                    </Form.Group>
                    <Form.Group controlId="formMail">
                        <Form.Label>Email *</Form.Label>
                        <Form.Control
                            type="email"
                            placeholder="Email"
                            name="mail"
                            value={formData.mail || ''}
                            onChange={handleChange}
                            required
                        />
                    </Form.Group>
                    <Form.Group controlId="formCategoria">
                        <Form.Label>Categoría *</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Categoría"
                            name="category"
                            value={formData.category || ''}
                            onChange={handleInputChange}
                            required
                            maxLength={50}
                        />
                    </Form.Group>
                    <Form.Group controlId="formSchool">
                        <Form.Label>Escuela *</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Escuela"
                            name="school"
                            value={formData.school || ''}
                            onChange={handleInputChange}
                            required
                            maxLength={50}
                        />
                    </Form.Group>
                    <Form.Group controlId="formColor">
                        <Form.Label>Color *</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Color"
                            name="color"
                            value={formData.color || ''}
                            onChange={handleInputChange}
                            required
                            maxLength={50}
                        />
                    </Form.Group>
                    <Form.Group controlId="formNombreMama">
                        <Form.Label>Nombre Mamá *</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Nombre Mamá"
                            name="motherName"
                            value={formData.motherName || ''}
                            onChange={handleInputChange}
                            required
                            maxLength={50}
                        />
                    </Form.Group>
                    <Form.Group controlId="formCelularMama">
                        <Form.Label>Celular Mamá *</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Celular Mamá"
                            name="motherPhone"
                            value={formData.motherPhone || ''}
                            onChange={handleNumberInput}
                            required
                            pattern="\d{10,15}"
                            title="El número debe tener entre 10 y 15 dígitos."
                        />
                    </Form.Group>
                    <Form.Group controlId="formNombrePapa">
                        <Form.Label>Nombre Papá *</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Nombre Papá"
                            name="fatherName"
                            value={formData.fatherName || ''}
                            onChange={handleInputChange}
                            required
                            maxLength={50}
                        />
                    </Form.Group>
                    <Form.Group controlId="formCelularPapa">
                        <Form.Label>Celular Papá *</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Celular Papá"
                            name="fatherPhone"
                            value={formData.fatherPhone || ''}
                            onChange={handleNumberInput}
                            required
                            pattern="\d{10,15}"
                            title="El número debe tener entre 10 y 15 dígitos."
                        />
                    </Form.Group>
                    <Form.Group controlId="formSex">
                        <Form.Label>Sexo *</Form.Label>
                        <Form.Select
                            name="sex"
                            value={formData.sex || ''}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Selecciona una opción</option>
                            <option value="Femenino">Femenino</option>
                            <option value="Masculino">Masculino</option>
                        </Form.Select>
                    </Form.Group>
                    <Form.Group controlId="formStatus">
                        <Form.Label>Estado *</Form.Label>
                        <Form.Select
                            name="status"
                            value={formData.status || 'Activo'}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Selecciona una opción</option>
                            <option value="Activo">Activo</option>
                            <option value="Inactivo">Inactivo</option>
                        </Form.Select>
                    </Form.Group>
                    <Form.Group controlId="formProfileImage" className="full-width form-group-with-preview">
                        <div className="profile-image-container">
                            <Form.Label>Imagen de Perfil</Form.Label>
                            <Form.Control
                                type="file"
                                name="profileImage"
                                onChange={handleFileChange}
                                disabled={uploading}
                                accept="image/jpeg,image/png,image/gif,image/heic,image/webp,image/bmp,image/tiff"
                            />
                            {uploading && <p className="uploading">Subiendo imagen...</p>}
                        </div>
                        {formData.profileImage && (
                            <div className="preview-container-profile">
                                <img
                                    src={
                                        formData.profileImage instanceof File
                                            ? URL.createObjectURL(formData.profileImage)
                                            : getTransformedImageUrl(formData.profileImage)
                                    }
                                    alt="Vista previa"
                                    className="preview-img"
                                    onError={(e) => (e.target.src = defaultImage)}
                                />
                                <button
                                    type="button"
                                    className="remove-btn"
                                    onClick={handleRemoveProfileImage}
                                    title="Eliminar imagen de perfil"
                                >
                                    <FaTimes />
                                </button>
                            </div>
                        )}
                    </Form.Group>
                    <Form.Group controlId="formArchived" className="full-width form-group-with-preview">
                        <div>
                            <Form.Label>Archivos Adjuntos (máx. 2)</Form.Label>
                            <Form.Control
                                type="file"
                                name="archived"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                disabled={uploading}
                                multiple
                                accept="image/jpeg,image/png,image/gif,image/heic,image/webp,image/bmp,image/tiff"
                            />
                            {uploading && <p className="uploading">Subiendo archivos...</p>}
                        </div>
                        {formData.archived && formData.archived.length > 0 && (
                            <div className="archived-preview">
                                {formData.archived.map((file, index) => (
                                    <div key={index} className="archived-item">
                                        <div className="preview-container-archived">
                                            <img
                                                src={
                                                    file instanceof File
                                                        ? URL.createObjectURL(file)
                                                        : getTransformedImageUrl(file)
                                                }
                                                alt={`Archivo ${index + 1}`}
                                                className="preview-img"
                                                onError={(e) => (e.target.src = defaultImage)}
                                            />
                                            <button
                                                type="button"
                                                className="remove-btn"
                                                onClick={() => handleRemoveFile(index)}
                                                title="Eliminar archivo"
                                            >
                                                <FaTimes />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Form.Group>
                    <Button type="submit" className="save-btn full-width" disabled={uploading}>
                        {uploading ? "Guardando..." : (formData._id ? "Actualizar" : "Guardar")}
                    </Button>
                </Form>
            </Modal.Body>
        </Modal>
    );
};

export default StudentFormModal;