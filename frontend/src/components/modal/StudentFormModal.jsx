import React, { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import './studentModal.css';

const StudentFormModal = ({ show, handleClose, handleSubmit, handleChange, formData }) => {
    const [uploading, setUploading] = useState(false);
    const [showAlert, setShowAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');

    const capitalizeWords = (str) => {
        if (!str) return '';
        return str
            .trim()
            .split(/\s+/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        const normalizedValue = capitalizeWords(value);
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
                setAlertMessage(`Formato no soportado para Imagen de Perfil: ${file.type}. Usa JPEG, PNG, GIF, HEIC, WEBP, BMP o TIFF.`);
                setShowAlert(true);
                setTimeout(() => setShowAlert(false), 3000);
                return;
            }
            handleChange({ target: { name, value: file } });
        } else if (name === 'archived') {
            const selectedFiles = Array.from(files);
            if (selectedFiles.length > 2) {
                setAlertMessage('Solo se permiten hasta 2 archivos adjuntos.');
                setShowAlert(true);
                setTimeout(() => setShowAlert(false), 3000);
                return;
            }
            const invalidFiles = selectedFiles.filter(file => !validImageTypes.includes(file.type));
            if (invalidFiles.length > 0) {
                setAlertMessage(`Formatos no soportados: ${invalidFiles.map(f => f.type).join(', ')}. Usa JPEG, PNG, GIF, HEIC, WEBP, BMP o TIFF.`);
                setShowAlert(true);
                setTimeout(() => setShowAlert(false), 3000);
                return;
            }
            handleChange({ target: { name, value: selectedFiles, archivedNames: selectedFiles.map(f => f.name) } });
        }
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

    const onSubmit = (e) => {
        e.preventDefault();
        if (!formData.dni || !formData.name || !formData.lastName || !formData.birthDate || !formData.address ||
            !formData.mail || !formData.motherName || !formData.fatherName || !formData.motherPhone ||
            !formData.fatherPhone || !formData.category || !formData.school || !formData.color ||
            !formData.sex || !formData.status) {
            setAlertMessage('Todos los campos obligatorios deben estar completos (DNI, Nombre, Apellido, Fecha de Nacimiento, Dirección, Email, Nombre y Teléfono de los Padres, Categoría, Escuela, Color, Sexo, Estado).');
            setShowAlert(true);
            setTimeout(() => setShowAlert(false), 3000);
            return;
        }
        setUploading(true);
        handleSubmit(e).finally(() => {
            setUploading(false);
            handleClose(); // Cerrar el modal solo después de guardar exitosamente
        });
    };

    const today = new Date().toISOString().split('T')[0];

    return (
        <Modal 
            show={show} 
            onHide={handleClose} 
            dialogClassName="student-modal" 
            backdrop="static" // No cerrar al hacer clic fuera
            keyboard={false}  // No cerrar con Escape
        >
            <Modal.Header closeButton>
                <Modal.Title>{formData._id ? "Editar Alumno" : "Agregar Alumno"}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {showAlert && (
                    <Alert variant="warning" onClose={() => setShowAlert(false)} dismissible className="custom-alert">
                        <Alert.Heading>¡Atención!</Alert.Heading>
                        <p>{alertMessage}</p>
                    </Alert>
                )}
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
                        <div>
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
                            <img
                                src={formData.profileImage instanceof File ? URL.createObjectURL(formData.profileImage) : formData.profileImage}
                                alt="Vista previa"
                                className="preview-img"
                                onError={(e) => (e.target.src = 'https://i.pinimg.com/736x/24/f2/25/24f22516ec47facdc2dc114f8c3de7db.jpg')}
                            />
                        )}
                    </Form.Group>
                    <Form.Group controlId="formArchived" className="full-width form-group-with-preview">
                        <div>
                            <Form.Label>Archivos Adjuntos (máx. 2)</Form.Label>
                            <Form.Control
                                type="file"
                                name="archived"
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
                                        <img
                                            src={file instanceof File ? URL.createObjectURL(file) : file}
                                            alt={`Archivo ${index + 1}`}
                                            className="preview-img"
                                            onError={(e) => (e.target.src = 'https://i.pinimg.com/736x/24/f2/25/24f22516ec47facdc2dc114f8c3de7db.jpg')}
                                        />
                                        <span>{formData.archivedNames?.[index] || (file instanceof File ? file.name : 'Archivo')}</span>
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