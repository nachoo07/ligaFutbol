import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { FaTimes } from 'react-icons/fa';
import Swal from 'sweetalert2';
import './studentModal.css';

const StudentFormModal = ({ show, handleClose, handleSubmit, handleChange, formData, student }) => {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const defaultImage = 'https://i.pinimg.com/736x/24/f2/25/24f22516ec47facdc2dc114f8c3de7db.jpg';

    useEffect(() => {
        if (show) {
            // Inicializar archived y archivedNames si no están definidos o no son arreglos
            if (!Array.isArray(formData.archived)) {
                handleChange({
                    target: {
                        name: 'archived',
                        value: student?.archived || []
                    }
                });
            }
            if (!Array.isArray(formData.archivedNames)) {
                handleChange({
                    target: {
                        name: 'archivedNames',
                        value: student?.archivedNames || []
                    }
                });
            }
        }
    }, [show, formData.archived, formData.archivedNames, student, handleChange]);

    const getTransformedImageUrl = (url) => {
        if (!url || url === defaultImage) return defaultImage;
        if (typeof url === 'string' && url.startsWith('https://res.cloudinary.com')) {
            const urlParts = url.split('/upload/');
            if (urlParts.length < 2) return url;
            return `${urlParts[0]}/upload/f_auto/${urlParts[1]}`;
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

            const currentFiles = Array.isArray(formData.archived) ? [...formData.archived] : [];
            const currentFileNames = Array.isArray(formData.archivedNames) ? [...formData.archivedNames] : [];
            const currentFileCount = currentFiles.filter(item => item !== null && (item instanceof File || (typeof item === 'string' && item.startsWith('http')))).length;

            // Validar formatos de archivo
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

            // Validar límite de 2 archivos
            if (currentFileCount + selectedFiles.length > 2) {
                Swal.fire({
                    icon: 'error',
                    title: '¡Error!',
                    text: `Solo se permiten hasta 2 archivos adjuntos. Actualmente tienes ${currentFileCount} archivo(s).`,
                    confirmButtonText: 'Aceptar',
                });
                return;
            }

            // Combinar archivos nuevos con los existentes
            const updatedFiles = [...currentFiles];
            const updatedFileNames = [...currentFileNames];

            selectedFiles.forEach((file, index) => {
                // Añadir al final del arreglo o reemplazar null
                const targetIndex = updatedFiles.length < 2 ? updatedFiles.length : updatedFiles.findIndex(item => item === null);
                if (targetIndex !== -1) {
                    updatedFiles[targetIndex] = file;
                    updatedFileNames[targetIndex] = file.name || `Archivo ${targetIndex + 1}`;
                }
            });
            handleChange({
                target: {
                    name: 'archived',
                    value: updatedFiles.filter(item => item !== null), // Filtrar null para mantener el arreglo limpio
                    archivedNames: updatedFileNames.filter(name => name !== null)
                }
            });

            if (fileInputRef.current) {
                fileInputRef.current.value = null;
            }
        }
    };

    const handleRemoveFile = (index) => {
        const updatedFiles = Array.isArray(formData.archived) ? [...formData.archived] : [];
        const updatedFileNames = Array.isArray(formData.archivedNames) ? [...formData.archivedNames] : [];

        updatedFiles[index] = null; // Marcar como null para indicar eliminación
        updatedFileNames[index] = null; // Mantener sincronización

        // Filtrar elementos null
        const cleanedFiles = updatedFiles.filter(item => item !== null);
        const cleanedFileNames = updatedFileNames.filter(name => name !== null);

        handleChange({
            target: {
                name: 'archived',
                value: cleanedFiles,
                archivedNames: cleanedFileNames
            }
        });
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

    const validateForm = () => {
        if (!formData.dni || !formData.name || !formData.lastName || !formData.birthDate || !formData.address ||
            !formData.mail || !formData.category || !formData.school || !formData.sex) {
            return 'Todos los campos obligatorios deben estar completos (DNI, Nombre, Apellido, Fecha de Nacimiento, Dirección, Email, Categoría, Escuela, Sexo).';
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.mail)) {
            return 'El correo electrónico no tiene un formato válido.';
        }

        const [day, month, year] = formData.birthDate.split('/');
        const birthDate = new Date(`${year}-${month}-${day}`);
        const today = new Date();
        if (isNaN(birthDate) || birthDate > today) {
            return 'La fecha de nacimiento no es válida o está en el futuro.';
        }

        if (formData.dni.length < 8 || formData.dni.length > 10) {
            return 'El DNI debe tener entre 8 y 10 dígitos.';
        }

        if (formData.motherPhone && formData.motherPhone.trim() !== '' && (formData.motherPhone.length < 10 || formData.motherPhone.length > 15)) {
            return 'El número de teléfono de la madre debe tener entre 10 y 15 dígitos.';
        }

        if (formData.fatherPhone && formData.fatherPhone.trim() !== '' && (formData.fatherPhone.length < 10 || formData.fatherPhone.length > 15)) {
            return 'El número de teléfono del padre debe tener entre 10 y 15 dígitos.';
        }

        return null;
    };

    const onSubmit = async (e) => {
        e.preventDefault();

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
            const rawMessage = error.response?.data?.message || 'Error al guardar el alumno. Por favor, intenta de nuevo.';
            let errorMessage = 'Ha ocurrido un error al guardar el estudiante: ';

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
                        <Form.Label>Color</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Color"
                            name="color"
                            value={formData.color || ''}
                            onChange={handleInputChange}
                            maxLength={50}
                        />
                    </Form.Group>
                    <Form.Group controlId="formNombreMama">
                        <Form.Label>Nombre Mamá</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Nombre Mamá"
                            name="motherName"
                            value={formData.motherName || ''}
                            onChange={handleInputChange}
                            maxLength={50}
                        />
                    </Form.Group>
                    <Form.Group controlId="formCelularMama">
                        <Form.Label>Celular Mamá</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Celular Mamá"
                            name="motherPhone"
                            value={formData.motherPhone || ''}
                            onChange={handleNumberInput}
                            pattern="\d{10,15}"
                            title="El número debe tener entre 10 y 15 dígitos."
                        />
                    </Form.Group>
                    <Form.Group controlId="formNombrePapa">
                        <Form.Label>Nombre Papá</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Nombre Papá"
                            name="fatherName"
                            value={formData.fatherName || ''}
                            onChange={handleInputChange}
                            maxLength={50}
                        />
                    </Form.Group>
                    <Form.Group controlId="formCelularPapa">
                        <Form.Label>Celular Papá</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Celular Papá"
                            name="fatherPhone"
                            value={formData.fatherPhone || ''}
                            onChange={handleNumberInput}
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
                        <Form.Label>Estado</Form.Label>
                        <Form.Select
                            name="status"
                            value={formData.status || 'Activo'}
                            onChange={handleChange}
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
                        {Array.isArray(formData.archived) && formData.archived.length > 0 ? (
                            <div className="archived-preview">
                                {formData.archived.map((file, index) => (
                                    file && (
                                        <div key={index} className="archived-item">
                                            <div className="preview-container-archived">
                                                <img
                                                    src={
                                                        file instanceof File
                                                            ? URL.createObjectURL(file)
                                                            : getTransformedImageUrl(file)
                                                    }
                                                    alt={formData.archivedNames[index] || `Archivo ${index + 1}`}
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
                                            <span>{formData.archivedNames[index] || `Archivo ${index + 1}`}</span>
                                        </div>
                                    )
                                ))}
                            </div>
                        ) : (
                            <p className="no-files">No hay archivos adjuntos seleccionados.</p>
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