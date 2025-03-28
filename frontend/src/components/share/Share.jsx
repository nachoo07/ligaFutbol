import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { FaBars, FaUsers, FaBell, FaMoneyBill, FaChartBar, FaExchangeAlt, FaCalendarCheck, FaUserCog, FaCog, FaEnvelope, FaHome, FaArrowLeft, FaEdit, FaTrash, FaMoneyBillWave, FaSearch, FaFileInvoice } from 'react-icons/fa';
import { SharesContext } from "../../context/share/ShareContext";
import { StudentsContext } from "../../context/student/StudentContext"; // Importar el contexto de estudiantes
import { useEmail } from '../../context/email/EmailContext';
import { Button, Table, Alert, Form } from 'react-bootstrap';
import "./share.css";

const Share = () => {
    const { cuotas, obtenerCuotasPorEstudiante, addCuota, updateCuota, deleteCuota, obtenerCuotas, loading: loadingCuotas } = useContext(SharesContext);
    const { estudiantes: allStudents, obtenerEstudiantes } = useContext(StudentsContext); // Usar estudiantes del contexto
    const { sendReceiptEmail } = useEmail();
    const { studentId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [selectedStudent, setSelectedStudent] = useState(null);
    const [paymentName, setPaymentName] = useState("");
    const [amount, setAmount] = useState("");
    const [paymentDate, setPaymentDate] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("");
    const [selectedCuota, setSelectedCuota] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [showAlert, setShowAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState("");
    const [isMenuOpen, setIsMenuOpen] = useState(true);
    const [isCuotasLoaded, setIsCuotasLoaded] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [sendingReceipt, setSendingReceipt] = useState(null);
    const [hasClearedStudent, setHasClearedStudent] = useState(false);
    const studentsPerPage = 10;

    // Cargar estudiantes y cuotas al montar el componente
    useEffect(() => {
        if (!isCuotasLoaded) {
            obtenerCuotas().then(() => setIsCuotasLoaded(true));
            obtenerEstudiantes(); // Asegurarse de cargar los estudiantes
        }
    }, [isCuotasLoaded, obtenerCuotas, obtenerEstudiantes]);

    // Cargar cuotas del estudiante seleccionado
    useEffect(() => {
        if (studentId && !hasClearedStudent) {
            const student = allStudents.find((est) => est._id === studentId) || { _id: studentId };
            setSelectedStudent(student);
            obtenerCuotasPorEstudiante(studentId);
        }
    }, [studentId, allStudents, obtenerCuotasPorEstudiante, hasClearedStudent]);

    // Actualizar estudiante seleccionado
    useEffect(() => {
        if (studentId && allStudents.length > 0 && !hasClearedStudent) {
            const student = allStudents.find((est) => est._id === studentId);
            if (student && student._id !== selectedStudent?._id) {
                setSelectedStudent(student);
            }
        }
    }, [allStudents, studentId, selectedStudent, hasClearedStudent]);

    const handleSelectStudent = (student) => {
        setHasClearedStudent(false);
        setSelectedStudent(student);
        navigate(`/share/${student._id}`);
        obtenerCuotasPorEstudiante(student._id);
    };

    const getStudentShareStatus = (studentId) => {
        const studentCuotas = Array.isArray(cuotas) ? cuotas.filter((cuota) => cuota.student?._id === studentId || cuota.student === studentId) : [];
        if (studentCuotas.length === 0) return "Sin cuotas";
        if (studentCuotas.some((cuota) => cuota.status === "Pendiente")) return "Pendiente";
        return "Pagada";
    };

    // Filtrar estudiantes por nombre, apellido, DNI y estado de cuota
    const filteredStudents = allStudents.filter((estudiante) => {
        const fullName = `${estudiante.name} ${estudiante.lastName}`.toLowerCase();
        const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || estudiante.dni?.includes(searchTerm);
        const status = getStudentShareStatus(estudiante._id);
        const matchesStatus = statusFilter === "" || status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const filteredCuotas = Array.isArray(cuotas) ? cuotas.filter((cuota) =>
        cuota.student?._id === selectedStudent?._id || cuota.student === selectedStudent?._id
    ) : [];

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
        { name: 'Notificaciones', route: '/notification', icon: <FaBell /> },
        { name: 'Cuotas', route: '/share', icon: <FaMoneyBill /> },
        { name: 'Reportes', route: '/report', icon: <FaChartBar /> },
        { name: 'Movimientos', route: '/motion', icon: <FaExchangeAlt /> },
        { name: 'Asistencia', route: '/attendance', icon: <FaCalendarCheck /> },
        { name: 'Usuarios', route: '/user', icon: <FaUserCog /> },
        { name: 'Ajustes', route: '/settings', icon: <FaCog /> },
        { name: 'Envios de Mail', route: '/email-notifications', icon: <FaEnvelope /> },
        { name: 'Volver Atrás', route: null, action: handleGoBack, icon: <FaArrowLeft /> }
    ];

    const today = new Date().toISOString().split('T')[0];

    const handleBackToStudents = () => {
        setHasClearedStudent(true);
        setSelectedStudent(null);
        if (location.state?.fromStudentDetail) {
            navigate(`/detailstudent/${studentId}`);
        } else {
            navigate('/share');
        }
    };

    const handleSave = () => {
        if (!paymentName || !amount) {
            setAlertMessage("Por favor completa el nombre y el monto de la cuota.");
            setShowAlert(true);
            return;
        }

        const cuotaData = {
            student: selectedStudent._id,
            paymentName,
            amount: parseFloat(amount),
            paymentDate: paymentDate || null,
            paymentMethod: paymentDate ? paymentMethod : null,
        };

        if (selectedCuota) {
            updateCuota({ ...cuotaData, _id: selectedCuota._id }).then(() => {
                obtenerCuotasPorEstudiante(selectedStudent._id);
            }).catch((error) => {
                setAlertMessage("Error al actualizar la cuota: " + error.message);
                setShowAlert(true);
            });
        } else {
            addCuota(cuotaData).then(() => {
                obtenerCuotasPorEstudiante(selectedStudent._id);
            }).catch((error) => {
                setAlertMessage("Error al agregar la cuota: " + error.message);
                setShowAlert(true);
            });
        }
        setPaymentName("");
        setAmount("");
        setPaymentDate("");
        setPaymentMethod("");
        setSelectedCuota(null);
        setIsEditing(false);
    };

    const handleEditClick = (cuota) => {
        setSelectedCuota(cuota);
        setPaymentName(cuota.paymentName);
        setAmount(cuota.amount);
        setPaymentDate(cuota.paymentDate ? formatDate(cuota.paymentDate) : "");
        setPaymentMethod(cuota.paymentMethod || "");
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setSelectedCuota(null);
        setPaymentName("");
        setAmount("");
        setPaymentDate("");
        setPaymentMethod("");
        setIsEditing(false);
    };

    const handleDelete = (id) => {
        deleteCuota(id).then(() => {
            obtenerCuotasPorEstudiante(selectedStudent._id);
        }).catch((error) => {
            setAlertMessage("Error al eliminar la cuota: " + error.message);
            setShowAlert(true);
        });
    };

    const handleSendReceipt = async (cuota) => {
        if (!cuota.student?.mail) {
            setAlertMessage("El estudiante no tiene un correo registrado.");
            setShowAlert(true);
            return;
        }
        setSendingReceipt(cuota._id);
        try {
            await sendReceiptEmail(cuota.student, cuota);
            setAlertMessage("Comprobante enviado exitosamente.");
            setShowAlert(true);
        } catch (error) {
            setAlertMessage("Error al enviar el comprobante: " + error.message);
            setShowAlert(true);
        } finally {
            setSendingReceipt(null);
        }
    };

    const formatDate = (dateString) => dateString ? new Date(dateString).toISOString().split("T")[0] : "";

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
                {showAlert && (
                    <Alert
                        variant={alertMessage.includes("Error") ? "danger" : "success"}
                        onClose={() => setShowAlert(false)}
                        dismissible
                        className="custom-alert"
                    >
                        <Alert.Heading>{alertMessage.includes("Error") ? "¡Error!" : "¡Éxito!"}</Alert.Heading>
                        <p>{alertMessage}</p>
                    </Alert>
                )}
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
                            </div>
                        </div>
                        {loadingCuotas ? (
                            <p className="loading">Cargando datos...</p>
                        ) : filteredStudents.length === 0 ? (
                            <p className="no-data">No hay estudiantes disponibles.</p>
                        ) : (
                            <>
                                <Table className="students-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Nombre</th>
                                            <th>Apellido</th>
                                            <th>DNI</th>
                                            <th>Estado</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentStudents.length > 0 ? (
                                            currentStudents.map((student, index) => (
                                                <tr key={student._id}>
                                                    <td>{indexOfFirstStudent + index + 1}</td>
                                                    <td>{student.name}</td>
                                                    <td>{student.lastName}</td>
                                                    <td>{student.dni || "-"}</td>
                                                    <td>{getStudentShareStatus(student._id)}</td>
                                                    <td>
                                                        <Button
                                                            className="action-btn"
                                                            onClick={() => handleSelectStudent(student)}
                                                        >
                                                            Ver Cuotas
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="6" className="text-center">
                                                    No hay estudiantes que coincidan con los filtros.
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
                                    {[...Array(totalPages).keys()].map((number) => (
                                        <Button
                                            key={number + 1}
                                            className={`pagination-btn ${currentPage === number + 1 ? 'active' : ''}`}
                                            onClick={() => paginate(number + 1)}
                                        >
                                            {number + 1}
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
                            </>
                        )}
                    </div>
                ) : (
                    <div className="cuotas-view">
                        <h1 className="title">Cuotas de {selectedStudent.name} {selectedStudent.lastName}</h1>
                        <Button className="back-btn" onClick={handleBackToStudents}>Volver</Button>
                        <Table className="cuotas-table">
                            <thead>
                                <tr>
                                    <th>Cuota</th>
                                    <th>Monto</th>
                                    <th className="metodo-pago">Método de Pago</th>
                                    <th>Fecha de Pago</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCuotas.length > 0 ? (
                                    filteredCuotas.map((cuota) => {
                                        if (!cuota || !cuota._id) return null;
                                        return (
                                            <tr key={cuota._id} className={`state-${cuota.status.toLowerCase()}`}>
                                                <td>{cuota.paymentName}</td>
                                                <td>{new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(cuota.amount)}</td>
                                                <td className="metodo-pago">{cuota.paymentMethod || "-"}</td>
                                                <td>{cuota.paymentDate ? formatDate(cuota.paymentDate) : "-"}</td>
                                                <td>{cuota.status}</td>
                                                <td className="botones-acciones">
                                                    <Button
                                                        className="action-btn edit"
                                                        onClick={() => handleEditClick(cuota)}
                                                    >
                                                        <span className="btn-text">{cuota.paymentDate ? "Editar" : "Pagar"}</span>
                                                        <span className="btn-icon">{cuota.paymentDate ? <FaEdit /> : <FaMoneyBillWave />}</span>
                                                    </Button>
                                                    <Button className="action-btn delete" onClick={() => handleDelete(cuota._id)}>
                                                        <span className="btn-text">Eliminar</span>
                                                        <span className="btn-icon"><FaTrash /></span>
                                                    </Button>
                                                    <Button
                                                        className="action-btn receipt"
                                                        onClick={() => handleSendReceipt(cuota)}
                                                        disabled={cuota.status !== "Pagado" || sendingReceipt === cuota._id}
                                                    >
                                                        <span className="btn-text">Enviar Comprobante</span>
                                                        <span className="btn-icon"><FaFileInvoice /></span>
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr><td colSpan="6">No hay cuotas registradas para este estudiante.</td></tr>
                                )}
                            </tbody>
                        </Table>
                        <div className="cuota-form">
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
                            </div>
                            <div className="form-actions">
                                <Button className="save-btn" onClick={handleSave}>Guardar</Button>
                                {isEditing && <Button className="cancel-btn" onClick={handleCancelEdit}>Cancelar</Button>}
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