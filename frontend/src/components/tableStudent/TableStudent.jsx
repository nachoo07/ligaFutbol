import React, { useState, useContext, useEffect, useMemo, useRef } from 'react';
import { Table, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaSearch, FaFileExcel } from 'react-icons/fa';
import { MdOutlineReadMore } from "react-icons/md";
import { StudentsContext } from '../../context/student/StudentContext';
import { LoginContext } from '../../context/login/LoginContext';
import StudentFormModal from '../modal/StudentFormModal';
import Sidebar from '../sidebar/Sidebar';
import Swal from 'sweetalert2';
import './tableStudent.css';

// Hook personalizado para debounce
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

const TableStudent = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { estudiantes, obtenerEstudiantes, addEstudiante, importStudents, loading } = useContext(StudentsContext);
    const { auth } = useContext(LoginContext);

    const [show, setShow] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
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
        archived: [],
        archivedNames: [],
        school: '',
        color: '',
        sex: '',
        status: 'Activo'
    });
    const [showAlert, setShowAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [alertVariant, setAlertVariant] = useState('warning');
    const [isImporting, setIsImporting] = useState(false);
    const studentsPerPage = 15;
    const [maxVisiblePages, setMaxVisiblePages] = useState(10);
    const [isMenuOpen, setIsMenuOpen] = useState(true);
    const isMounted = useRef(false);

    // Carga inicial de estudiantes y restauración de página
    useEffect(() => {
        if (isMounted.current || loading) return;
        isMounted.current = true;
        const queryParams = new URLSearchParams(location.search);
        let page = parseInt(queryParams.get('page')) || 1;
        if (location.pathname === '/student' && location.state?.fromDetailStudent) {
            page = location.state.currentPage || page;
            setSearchTerm(location.state.searchTerm || '');
            setFilterStatus(location.state.filterStatus || '');
        }
        setCurrentPage(page);
        obtenerEstudiantes().catch((error) => {
            console.error('[DEBUG] Error al cargar estudiantes:', error);
            Swal.fire('¡Error!', 'No se pudieron cargar los estudiantes.', 'error');
        });
    }, [obtenerEstudiantes, loading, location]);

    // Ajustar paginación responsiva
    useEffect(() => {
        const handleResize = () => {
            setMaxVisiblePages(window.innerWidth <= 576 ? 5 : 10);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const removeAccents = (str) => {
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    };

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    // Filtrado optimizado
    const filteredStudents = useMemo(() => {
        return estudiantes.filter((estudiante) => {
            const fullName = removeAccents(`${estudiante.name} ${estudiante.lastName}`);
            const dni = removeAccents(estudiante.dni || '');
            const search = removeAccents(debouncedSearchTerm);
            const matchesSearch = fullName.includes(search) || dni.includes(search);
            const matchesStatus = filterStatus === '' || estudiante.status === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [estudiantes, debouncedSearchTerm, filterStatus]);

    const totalPages = Math.ceil(filteredStudents.length / studentsPerPage) || 1;

    // Ajustar página actual si excede el total
    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage]);

    const indexOfLastStudent = currentPage * studentsPerPage;
    const indexOfFirstStudent = indexOfLastStudent - studentsPerPage;
    const currentStudents = filteredStudents.slice(indexOfFirstStudent, indexOfLastStudent);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

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
            archived: [],
            archivedNames: [],
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
            setFormData(prev => ({
                ...prev,
                [name]: name === 'archived' ? Array.from(files) : files[0],
                ...(name === 'archived' && { archivedNames: Array.from(files).map(f => f.name) })
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await addEstudiante(formData);
            Swal.fire('¡Éxito!', 'Estudiante agregado correctamente.', 'success');
            handleClose();
            obtenerEstudiantes();
        } catch (error) {
            console.error('[DEBUG] Error en handleSubmit:', error);
            Swal.fire('¡Error!', error.response?.data?.message || 'No se pudo agregar el estudiante.', 'error');
        }
    };

    const handleImportExcel = async (e) => {
        const file = e.target.files[0];
        if (!file) {
            setAlertMessage('Por favor selecciona un archivo Excel.');
            setAlertVariant('warning');
            setShowAlert(true);
            return;
        }
        const validTypes = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        if (!validTypes.includes(file.type)) {
            setAlertMessage('El archivo debe ser un Excel (.xlsx o .xls).');
            setAlertVariant('warning');
            setShowAlert(true);
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setAlertMessage('El archivo excede el tamaño máximo de 5MB.');
            setAlertVariant('warning');
            setShowAlert(true);
            return;
        }
        setIsImporting(true);
        try {
            await importStudents(file);
            Swal.fire('¡Éxito!', 'Estudiantes importados correctamente.', 'success');
            obtenerEstudiantes();
        } catch (error) {
            setAlertMessage(error.response?.data?.message || 'Error al importar el archivo Excel.');
            setAlertVariant('danger');
            setShowAlert(true);
        } finally {
            setIsImporting(false);
            e.target.value = null;
        }
    };

    const capitalizeInitials = (text) => {
        if (!text) return '';
        return text.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    };

    const getVisiblePageNumbers = () => {
        const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
    };

    return (
        <div className="dashboard-container-student">
            <Sidebar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} auth={auth} />
            <div className="content-student">
                {showAlert && (
                    <Alert variant={alertVariant} onClose={() => setShowAlert(false)} dismissible className="custom-alert">
                        <Alert.Heading>{alertVariant === 'warning' ? '¡Atención!' : '¡Error!'}</Alert.Heading>
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
                                aria-label="Buscar estudiantes"
                            />
                            <FaSearch className="search-icon" />
                        </div>
                        <div className="state-filter">
                            <label htmlFor="filter-status">Estado:</label>
                            <select
                                id="filter-status"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                aria-label="Filtrar por estado"
                            >
                                <option value="">Todos</option>
                                <option value="Activo">Activo</option>
                                <option value="Inactivo">Inactivo</option>
                            </select>
                        </div>
                        {auth === 'admin' && (
                            <div className="filter-actions">
                                <div className="actions">
                                    <Button className="add-btn-student" onClick={handleShow} aria-label="Agregar nuevo estudiante">
                                        Agregar Alumno
                                    </Button>
                                    <label htmlFor="import-excel" className="import-btn">
                                        <FaFileExcel style={{ marginRight: '5px' }} /> Importar Excel
                                    </label>
                                    <input
                                        type="file"
                                        id="import-excel"
                                        accept=".xlsx, .xls"
                                        style={{ display: 'none' }}
                                        onChange={handleImportExcel}
                                        disabled={isImporting}
                                        aria-label="Importar archivo Excel"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                    {loading ? (
                        <div className="loading-overlay">
                            <Spinner animation="border" variant="primary" />
                            <p>Cargando estudiantes...</p>
                        </div>
                    ) : (
                        <>
                            <Table className="students-table" aria-label="Tabla de estudiantes">
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
                                                <td>{estudiante.dni || '-'}</td>
                                                <td className="categoria">{estudiante.category || '-'}</td>
                                                <td className="categoria">{estudiante.school || '-'}</td>
                                                <td>{estudiante.status}</td>
                                                <td>
                                                    <Button
                                                        className="action-btn ver-mas-btn"
                                                        onClick={() => {
                                                            navigate(`/detailstudent/${estudiante._id}?page=${currentPage}`, {
                                                                state: {
                                                                    fromDetailStudent: true,
                                                                    currentPage,
                                                                    searchTerm,
                                                                    filterStatus
                                                                }
                                                            });
                                                        }}
                                                        aria-label={`Ver detalles de ${estudiante.name} ${estudiante.lastName}`}
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
                                            <td colSpan="8" className="text-center">
                                                No hay alumnos registrados.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                            {filteredStudents.length > 0 && (
                                <div className="pagination">
                                    <Button
                                        disabled={currentPage === 1}
                                        onClick={() => paginate(currentPage - 1)}
                                        className="pagination-btn"
                                        aria-label="Página anterior"
                                    >
                                        «
                                    </Button>
                                    {getVisiblePageNumbers().map((number) => (
                                        <Button
                                            key={number}
                                            className={`pagination-btn ${currentPage === number ? 'active' : ''}`}
                                            onClick={() => paginate(number)}
                                            aria-label={`Página ${number}`}
                                        >
                                            {number}
                                        </Button>
                                    ))}
                                    <Button
                                        disabled={currentPage === totalPages}
                                        onClick={() => paginate(currentPage + 1)}
                                        className="pagination-btn"
                                        aria-label="Página siguiente"
                                    >
                                        »
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                    {auth === 'admin' && (
                        <StudentFormModal
                            show={show}
                            handleClose={handleClose}
                            handleSubmit={handleSubmit}
                            handleChange={handleChange}
                            formData={formData}
                            student={null}
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
        </div>
    );
};

export default TableStudent;