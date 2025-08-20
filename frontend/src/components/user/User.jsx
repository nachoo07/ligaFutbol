import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, FormControl, Modal, Form } from 'react-bootstrap';
import './user.css';
import { UsersContext } from '../../context/user/UserContext';
import { FaBars, FaUsers, FaBell, FaAddressCard, FaRegListAlt, FaListUl, FaMoneyBill, FaChartBar, FaExchangeAlt, FaCalendarCheck, FaUserCog, FaCog, FaEnvelope, FaHome, FaArrowLeft, FaSearch, FaTrash, FaEdit } from 'react-icons/fa';
import { LuClipboardList } from 'react-icons/lu';

const User = () => {
    const { usuarios, obtenerUsuarios, addUsuarioAdmin, updateUsuarioAdmin, deleteUsuarioAdmin } = useContext(UsersContext);
    const navigate = useNavigate();
    const [show, setShow] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        mail: '',
        password: '',
        role: 'user',
        state: 'Activo'
    });

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
        { name: 'Detalle Diario', route: '/share/detail', icon: <FaListUl /> },
        { name: 'Volver Atrás', route: null, action: () => navigate(-1), icon: <FaArrowLeft /> },
    ];

    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (formData._id) {
            updateUsuarioAdmin(formData._id, {
                ...formData,
                state: formData.state === 'Activo'
            }).then(() => {
                obtenerUsuarios();
            });
        } else {
            addUsuarioAdmin({
                ...formData,
                state: formData.state === 'Activo'
            }).then(() => {
                obtenerUsuarios();
            });
        }
        handleClose();
    };

    const resetForm = () => {
        setFormData({
            name: '',
            mail: '',
            password: '',
            role: 'user',
            state: 'Activo'
        });
    };

    const handleShowAddUser = () => {
        resetForm();
        handleShow();
    };

    const handleEdit = (id) => {
        const usuario = usuarios.find((usuario) => usuario._id === id);
        if (usuario.fixed) {
            alert("Este usuario no puede ser editado.");
            return;
        }
        setFormData({
            _id: usuario._id,
            name: usuario.name,
            mail: usuario.mail,
            role: usuario.role,
            state: usuario.state ? 'Activo' : 'Inactivo'
        });
        handleShow();
    };

    const handleDelete = (id) => {
        const usuario = usuarios.find((usuario) => usuario._id === id);
        if (usuario.fixed) {
            alert("Este usuario no puede ser eliminado porque es un administrador protegido.");
            return;
        }
        deleteUsuarioAdmin(id).then(() => {
            obtenerUsuarios();
        });
    };

    const handleSearchChange = (e) => setSearchTerm(e.target.value);

    const filteredUsers = usuarios.filter((usuario) =>
        usuario.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        usuario.mail.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        if (!isLoading && usuarios.length === 0) {
            setIsLoading(true);
            obtenerUsuarios().finally(() => {
                setIsLoading(false);
            });
        }
    }, []);

    const getRoleName = (role) => {
        const isMobile = window.innerWidth <= 576; // Detectar si es tamaño móvil
        switch (role) {
            case 'admin':
                return isMobile ? 'Admin' : 'Administrador';
            case 'user':
                return isMobile ? 'User' : 'Usuario';
            default:
                return role;
        }
    };

    return (
        <div className="users-dashboard">
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
            <div className="users-content">
                <h1 className="users-title">Panel de Usuarios</h1>
                <div className="users-controls">
                    <div className="search-bar">
                        <FormControl
                            className="search-input"
                            placeholder="Buscar usuario..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                        />
                        <FaSearch className="search-icon" />
                    </div>
                    <Button className="users-add-btn" onClick={handleShowAddUser}>
                        Agregar Usuario
                    </Button>
                </div>
                {isLoading ? (
                    <p>Cargando usuarios...</p>
                ) : filteredUsers.length === 0 ? (
                    <p>No hay usuarios disponibles.</p>
                ) : (
                    <Table className="users-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Nombre</th>
                                <th>Mail</th>
                                <th>Rol</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((usuario, index) => (
                                <tr key={usuario._id || index}>
                                    <td>{index + 1}</td>
                                    <td>{usuario.name}</td>
                                    <td>{usuario.mail}</td>
                                    <td>{getRoleName(usuario.role)}</td>
                                    <td>{usuario.state ? 'Activo' : 'Inactivo'}</td>
                                    <td className="users-actions">
                                        <Button
                                            className="users-edit-btn"
                                            onClick={() => handleEdit(usuario._id)}
                                            disabled={usuario.fixed}
                                            title={usuario.fixed ? "Usuario protegido" : "Editar usuario"}
                                        >
                                            <span className="btn-text">Editar</span>
                                            <span className="btn-icon"><FaEdit /></span>
                                        </Button>
                                        <Button
                                            className="users-delete-btn"
                                            onClick={() => handleDelete(usuario._id)}
                                            disabled={usuario.fixed}
                                            title={usuario.fixed ? "Usuario protegido" : "Eliminar usuario"}
                                        >
                                            <span className="btn-text">Eliminar</span>
                                            <span className="btn-icon"><FaTrash /></span>
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )}
                <Modal show={show} onHide={handleClose} className='users-modal'>
                    <Modal.Header closeButton className='users-modal-header'>
                        <Modal.Title>{formData._id ? "Editar Usuario" : "Agregar Usuario"}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form onSubmit={handleSubmit}>
                            <Form.Group controlId="formName">
                                <Form.Label>Nombre</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    maxLength={50}
                                />
                            </Form.Group>
                            <Form.Group controlId="formMail">
                                <Form.Label>Mail</Form.Label>
                                <Form.Control
                                    type="email"
                                    name="mail"
                                    value={formData.mail}
                                    onChange={handleChange}
                                    required
                                    pattern="\S+@\S+\.\S+"
                                />
                            </Form.Group>
                            <Form.Group controlId="formPassword">
                                <Form.Label>Contraseña</Form.Label>
                                <Form.Control
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required={!formData._id}
                                    minLength={formData._id ? 0 : 6}
                                    maxLength={50}
                                    disabled={!!formData._id}
                                />
                            </Form.Group>
                            <Form.Group controlId="formState">
                                <Form.Label>Estado</Form.Label>
                                <Form.Control
                                    as="select"
                                    name="state"
                                    value={formData.state}
                                    onChange={handleChange}
                                    disabled={!formData._id}
                                >
                                    <option value="Activo">Activo</option>
                                    <option value="Inactivo">Inactivo</option>
                                </Form.Control>
                            </Form.Group>
                            <Form.Group controlId="formRole">
                                <Form.Label>Rol</Form.Label>
                                <Form.Control
                                    as="select"
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="user">Usuario</option>
                                    <option value="admin">Administrador</option>
                                </Form.Control>
                            </Form.Group>
                            <div className="users-modal-actions">
                                <Button type="submit" className="users-save-btn">Guardar</Button>
                            </div>
                        </Form>
                    </Modal.Body>
                </Modal>
            </div>
        </div>
    );
};

export default User;