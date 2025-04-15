import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { FaBars, FaAddressCard, FaRegListAlt, FaUsers, FaMoneyBill, FaChartBar, FaExchangeAlt, FaUserCog, FaEnvelope, FaHome, FaArrowLeft, FaEdit, FaMoneyBillWave, FaSearch, FaFileInvoice, FaSpinner } from 'react-icons/fa';
import { MdOutlineReadMore } from "react-icons/md";
import { LuClipboardList } from "react-icons/lu";
import { SharesContext } from "../../context/share/ShareContext";
import { StudentsContext } from "../../context/student/StudentContext";
import { useEmail } from '../../context/email/EmailContext';
import { Button, Table, Form } from 'react-bootstrap';
import { MdDelete } from 'react-icons/md';
import MassiveShareForm from "../shareMassive/MassiveShareForm";
import Swal from 'sweetalert2';
import "./share.css";

const Share = () => {
    const { cuotas, obtenerCuotasPorEstudiante, addCuota, updateCuota, deleteCuota, obtenerCuotas, loading: loadingCuotas } = useContext(SharesContext);
    const { estudiantes: allStudents, obtenerEstudiantes } = useContext(StudentsContext);
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
    const [isCuotasLoaded, setIsCuotasLoaded] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [yearFilter, setYearFilter] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [sendingReceipt, setSendingReceipt] = useState(null);
    const [hasClearedStudent, setHasClearedStudent] = useState(false);
    const [showMassiveModal, setShowMassiveModal] = useState(false);
    const studentsPerPage = 15;
    const [maxVisiblePages, setMaxVisiblePages] = useState(10); // Ahora es un estado dinámico

    const years = Array.from({ length: 5 }, (_, i) => 2025 + i);

    // Detectar el tamaño de pantalla y ajustar maxVisiblePages
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth <= 576) {
                setMaxVisiblePages(5); // Móvil: máximo 5 páginas visibles
            } else {
                setMaxVisiblePages(10); // Computadora: máximo 10 páginas visibles
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!isCuotasLoaded) {
            obtenerCuotas().then(() => setIsCuotasLoaded(true)).catch((error) => {
                Swal.fire("¡Error!", error.response?.data?.message || "No se pudieron obtener las cuotas.", "error");
            });
            obtenerEstudiantes();
        }
    }, [isCuotasLoaded, obtenerCuotas, obtenerEstudiantes]);

    useEffect(() => {
        if (studentId && !hasClearedStudent) {
            const student = allStudents.find((est) => est._id === studentId) || { _id: studentId };
            setSelectedStudent(student);
            obtenerCuotasPorEstudiante(studentId).then((studentCuotas) => {
                setAllStudentCuotas(studentCuotas);
                setFilteredStudentCuotas(studentCuotas);
            }).catch((error) => {
                Swal.fire("¡Error!", error.response?.data?.message || "No se pudieron obtener las cuotas del estudiante.", "error");
            });
        }
    }, [studentId, allStudents, obtenerCuotasPorEstudiante, hasClearedStudent]);

    useEffect(() => {
        if (studentId && allStudents.length > 0 && !hasClearedStudent) {
            const student = allStudents.find((est) => est._id === studentId);
            if (student && student._id !== selectedStudent?._id) {
                setSelectedStudent(student);
            }
        }
    }, [allStudents, studentId, selectedStudent, hasClearedStudent]);

    useEffect(() => {
        if (!yearFilter) {
            setFilteredStudentCuotas(allStudentCuotas);
        } else {
            const filtered = allStudentCuotas.filter((cuota) => {
                const cuotaYear = parseInt(cuota.paymentName.split(' - ')[2]);
                return cuotaYear === parseInt(yearFilter);
            });
            setFilteredStudentCuotas(filtered);
        }
    }, [yearFilter, allStudentCuotas]);

    useEffect(() => {
        return () => {
            setPaymentName("");
            setAmount("");
            setPaymentDate("");
            setPaymentMethod("");
            setPaymentType("");
            setSelectedCuota(null);
            setIsEditing(false);
        };
    }, [studentId]);

    const handleSelectStudent = (student) => {
        setHasClearedStudent(false);
        setSelectedStudent(student);
        navigate(`/share/${student._id}`);
        obtenerCuotasPorEstudiante(student._id).then((studentCuotas) => {
            setAllStudentCuotas(studentCuotas);
            setFilteredStudentCuotas(studentCuotas);
        }).catch((error) => {
            Swal.fire("¡Error!", error.response?.data?.message || "No se pudieron obtener las cuotas del estudiante.", "error");
        });
    };

    const getStudentShareStatus = (studentId) => {
        const studentCuotas = Array.isArray(cuotas) ? cuotas.filter((cuota) => cuota.student?._id === studentId || cuota.student === studentId) : [];
        if (studentCuotas.length === 0) return "Sin cuotas";
        if (studentCuotas.some((cuota) => cuota.status === "Pendiente")) return "Pendiente";
        return "Pagada";
    };

    const filteredStudents = allStudents.filter((estudiante) => {
        const fullName = `${estudiante.name} ${estudiante.lastName}`.toLowerCase();
        const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || estudiante.dni?.includes(searchTerm);
        const status = getStudentShareStatus(estudiante._id);
        const matchesStatus = statusFilter === "" || status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const totalPages = Math.ceil(filteredStudents.length / studentsPerPage) || 1;
    const indexOfLastStudent = currentPage * studentsPerPage;
    const indexOfFirstStudent = indexOfLastStudent - studentsPerPage;
    const currentStudents = filteredStudents.slice(indexOfFirstStudent, indexOfLastStudent);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const handleGoBack = () => {
        if (studentId) {
            navigate(`/detailstudent/${studentId}`);
        } else {
            navigate(-1);
        }
    };

    const menuItems = [
        { name: 'Inicio', route: '/', icon: <FaHome /> },
        { name: 'Alumnos', route: '/student', icon: <FaUsers /> },
        { name: 'Cuotas', route: '/share', icon: <FaMoneyBill /> },
        { name: 'Reportes', route: '/report', icon: <FaChartBar /> },
        { name: 'Movimientos', route: '/motion', icon: <FaExchangeAlt /> },
        { name: 'Carnet', route: '/carnet', icon: <FaAddressCard /> },
        { name: 'Lista buena fe', route: '/list', icon: <FaRegListAlt /> },
        { name: 'Deudores', route: '/pendingshare', icon: <FaUserCog /> },
        { name: 'Usuarios', route: '/user', icon: <FaUserCog /> },
        { name: 'Envios de Mail', route: '/email', icon: <FaEnvelope /> },
        { name: 'Volver Atrás', route: null, action: () => navigate(-1), icon: <FaArrowLeft /> },
    ];

    const today = new Date().toISOString().split('T')[0];

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
        if (location.state?.fromStudentDetail) {
            navigate(`/detailstudent/${studentId}`);
        } else {
            navigate('/share');
        }
        setIsCuotasLoaded(false);
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
                await Promise.all([
                    obtenerCuotasPorEstudiante(selectedStudent._id),
                    obtenerCuotas(true),
                    obtenerEstudiantes(),
                ]).then(([studentCuotas]) => {
                    setAllStudentCuotas(studentCuotas);
                    setFilteredStudentCuotas(studentCuotas);
                    window.dispatchEvent(new Event('shareUpdated'));
                    Swal.fire("¡Éxito!", `Cuota actualizada exitosamente para ${selectedStudent.name} ${selectedStudent.lastName}.`, "success");
                });
            } else {
                await addCuota(cuotaData);
                await Promise.all([
                    obtenerCuotasPorEstudiante(selectedStudent._id),
                    obtenerCuotas(true),
                    obtenerEstudiantes(),
                ]).then(([studentCuotas]) => {
                    setAllStudentCuotas(studentCuotas);
                    setFilteredStudentCuotas(studentCuotas);
                    window.dispatchEvent(new Event('shareUpdated'));
                    Swal.fire("¡Éxito!", `Cuota agregada exitosamente para ${selectedStudent.name} ${selectedStudent.lastName}.`, "success");
                });
            }

            setPaymentName("");
            setAmount("");
            setPaymentDate("");
            setPaymentMethod("");
            setPaymentType("");
            setSelectedCuota(null);
            setIsEditing(false);
        } catch (error) {
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

        if (!cuota.paymentDate) {
            Swal.fire({
                title: "Completar Pago",
                text: "Por favor, completa los campos en el formulario de abajo para registrar el pago de la cuota.",
                icon: "info",
                timer: 3000,
                showConfirmButton: false,
            });
        }
    };

    const handleCancelEdit = () => {
        setSelectedCuota(null);
        setPaymentName("");
        setAmount("");
        setPaymentDate("");
        setPaymentMethod("");
        setPaymentType("");
        setIsEditing(false);
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
                await Promise.all([
                    obtenerCuotasPorEstudiante(selectedStudent._id),
                    obtenerCuotas(true),
                    obtenerEstudiantes(),
                ]).then(([studentCuotas]) => {
                    setAllStudentCuotas(studentCuotas);
                    setFilteredStudentCuotas(studentCuotas);
                    window.dispatchEvent(new Event('shareUpdated'));
                    Swal.fire("¡Éxito!", "Cuota eliminada exitosamente.", "success");
                });
            } catch (error) {
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
                        {loadingCuotas ? (
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
                                            <tr key={cuota._id} className={`state-${cuota.status.toLowerCase()}`}>
                                                <td>{cuota.paymentName}</td>
                                                <td>{cuota.amount ? new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(cuota.amount) : "-"}</td>
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
                        <div className={`cuota-form ${isEditing ? 'highlight-form' : ''}`}>
                            <div className="form-row">
                                <input
                                    type="text"
                                    placeholder="Nombre de la cuota"
                                    value={paymentName}
                                    onChange={(e) => setPaymentName(e.target.value)}
                                />
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="Monto"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                />
                                <input
                                    type="date"
                                    max={today}
                                    value={paymentDate}
                                    onChange={(e) => setPaymentDate(e.target.value)}
                                />
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                >
                                    <option value="">Método de Pago</option>
                                    <option value="Efectivo">Efectivo</option>
                                    <option value="Transferencia">Transferencia</option>
                                </select>
                                <select
                                    value={paymentType}
                                    onChange={(e) => setPaymentType(e.target.value)}
                                >
                                    <option value="">Tipo de Pago</option>
                                    <option value="Pago Total">Pago Total</option>
                                    <option value="Pago Parcial">Pago Parcial</option>
                                </select>
                            </div>
                            <div className="form-actions">
                                <Button className="save-btn" onClick={handleSave}>
                                    Guardar
                                </Button>
                                {isEditing && (
                                    <Button className="cancel-btn" onClick={handleCancelEdit}>
                                        Cancelar
                                    </Button>
                                )}
                            </div>
                        </div>
                        {loadingCuotas && <p className="loading">Cargando cuotas...</p>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Share;