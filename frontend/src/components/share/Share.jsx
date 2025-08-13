import React, { useState, useEffect, useContext, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { FaBars, FaAddressCard, FaRegListAlt, FaUsers, FaListUl, FaMoneyBill, FaChartBar, FaExchangeAlt, FaUserCog, FaEnvelope, FaHome, FaArrowLeft, FaEdit, FaMoneyBillWave, FaSearch, FaFileInvoice, FaSpinner } from 'react-icons/fa';
import { MdOutlineReadMore } from "react-icons/md";
import { LuClipboardList } from "react-icons/lu";
import { SharesContext } from "../../context/share/ShareContext";
import { StudentsContext } from "../../context/student/StudentContext";
import { LoginContext } from "../../context/login/LoginContext";
import { useEmail } from '../../context/email/EmailContext';
import { Button, Table, Form, Modal } from 'react-bootstrap';
import { MdDelete } from 'react-icons/md';
import MassiveShareForm from "../shareMassive/MassiveShareForm";
import Swal from 'sweetalert2';
import "./share.css";

const Share = () => {
    const { cuotas, obtenerCuotas, obtenerCuotasPorEstudiante, addCuota, updateCuota, deleteCuota, getAvailableShareNames, loading: loadingCuotas } = useContext(SharesContext);
    const { estudiantes, obtenerEstudiantes, loading: loadingStudents } = useContext(StudentsContext);
    const { auth } = useContext(LoginContext);
    const { sendReceiptEmail } = useEmail();
    const { studentId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [selectedStudent, setSelectedStudent] = useState(null);
    const [filteredStudentCuotas, setFilteredStudentCuotas] = useState([]);
    const [allStudentCuotas, setAllStudentCuotas] = useState([]);
    const [paymentName, setPaymentName] = useState("");
    const [amount, setAmount] = useState("");
    const [paymentDate, setPaymentDate] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("");
    const [paymentType, setPaymentType] = useState("");
    const [selectedCuota, setSelectedCuota] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [yearFilter, setYearFilter] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [sendingReceipt, setSendingReceipt] = useState(null);
    const [hasClearedStudent, setHasClearedStudent] = useState(false);
    const [showMassiveModal, setShowMassiveModal] = useState(false);
    const [showCuotaModal, setShowCuotaModal] = useState(false);
    const [modalTitle, setModalTitle] = useState("Crear Cuota");
    const [year, setYear] = useState("");
    const [availableNames, setAvailableNames] = useState([]);
    const studentsPerPage = 15;
    const [maxVisiblePages, setMaxVisiblePages] = useState(10);

    const today = new Date().toISOString().split("T")[0];
    const years = Array.from({ length: 5 }, (_, i) => 2025 + i);
    const initialDataLoaded = useRef(false);
    const hasFetchedStudentCuotas = useRef(false);

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
        { name: 'Detalle Diario', route: '/share/detail', icon: <FaListUl /> },
        {
            name: 'Volver Atrás',
            route: null,
            action: () => navigate(-1, { state: { fromDetailStudent: true } }),
            icon: <FaArrowLeft />
        },
    ];

    const userMenuItems = [];

    // Nuevo: función para ordenar cuotas
    const sortCuotas = (cuotas) => {
        const cuotaOrder = {
            'Primera Cuota': 1,
            'Segunda Cuota': 2,
            'Tercera Cuota': 3,
            // Agregar más si hay más cuotas posibles
        };

        return cuotas.sort((a, b) => {
            const [aCuota, aSemestre, aYear] = a.paymentName?.split(' - ') || ['', '', '0'];
            const [bCuota, bSemestre, bYear] = b.paymentName?.split(' - ') || ['', '', '0'];

            // Comparar por año
            const yearDiff = parseInt(aYear) - parseInt(bYear);
            if (yearDiff !== 0) return yearDiff;

            // Comparar por semestre
            const semestreA = parseInt(aSemestre.replace('Semestre ', '')) || 0;
            const semestreB = parseInt(bSemestre.replace('Semestre ', '')) || 0;
            const semestreDiff = semestreA - semestreB;
            if (semestreDiff !== 0) return semestreDiff;

            // Comparar por número de cuota
            const cuotaA = cuotaOrder[aCuota] || 999;
            const cuotaB = cuotaOrder[bCuota] || 999;
            return cuotaA - cuotaB;
        });
    };

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
        if (!initialDataLoaded.current && !loadingStudents) {
            const loadInitialData = async () => {
                try {
                    await Promise.all([obtenerEstudiantes(true), obtenerCuotas(true)]);
                    initialDataLoaded.current = true;
                } catch (error) {
                    console.error('Error en carga inicial:', error);
                    Swal.fire("¡Error!", error.response?.data?.message || "No se pudieron obtener los datos.", "error");
                }
            };
            loadInitialData();
        }
    }, [obtenerEstudiantes, obtenerCuotas, loadingStudents]);

    useEffect(() => {
        if (studentId && !hasFetchedStudentCuotas.current && estudiantes && estudiantes.length > 0) {
            const student = estudiantes.find((est) => est._id === studentId);
            if (student) {
                setSelectedStudent(student);
                const loadStudentCuotas = async () => {
                    try {
                        const studentCuotas = await obtenerCuotasPorEstudiante(studentId);
                        setAllStudentCuotas(studentCuotas);
                        setFilteredStudentCuotas(sortCuotas([...studentCuotas])); // Modificado: ordenar cuotas
                        hasFetchedStudentCuotas.current = true;
                    } catch (error) {
                        console.error('Error cargando cuotas del estudiante:', error);
                        Swal.fire("¡Error!", error.response?.data?.message || "No se pudieron obtener las cuotas del estudiante.", "error");
                    }
                };
                loadStudentCuotas();
            }
        }
    }, [studentId, estudiantes, obtenerCuotasPorEstudiante]);

    // Modificado: aplicar ordenamiento después de filtrar
    useEffect(() => {
        if (!yearFilter) {
            setFilteredStudentCuotas(sortCuotas([...allStudentCuotas]));
        } else {
            const filtered = allStudentCuotas.filter((cuota) => {
                const cuotaYear = parseInt(cuota.paymentName?.split(' - ')[2] || 0);
                return cuotaYear === parseInt(yearFilter);
            });
            setFilteredStudentCuotas(sortCuotas([...filtered]));
        }
    }, [yearFilter, allStudentCuotas]);

    useEffect(() => {
        if (year && showCuotaModal && !isEditing) {
            getAvailableShareNames(year).then((names) => {
                setAvailableNames(names);
                setPaymentName("");
            }).catch((error) => {
                console.error("Error al obtener nombres disponibles:", error);
                Swal.fire("¡Error!", error.response?.data?.message || "No se pudieron obtener los nombres disponibles.", "error");
            });
        } else if (!year || !showCuotaModal || isEditing) {
            setAvailableNames([]);
            setPaymentName(isEditing ? paymentName : "");
        }
    }, [year, showCuotaModal, isEditing, getAvailableShareNames]);

    useEffect(() => {
        return () => {
            setPaymentName("");
            setAmount("");
            setPaymentDate("");
            setPaymentMethod("");
            setPaymentType("");
            setSelectedCuota(null);
            setIsEditing(false);
            setShowCuotaModal(false);
            setYear("");
        };
    }, [studentId]);

    const handleSelectStudent = (student) => {
        setHasClearedStudent(false);
        setSelectedStudent(student);
        navigate(`/share/${student._id}`);
        obtenerCuotasPorEstudiante(student._id).then((studentCuotas) => {
            setAllStudentCuotas(studentCuotas);
            setFilteredStudentCuotas(sortCuotas([...studentCuotas])); // Modificado: ordenar cuotas
        }).catch((error) => {
            console.error('Error en handleSelectStudent:', error);
            Swal.fire("¡Error!", error.response?.data?.message || "No se pudieron obtener las cuotas del estudiante.", "error");
        });
    };

    const getStudentShareStatus = (studentId) => {
        const studentCuotas = Array.isArray(cuotas) ? cuotas.filter((cuota) => cuota.student?._id === studentId || cuota.student === studentId) : [];
        if (studentCuotas.length === 0) return "Sin cuotas";
        if (studentCuotas.some((cuota) => cuota.status === "Pendiente")) return "Pendiente";
        return "Pagada";
    };

    const filteredStudents = estudiantes ? estudiantes.filter((estudiante) => {
        const fullName = `${estudiante.name || ''} ${estudiante.lastName || ''}`.toLowerCase();
        const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || (estudiante.dni?.includes(searchTerm) || '');
        const status = getStudentShareStatus(estudiante._id);
        const matchesStatus = statusFilter === "" || status === statusFilter;
        return matchesSearch && matchesStatus;
    }) : [];

    const totalPages = Math.ceil(filteredStudents.length / studentsPerPage) || 1;
    const indexOfLastStudent = currentPage * studentsPerPage;
    const indexOfFirstStudent = indexOfLastStudent - studentsPerPage;
    const currentStudents = filteredStudents.slice(indexOfFirstStudent, indexOfLastStudent);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const handleBackToStudents = () => {
        setHasClearedStudent(true);
        setSelectedStudent(null);
        setYearFilter("");
        setAllStudentCuotas([]);
        setFilteredStudentCuotas([]);
        setPaymentName("");
        setAmount("");
        setPaymentDate("");
        setPaymentMethod("");
        setPaymentType("");
        setSelectedCuota(null);
        setIsEditing(false);
        setShowCuotaModal(false);
        setYear("");
        if (location.state?.fromStudentDetail) {
            navigate(`/detailstudent/${studentId}`);
        } else {
            navigate('/share');
        }
    };

    const handleSave = async () => {
        if (!selectedStudent || !selectedStudent._id) {
            Swal.fire("¡Advertencia!", "No se ha seleccionado un estudiante.", "warning");
            return;
        }

        if (!paymentName || !amount || !paymentDate || !paymentMethod || !paymentType) {
            Swal.fire("¡Advertencia!", "Por favor completa todos los campos obligatorios.", "warning");
            return;
        }

        const year = new Date(paymentDate).getFullYear();
        if (isNaN(year)) {
            Swal.fire("¡Advertencia!", "La fecha de pago ingresada no es válida.", "warning");
            return;
        }

        const cuotaData = {
            student: selectedStudent._id,
            paymentName,
            year,
            amount: parseFloat(amount),
            paymentDate,
            paymentMethod,
            paymentType,
        };

        try {
            if (selectedCuota) {
                await updateCuota({ ...cuotaData, _id: selectedCuota._id });
            } else {
                await addCuota(cuotaData);
            }

            const studentCuotas = await obtenerCuotasPorEstudiante(selectedStudent._id);
            setAllStudentCuotas(studentCuotas);
            setFilteredStudentCuotas(sortCuotas([...studentCuotas])); // Modificado: ordenar cuotas tras guardar
            window.dispatchEvent(new Event('shareUpdated'));
            Swal.fire("¡Éxito!", `Cuota ${selectedCuota ? 'actualizada' : 'agregada'} exitosamente para ${selectedStudent.name} ${selectedStudent.lastName}.`, "success");

            setPaymentName("");
            setAmount("");
            setPaymentDate("");
            setPaymentMethod("");
            setPaymentType("");
            setSelectedCuota(null);
            setIsEditing(false);
            setShowCuotaModal(false);
            setYear("");
        } catch (error) {
            console.error('Error en handleSave:', error);
            Swal.fire("¡Error!", `Error al ${selectedCuota ? 'actualizar' : 'agregar'} la cuota: ${error.response?.data?.message || error.message}`, "error");
        }
    };

    const handleEditClick = (cuota) => {
        setSelectedCuota(cuota);
        setPaymentName(cuota.paymentName);
        setAmount(cuota.amount || "");
        setPaymentDate(cuota.paymentDate ? formatDate(cuota.paymentDate) : "");
        setPaymentMethod(cuota.paymentMethod || "");
        setPaymentType(cuota.paymentType || "");
        setIsEditing(true);
        setModalTitle(cuota.paymentDate ? "Editar Cuota" : "Pagar Cuota");
        setYear(cuota.paymentName ? parseInt(cuota.paymentName.split(' - ')[2] || 0).toString() : "");
        setShowCuotaModal(true);
    };

    const handleCancelEdit = () => {
        setSelectedCuota(null);
        setPaymentName("");
        setAmount("");
        setPaymentDate("");
        setPaymentMethod("");
        setPaymentType("");
        setIsEditing(false);
        setShowCuotaModal(false);
        setYear("");
    };

    const handleCreateCuota = () => {
        setSelectedCuota(null);
        setPaymentName("");
        setAmount("");
        setPaymentDate("");
        setPaymentMethod("");
        setPaymentType("");
        setIsEditing(false);
        setModalTitle("Crear Cuota");
        setYear("");
        setShowCuotaModal(true);
    };

    const handleDelete = async (id) => {
        const confirmacion = await Swal.fire({
            title: "¿Estás seguro que deseas eliminar la cuota?",
            text: "Esta acción no se puede deshacer",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Sí, eliminar",
            cancelButtonText: "Cancelar",
        });

        if (confirmacion.isConfirmed) {
            try {
                await deleteCuota(id);
                const studentCuotas = await obtenerCuotasPorEstudiante(selectedStudent._id);
                setAllStudentCuotas(studentCuotas);
                setFilteredStudentCuotas(sortCuotas([...studentCuotas])); // Modificado: ordenar cuotas tras eliminar
                window.dispatchEvent(new Event('shareUpdated'));
                Swal.fire("¡Éxito!", "Cuota eliminada exitosamente.", "success");
            } catch (error) {
                console.error('Error en handleDelete:', error);
                Swal.fire("¡Error!", `Error al eliminar la cuota: ${error.response?.data?.message || error.message}`, "error");
            }
        }
    };

    const handleSendReceipt = async (cuota) => {
        if (!cuota.student?.mail) {
            Swal.fire("¡Advertencia!", "El estudiante no tiene un correo registrado.", "warning");
            return;
        }
        setSendingReceipt(cuota._id);
        try {
            await sendReceiptEmail(cuota.student, cuota);
            Swal.fire("¡Éxito!", "Comprobante enviado exitosamente.", "success");
        } catch (error) {
            console.error('Error en handleSendReceipt:', error);
            Swal.fire("¡Error!", `Error al enviar el comprobante: ${error.response?.data?.message || error.message}`, "error");
        } finally {
            setSendingReceipt(null);
        }
    };

    const formatDate = (dateString) => dateString ? new Date(dateString).toISOString().split("T")[0] : "";

    const getVisiblePageNumbers = () => {
        const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
    };

    return (
        <div className="dashboard-container-share">
            <div className={`sidebar ${isMenuOpen ? 'open' : 'closed'}`}>
                <div className="sidebar-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                    <FaBars />
                </div>
                {(auth === 'admin' ? adminMenuItems : userMenuItems).map((item, index) => (
                    <div
                        key={index}
                        className="sidebar-item"
                        onClick={() => {
                            if (item.action) {
                                item.action();
                            } else {
                                navigate(item.route);
                            }
                        }}
                    >
                        <span className="icon">{item.icon}</span>
                        <span className="text">{item.name}</span>
                    </div>
                ))}
            </div>
            <div className="content-share">
                {!selectedStudent ? (
                    <div className="students-view">
                        <h1 className="title">Panel de Cuotas</h1>
                        <div className="students-header">
                            <div className="search-bar">
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre, apellido o DNI..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <FaSearch className="search-icon" />
                            </div>
                            <div className="filter-actions">
                                <div className="state-filter">
                                    <label className="estado">Estado de Cuota:</label>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                    >
                                        <option value="">Todos</option>
                                        <option value="Pendiente">Pendiente</option>
                                        <option value="Pagada">Pagada</option>
                                        <option value="Sin cuotas">Sin cuotas</option>
                                    </select>
                                </div>
                                <Button className="btn-share-masive" onClick={() => setShowMassiveModal(true)}>Crear Cuota Masiva</Button>
                            </div>
                        </div>
                        {loadingStudents || loadingCuotas ? (
                            <p className="loading">Cargando datos...</p>
                        ) : (
                            <Table className="students-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Nombre</th>
                                        <th>Apellido</th>
                                        <th>DNI</th>
                                        <th className="estado-alumno">Estado del Alumno</th>
                                        <th>Estado de Cuotas</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="text-center">
                                                No hay estudiantes que coincidan con los filtros.
                                            </td>
                                        </tr>
                                    ) : (
                                        currentStudents.map((student, index) => (
                                            <tr key={student._id}>
                                                <td>{indexOfFirstStudent + index + 1}</td>
                                                <td>{student.name}</td>
                                                <td>{student.lastName}</td>
                                                <td>{student.dni || "-"}</td>
                                                <td className="estado-alumno">{student.status}</td>
                                                <td>{getStudentShareStatus(student._id)}</td>
                                                <td>
                                                    <Button
                                                        className="action-btn ver-cuotas-btn"
                                                        onClick={() => handleSelectStudent(student)}
                                                    >
                                                        <span className="ver-cuotas-text">Ver Cuotas</span>
                                                        <span className="ver-cuotas-icono">
                                                            <MdOutlineReadMore />
                                                        </span>
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </Table>
                        )}
                        {filteredStudents.length > 0 && (
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
                        )}
                        <MassiveShareForm show={showMassiveModal} onHide={() => setShowMassiveModal(false)} />
                    </div>
                ) : (
                    <div className="cuotas-view">
                        <h1 className="title">Cuotas de {selectedStudent.name} {selectedStudent.lastName}</h1>
                        <div className="filter-actions">
                            <div className="state-filter">
                                <label className="estado">Año:</label>
                                <select
                                    value={yearFilter}
                                    onChange={(e) => setYearFilter(e.target.value)}
                                >
                                    <option value="">Todos</option>
                                    {years.map((y) => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                            <Button className="create-cuota-btn" onClick={handleCreateCuota}>Crear Cuota</Button>
                            <Button className="back-btn" onClick={handleBackToStudents}>Volver</Button>
                        </div>
                        <Table className="cuotas-table">
                            <thead>
                                <tr>
                                    <th>Cuota</th>
                                    <th>Monto</th>
                                    <th className="metodo-pago">Método de Pago</th>
                                    <th className="tipo-de-pago">Tipo de Pago</th>
                                    <th>Fecha de Pago</th>
                                    <th>Estado</th>
                                    <th>Accion</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudentCuotas.length > 0 ? (
                                    filteredStudentCuotas.map((cuota) => {
                                        if (!cuota || !cuota._id) return null;
                                        return (
                                            <tr key={cuota._id} className={`state-${cuota.status?.toLowerCase()}`}>
                                                <td>{cuota.paymentName}</td>
                                                <td>{cuota.amount !== null && cuota.amount !== undefined ? new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(cuota.amount) : "-"}</td>
                                                <td className="metodo-pago">{cuota.paymentMethod || "-"}</td>
                                                <td className="tipo-de-pago">{cuota.paymentType || "-"}</td>
                                                <td>{cuota.paymentDate ? formatDate(cuota.paymentDate) : "-"}</td>
                                                <td>{cuota.status}</td>
                                                <td className="botones-acciones">
                                                    <Button
                                                        className="action-btn edit"
                                                        onClick={() => handleEditClick(cuota)}
                                                        title={cuota.paymentDate ? "Editar" : "Pagar"}
                                                    >
                                                        {cuota.paymentDate ? <FaEdit /> : <FaMoneyBillWave />}
                                                    </Button>
                                                    <Button
                                                        className="action-btn delete"
                                                        onClick={() => handleDelete(cuota._id)}
                                                        title="Eliminar"
                                                    >
                                                        <MdDelete />
                                                    </Button>
                                                    <Button
                                                        className="action-btn receipt"
                                                        onClick={() => handleSendReceipt(cuota)}
                                                        disabled={cuota.status !== "Pagado" || sendingReceipt === cuota._id}
                                                        title="Enviar Comprobante"
                                                    >
                                                        {sendingReceipt === cuota._id ? (
                                                            <FaSpinner className="spinner" />
                                                        ) : (
                                                            <FaFileInvoice />
                                                        )}
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="text-center">
                                            No hay cuotas registradas para este estudiante.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                        <Modal show={showCuotaModal} onHide={handleCancelEdit}>
                            <Modal.Header closeButton>
                                <Modal.Title>{modalTitle}</Modal.Title>
                            </Modal.Header>
                            <Modal.Body>
                                <Form>
                                    {!isEditing && (
                                        <Form.Group className="mb-3">
                                            <Form.Label>Año</Form.Label>
                                            <Form.Select
                                                value={year}
                                                onChange={(e) => setYear(e.target.value)}
                                            >
                                                <option value="">Selecciona un año</option>
                                                {years.map((y) => (
                                                    <option key={y} value={y}>{y}</option>
                                                ))}
                                            </Form.Select>
                                        </Form.Group>
                                    )}
                                    <Form.Group className="mb-3">
                                        <Form.Label>Nombre de la Cuota</Form.Label>
                                        {isEditing && !selectedCuota?.paymentDate ? (
                                            <Form.Control
                                                type="text"
                                                value={paymentName}
                                                readOnly
                                            />
                                        ) : isEditing ? (
                                            <Form.Control
                                                type="text"
                                                value={paymentName}
                                                onChange={(e) => setPaymentName(e.target.value)}
                                            />
                                        ) : (
                                            <Form.Select
                                                value={paymentName}
                                                onChange={(e) => setPaymentName(e.target.value)}
                                                disabled={!year}
                                            >
                                                <option value="">Selecciona un nombre</option>
                                                {availableNames.map((item) => (
                                                    <option key={item.name} value={item.name} disabled={item.isBlocked}>
                                                        {item.name}
                                                    </option>
                                                ))}
                                            </Form.Select>
                                        )}
                                    </Form.Group>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Monto</Form.Label>
                                        <Form.Control
                                            type="number"
                                            min="0"
                                            placeholder="Monto"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                        />
                                    </Form.Group>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Fecha de Pago</Form.Label>
                                        <Form.Control
                                            type="date"
                                            max={today}
                                            value={paymentDate}
                                            onChange={(e) => setPaymentDate(e.target.value)}
                                        />
                                    </Form.Group>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Método de Pago</Form.Label>
                                        <Form.Select
                                            value={paymentMethod}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                        >
                                            <option value="">Selecciona un método</option>
                                            <option value="Efectivo">Efectivo</option>
                                            <option value="Transferencia">Transferencia</option>
                                        </Form.Select>
                                    </Form.Group>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Tipo de Pago</Form.Label>
                                        <Form.Select
                                            value={paymentType}
                                            onChange={(e) => setPaymentType(e.target.value)}
                                        >
                                            <option value="">Selecciona un tipo</option>
                                            <option value="Pago Total">Pago Total</option>
                                            <option value="Pago Parcial">Pago Parcial</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Form>
                            </Modal.Body>
                            <Modal.Footer>
                                <Button variant="secondary" onClick={handleCancelEdit}>
                                    Cancelar
                                </Button>
                                <Button variant="primary" onClick={handleSave}>
                                    Guardar
                                </Button>
                            </Modal.Footer>
                        </Modal>
                        {loadingCuotas && <p className="loading">Cargando cuotas...</p>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Share;