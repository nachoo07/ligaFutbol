import { useState, useContext, useEffect } from 'react';
import { Table, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaSearch, FaBars, FaUsers, FaAddressCard, FaMoneyBill, FaRegListAlt, FaChartBar, FaExchangeAlt, FaUserCog, FaCog, FaEnvelope, FaHome, FaArrowLeft, FaFileExcel } from 'react-icons/fa';
import { LuClipboardList } from "react-icons/lu";
import { MdOutlineReadMore } from "react-icons/md";
import { StudentsContext } from '../../context/student/StudentContext';
import { LoginContext } from '../../context/login/LoginContext';
import StudentFormModal from '../modal/StudentFormModal';
import './tableStudent.css';

const TableStudent = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { estudiantes, obtenerEstudiantes, addEstudiante, importStudents } = useContext(StudentsContext);
    const { auth } = useContext(LoginContext);

    const [show, setShow] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
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
        archived: null,
        school: '',
        color: '',
        sex: '',
        status: 'Activo'
    });
    const [showAlert, setShowAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const studentsPerPage = 15;
    const [maxVisiblePages, setMaxVisiblePages] = useState(10);
    const [isMenuOpen, setIsMenuOpen] = useState(true);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth <= 576) {
                setMaxVisiblePages(5);
            } else {
                setMaxVisiblePages(10);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const currentPath = location.pathname;
        if (currentPath !== '/student' && !currentPath.startsWith('/detailstudent')) {
            localStorage.removeItem('studentSearchTerm');
            localStorage.removeItem('studentFilterCategory');
            localStorage.removeItem('studentFilterStatus');
            localStorage.removeItem('studentCurrentPage');
        }
    }, [location.pathname]);

    useEffect(() => {
        setSearchTerm('');
        setFilterCategory('');
        setFilterStatus('');
        setCurrentPage(1);
        obtenerEstudiantes();
    }, []);

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
        { name: 'Volver Atrás', route: null, action: () => navigate(-1), icon: <FaArrowLeft /> },
    ];

    const userMenuItems = [
        { name: 'Inicio', route: '/', icon: <FaHome /> },
    ];

    const removeAccents = (str) => {
        return str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    };

    const filteredStudents = estudiantes.filter((estudiante) => {
        const fullName = removeAccents(`${estudiante.name} ${estudiante.lastName}`);
        const dni = removeAccents(estudiante.dni || '');
        const search = removeAccents(searchTerm);
        const matchesSearch = fullName.includes(search) || dni.includes(search);
        const matchesCategory = filterCategory === '' || estudiante.category === filterCategory;
        const matchesStatus = filterStatus === '' || estudiante.status === filterStatus;
        return matchesSearch && matchesCategory && matchesStatus;
    });

    const totalPages = Math.ceil(filteredStudents.length / studentsPerPage) || 1;

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage]);

    const indexOfLastStudent = currentPage * studentsPerPage;
    const indexOfFirstStudent = indexOfLastStudent - studentsPerPage;
    const currentStudents = filteredStudents.slice(indexOfFirstStudent, indexOfLastStudent);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const handleSearchChange = (e) => setSearchTerm(e.target.value);

    const handleShow = () => {
        setFormData({
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
            archived: null,
            school: '',
            color: '',
            sex: '',
            status: 'Activo'
        });
        setShow(true);
    };

    const handleClose = () => setShow(false);

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (files) {
            setFormData({ ...formData, [name]: files[0] });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await addEstudiante(formData);
            // No mostrar alerta aquí, el modal manejará el éxito
        } catch (error) {
            // Propagar el error al modal
            throw error;
        }
    };

    const handleImportExcel = async (e) => {
        const file = e.target.files[0];
        if (!file) {
            setAlertMessage("Por favor selecciona un archivo Excel");
            setShowAlert(true);
            return;
        }

        const validTypes = [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];
        if (!validTypes.includes(file.type)) {
            setAlertMessage("El archivo debe ser un Excel (.xlsx o .xls)");
            setShowAlert(true);
            return;
        }

        setIsImporting(true);
        try {
            await importStudents(file);
        } catch (error) {
            setAlertMessage(error.response?.data?.message || "Error al importar el archivo Excel");
            setShowAlert(true);
        } finally {
            setIsImporting(false);
            e.target.value = null;
        }
    };

    const capitalizeInitials = (text) => {
        if (!text) return '';
        return text
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

    const getVisiblePageNumbers = () => {
        const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
    };

    return (
        <div className="dashboard-container-student">
            <div className={`sidebar ${isMenuOpen ? 'open' : 'closed'}`}>
                <div className="sidebar-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                    <FaBars />
                </div>
                {(auth === 'admin' ? adminMenuItems : userMenuItems).map((item, index) => (
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
            <div className="content-student">
                {showAlert && (
                    <Alert
                        variant="warning"
                        onClose={() => setShowAlert(false)}
                        dismissible
                        className="custom-alert"
                    >
                        <Alert.Heading>¡Atención!</Alert.Heading>
                        <p>{alertMessage}</p>
                    </Alert>
                )}
                <div className="students-view">
                    <h1 className="title">Panel de Alumnos</h1>
                    <div className="students-header">
                        <div className="search-bar">
                            <input
                                type="text"
                                placeholder="Buscar por nombre, apellido o DNI..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                            />
                            <FaSearch className="search-icon" />
                        </div>
                        <div className="state-filter">
                            <label htmlFor="filter-status">Estado:</label>
                            <select
                                id="filter-status"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                <option value="">Todos</option>
                                <option value="Activo">Activo</option>
                                <option value="Inactivo">Inactivo</option>
                            </select>
                        </div>
                        {auth === 'admin' && (
                            <div className="filter-actions">
                                <div className="actions">
                                    <Button className="add-btn" onClick={handleShow}>Agregar Alumno</Button>
                                    <label htmlFor="import-excel" className="btn btn-success import-btn">
                                        <FaFileExcel style={{ marginRight: '5px' }} /> Importar Excel
                                    </label>
                                    <input
                                        type="file"
                                        id="import-excel"
                                        accept=".xlsx, .xls"
                                        style={{ display: 'none' }}
                                        onChange={handleImportExcel}
                                        disabled={isImporting}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                    <Table className="students-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Nombre</th>
                                <th>Apellido</th>
                                <th>DNI</th>
                                <th className="categoria">Categoría</th>
                                <th className="categoria">Escuela</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentStudents.length > 0 ? (
                                currentStudents.map((estudiante, index) => (
                                    <tr key={estudiante._id}>
                                        <td>{indexOfFirstStudent + index + 1}</td>
                                        <td>{capitalizeInitials(estudiante.name)}</td>
                                        <td>{capitalizeInitials(estudiante.lastName)}</td>
                                        <td>{estudiante.dni}</td>
                                        <td className="categoria">{estudiante.category}</td>
                                        <td className="categoria">{estudiante.school}</td>
                                        <td>{estudiante.status}</td>
                                        <td>
                                            <Button
                                                className="action-btn ver-mas-btn"
                                                onClick={() => navigate(`/detailstudent/${estudiante._id}`)}
                                            >
                                                <span className="ver-mas-text">Ver Más</span>
                                                <span className="ver-mas-icon">
                                                    <MdOutlineReadMore />
                                                </span>
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="9" className="text-center">
                                        No hay alumnos registrados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                    <div className="pagination">
                        <Button
                            disabled={currentPage === 1}
                            onClick={() => paginate(currentPage - 1)}
                            className="pagination-btn"
                        >
                            «
                        </Button>
                        {getVisiblePageNumbers().map((number) => (
                            <Button
                                key={number}
                                className={`pagination-btn ${currentPage === number ? 'active' : ''}`}
                                onClick={() => paginate(number)}
                            >
                                {number}
                            </Button>
                        ))}
                        <Button
                            disabled={currentPage === totalPages}
                            onClick={() => paginate(currentPage + 1)}
                            className="pagination-btn"
                        >
                            »
                        </Button>
                    </div>
                </div>
                {auth === 'admin' && (
                    <StudentFormModal
                        show={show}
                        handleClose={handleClose}
                        handleSubmit={handleSubmit}
                        handleChange={handleChange}
                        formData={formData}
                    />
                )}
                {isImporting && (
                    <div className="loading-overlay">
                        <div className="loading-spinner">
                            <Spinner animation="border" variant="primary" />
                            <p>Importando archivo Excel...</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TableStudent;