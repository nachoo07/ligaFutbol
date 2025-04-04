import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { FaBars,FaAddressCard ,FaRegListAlt , FaUsers, FaMoneyBill, FaChartBar, FaExchangeAlt, FaUserCog, FaEnvelope, FaHome, FaArrowLeft, FaEdit, FaMoneyBillWave, FaSearch, FaFileInvoice } from 'react-icons/fa';

import { LuClipboardList } from "react-icons/lu";
import { SharesContext } from "../../context/share/ShareContext";
import { StudentsContext } from "../../context/student/StudentContext";
import { useEmail } from '../../context/email/EmailContext';
import { Button, Table, Alert, Form } from 'react-bootstrap';
import { MdDelete } from 'react-icons/md';
import MassiveShareForm from "../shareMassive/MassiveShareForm";
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
    const [showAlert, setShowAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState("");
    const [alertVariant, setAlertVariant] = useState("warning");
    const [isMenuOpen, setIsMenuOpen] = useState(true);
    const [isCuotasLoaded, setIsCuotasLoaded] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [yearFilter, setYearFilter] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [sendingReceipt, setSendingReceipt] = useState(null);
    const [hasClearedStudent, setHasClearedStudent] = useState(false);
    const [showMassiveModal, setShowMassiveModal] = useState(false);
    const studentsPerPage = 10;

    const years = Array.from({ length: 5 }, (_, i) => 2025 + i);

    useEffect(() => {
        if (!isCuotasLoaded) {
            obtenerCuotas().then(() => setIsCuotasLoaded(true));
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
        { name: 'Deudores', route: '/pendingshare', icon: <LuClipboardList /> },
        { name: 'Usuarios', route: '/user', icon: <FaUserCog /> },
        { name: 'Envios de Mail', route: '/email-notifications', icon: <FaEnvelope /> },
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

    const handleSave = () => {
        if (!selectedStudent || !selectedStudent._id) {
            setAlertMessage("No se ha seleccionado un estudiante.");
            setAlertVariant("warning");
            setShowAlert(true);
            return;
        }

        if (!paymentName || !amount || !paymentDate || !paymentMethod || !paymentType) {
            setAlertMessage("Por favor completa todos los campos obligatorios.");
            setAlertVariant("warning");
            setShowAlert(true);
            return;
        }

        const year = new Date(paymentDate).getFullYear();
        if (isNaN(year)) {
            setAlertMessage("La fecha de pago ingresada no es válida.");
            setAlertVariant("warning");
            setShowAlert(true);
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

        if (selectedCuota) {
            updateCuota({ ...cuotaData, _id: selectedCuota._id }).then(() => {
                Promise.all([
                    obtenerCuotasPorEstudiante(selectedStudent._id),
                    obtenerCuotas(true),
                    obtenerEstudiantes(), // Actualizar el contexto de estudiantes
                ]).then(([studentCuotas]) => {
                    setAllStudentCuotas(studentCuotas);
                    setFilteredStudentCuotas(studentCuotas);
                    setAlertMessage("Cuota actualizada exitosamente.");
                    setAlertVariant("success");
                    setShowAlert(true);
                    // Disparar evento personalizado
                window.dispatchEvent(new Event('shareUpdated'));
                });
            }).catch((error) => {
                setAlertMessage("Error al actualizar la cuota: " + error.message);
                setAlertVariant("danger");
                setShowAlert(true);
            });
        } else {
            addCuota(cuotaData).then(() => {
                Promise.all([
                    obtenerCuotasPorEstudiante(selectedStudent._id),
                    obtenerCuotas(true),
                    obtenerEstudiantes(), // Actualizar el contexto de estudiantes
                ]).then(([studentCuotas]) => {
                    setAllStudentCuotas(studentCuotas);
                    setFilteredStudentCuotas(studentCuotas);
                    setAlertMessage("Cuota agregada exitosamente.");
                    setAlertVariant("success");
                    setShowAlert(true);
                    // Disparar evento personalizado
                window.dispatchEvent(new Event('shareUpdated'));
                });
            }).catch((error) => {
                setAlertMessage("Error al agregar la cuota: " + error.message);
                setAlertVariant("danger");
                setShowAlert(true);
            });
        }

        setPaymentName("");
        setAmount("");
        setPaymentDate("");
        setPaymentMethod("");
        setPaymentType("");
        setSelectedCuota(null);
        setIsEditing(false);
    };

    const handleEditClick = (cuota) => {
        setSelectedCuota(cuota);
        setPaymentName(cuota.paymentName);
        setAmount(cuota.amount || "");
        setPaymentDate(cuota.paymentDate ? formatDate(cuota.paymentDate) : "");
        setPaymentMethod(cuota.paymentMethod || "");
        setPaymentType(cuota.paymentType || "");
        setIsEditing(true);
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

    const handleDelete = (id) => {
        deleteCuota(id).then(() => {
            Promise.all([
                obtenerCuotasPorEstudiante(selectedStudent._id),
                obtenerCuotas(true),
                obtenerEstudiantes(), // Actualizar el contexto de estudiantes
            ]).then(([studentCuotas]) => {
                setAllStudentCuotas(studentCuotas);
                setFilteredStudentCuotas(studentCuotas);
                // Disparar evento personalizado
            window.dispatchEvent(new Event('shareUpdated'));
            });
        }).catch((error) => {
            setAlertMessage("Error al eliminar la cuota: " + error.message);
            setShowAlert(true);
        });
    };

    const handleSendReceipt = async (cuota) => {
        if (!cuota.student?.mail) {
            setAlertMessage("Advertencia: El estudiante no tiene un correo registrado.");
            setShowAlert(true);
            return;
        }
        setSendingReceipt(cuota._id);
        try {
            await sendReceiptEmail(cuota.student, cuota);
            setAlertMessage("Comprobante enviado exitosamente.");
            setAlertVariant("success"); // Asegurar que la alerta sea de éxito
            setShowAlert(true);
        } catch (error) {
            setAlertMessage("Error al enviar el comprobante: " + error.message);
            setAlertVariant("danger"); // Asegurar que la alerta sea de error
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
                                <Button onClick={() => setShowMassiveModal(true)}>Crear Cuota Masiva</Button>
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
                                        <th>Estado del Estudiante</th>
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
                                                <td>{student.status}</td>
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
                                    <th>Tipo de Pago</th>
                                    <th>Fecha de Pago</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
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
                                                <td>{cuota.paymentType || "-"}</td>
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
                                                        <FaFileInvoice />
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
                        <div className="cuota-form">
                            {showAlert && (
                                <Alert
                                    variant={alertVariant}
                                    onClose={() => setShowAlert(false)}
                                    dismissible
                                    className="custom-alert"
                                >
                                    <Alert.Heading>
                                        {alertVariant === "success" ? "¡Éxito!" :
                                         alertVariant === "danger" ? "¡Error!" : "¡Advertencia!"}
                                    </Alert.Heading>
                                    <p>{alertMessage}</p>
                                </Alert>
                            )}
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