import React, { useState, useEffect, useContext, useRef, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { FaEdit, FaMoneyBillWave, FaSearch, FaFileInvoice, FaSpinner, FaPlus } from 'react-icons/fa';
import { SharesContext } from "../../context/share/ShareContext";
import { StudentsContext } from "../../context/student/StudentContext";
import { useEmail } from '../../context/email/EmailContext';
import { Button, Table, Form, Modal } from 'react-bootstrap';
import { MdDelete } from 'react-icons/md';
import { MdOutlineReadMore } from "react-icons/md";
import MassiveShareForm from "../shareMassive/MassiveShareForm";
import Swal from 'sweetalert2';
import "./share.css";

const YEARS = [2025, 2026, 2027];
const STUDENTS_PER_PAGE = 15;

const getDefaultYearFilter = () => {
    const currentYear = new Date().getFullYear();
    return YEARS.includes(currentYear) ? String(currentYear) : String(YEARS[0]);
};

const getShareStatusFromStudentShares = (studentShares) => {
    if (studentShares.length === 0) return 'Sin cuotas';
    if (studentShares.some((cuota) => cuota.status === 'Pendiente')) return 'Pendiente';
    return 'Pagada';
};

const getSharesByStudentId = (shares, studentId) => (
    Array.isArray(shares)
        ? shares.filter((cuota) => cuota.student?._id === studentId || cuota.student === studentId)
        : []
);

const sortCuotas = (shares) => {
    const cuotaOrder = {
        'primera cuota': 1,
        'segunda cuota': 2,
        'tercera cuota': 3,
    };

    return [...shares].sort((a, b) => {
        const [aCuota, aSemestre, aYear] = a.paymentName?.split(' - ') || ['', '', '0'];
        const [bCuota, bSemestre, bYear] = b.paymentName?.split(' - ') || ['', '', '0'];

        const yearDiff = parseInt(aYear) - parseInt(bYear);
        if (yearDiff !== 0) return yearDiff;

        const semestreA = parseInt(aSemestre.replace('Semestre ', '')) || 0;
        const semestreB = parseInt(bSemestre.replace('Semestre ', '')) || 0;
        if (semestreA !== semestreB) return semestreA - semestreB;

        return (cuotaOrder[aCuota.toLowerCase()] || 999) - (cuotaOrder[bCuota.toLowerCase()] || 999);
    });
};

const Share = () => {
    const { cuotas, obtenerCuotas, obtenerCuotasPorEstudiante, addCuota, updateCuota, deleteCuota, getAvailableShareNames, loading: loadingCuotas } = useContext(SharesContext);
    const { estudiantes, obtenerEstudiantes, loading: loadingStudents } = useContext(StudentsContext);
    const { sendReceiptEmail } = useEmail();
    const { studentId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const defaultYearFilter = getDefaultYearFilter();

    const [selectedStudent, setSelectedStudent] = useState(null);
    const [allStudentCuotas, setAllStudentCuotas] = useState([]);
    const [paymentName, setPaymentName] = useState("");
    const [amount, setAmount] = useState("");
    const [paymentDate, setPaymentDate] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("");
    const [paymentType, setPaymentType] = useState("");
    const [selectedCuota, setSelectedCuota] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("Pendiente");
    const [yearFilter, setYearFilter] = useState(defaultYearFilter);
    const [currentPage, setCurrentPage] = useState(1);
    const [sendingReceipt, setSendingReceipt] = useState(null);
    const [showMassiveModal, setShowMassiveModal] = useState(false);
    const [showCuotaModal, setShowCuotaModal] = useState(false);
    const [modalTitle, setModalTitle] = useState("Crear Cuota");
    const [year, setYear] = useState("");
    const [availableNames, setAvailableNames] = useState([]);
    const studentsPerPage = STUDENTS_PER_PAGE;
    const [maxVisiblePages, setMaxVisiblePages] = useState(10);

    const today = new Date().toISOString().split("T")[0];
    const initialDataLoaded = useRef(false);
    const fetchedStudentCuotasId = useRef(null);
    const students = useMemo(
        () => Array.isArray(estudiantes) ? estudiantes : [],
        [estudiantes]
    );
    const shares = useMemo(
        () => Array.isArray(cuotas) ? cuotas : [],
        [cuotas]
    );

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
                    const requests = [];

                    if (students.length === 0) {
                        requests.push(obtenerEstudiantes(true));
                    }

                    if (shares.length === 0) {
                        requests.push(obtenerCuotas(true));
                    }

                    if (requests.length > 0) {
                        await Promise.all(requests);
                    }

                    initialDataLoaded.current = true;
                } catch (error) {
                    console.error('Error en carga inicial:', error);
                    Swal.fire("¡Error!", error.response?.data?.message || "No se pudieron obtener los datos.", "error");
                }
            };
            loadInitialData();
        }
    }, [students.length, shares.length, obtenerEstudiantes, obtenerCuotas, loadingStudents]);

    useEffect(() => {
        if (studentId && fetchedStudentCuotasId.current !== studentId) {
            const loadStudentCuotas = async () => {
                try {
                    const studentCuotas = await obtenerCuotasPorEstudiante(studentId);
                    setAllStudentCuotas(studentCuotas);
                    fetchedStudentCuotasId.current = studentId;
                } catch (error) {
                    console.error('Error cargando cuotas del estudiante:', error);
                    Swal.fire("¡Error!", error.response?.data?.message || "No se pudieron obtener las cuotas del estudiante.", "error");
                }
            };
            loadStudentCuotas();
        }
    }, [studentId, obtenerCuotasPorEstudiante]);

    useEffect(() => {
        if (!studentId) return;

        const student = students.find((est) => est._id === studentId);
        if (student) {
            setSelectedStudent(student);
        }
    }, [studentId, students]);

    const filteredStudentCuotas = useMemo(() => {
        const filteredByYear = allStudentCuotas.filter((cuota) => {
            const cuotaYear = Number(cuota.year || cuota.paymentName?.split(' - ')[2] || 0);
            return Number(yearFilter) === cuotaYear;
        });

        return sortCuotas(filteredByYear);
    }, [allStudentCuotas, yearFilter]);

    useEffect(() => {
        if (year && showCuotaModal && !isEditing) {
            getAvailableShareNames(year, selectedStudent?._id).then((names) => {
                setAvailableNames(names);
                setPaymentName((currentValue) => {
                    if (!currentValue) return "";
                    return names.some((item) => item.name === currentValue && !item.isBlocked)
                        ? currentValue
                        : "";
                });
            }).catch((error) => {
                console.error("Error al obtener nombres disponibles:", error);
                Swal.fire("¡Error!", error.response?.data?.message || "No se pudieron obtener los nombres disponibles.", "error");
            });
        } else if (!year || !showCuotaModal || isEditing) {
            setAvailableNames([]);
            if (!isEditing) {
                setPaymentName("");
            }
        }
    }, [year, showCuotaModal, isEditing, getAvailableShareNames, selectedStudent]);

    const resetPaymentForm = ({ closeModal = true } = {}) => {
        setPaymentName("");
        setAmount("");
        setPaymentDate("");
        setPaymentMethod("");
        setPaymentType("");
        setYear("");
        setSelectedCuota(null);
        setIsEditing(false);

        if (closeModal) {
            setShowCuotaModal(false);
        }
    };

    const handleSelectStudent = (student) => {
        setSelectedStudent(student);
        setYearFilter(defaultYearFilter);
        navigate(`/share/${student._id}`);
        fetchedStudentCuotasId.current = null;
    };

    const getStudentShareStatus = (studentId) => {
        return getShareStatusFromStudentShares(getSharesByStudentId(shares, studentId));
    };

    const filteredStudents = useMemo(() => students.filter((estudiante) => {
        const fullName = `${estudiante.name || ''} ${estudiante.lastName || ''}`.toLowerCase();
        const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || (estudiante.dni?.includes(searchTerm) || '');
        const status = getShareStatusFromStudentShares(getSharesByStudentId(shares, estudiante._id));
        const matchesStatus = statusFilter === "" || status === statusFilter;
        return matchesSearch && matchesStatus;
    }), [searchTerm, shares, statusFilter, students]);

    const shareStatusCounts = useMemo(() => {
        const initialCounts = {
            total: 0,
            pending: 0,
            paid: 0,
            withoutShares: 0,
        };

        return students.reduce((counts, estudiante) => {
            const status = getShareStatusFromStudentShares(getSharesByStudentId(shares, estudiante._id));

            counts.total += 1;
            if (status === "Pendiente") counts.pending += 1;
            if (status === "Pagada") counts.paid += 1;
            if (status === "Sin cuotas") counts.withoutShares += 1;

            return counts;
        }, initialCounts);
    }, [students, shares]);

    const totalPages = Math.ceil(filteredStudents.length / studentsPerPage) || 1;
    const indexOfLastStudent = currentPage * studentsPerPage;
    const indexOfFirstStudent = indexOfLastStudent - studentsPerPage;
    const currentStudents = filteredStudents.slice(indexOfFirstStudent, indexOfLastStudent);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const handleStatusFilterChange = (status) => {
        setStatusFilter(status);
        setCurrentPage(1);
    };

    const handleBackToStudents = () => {
        resetPaymentForm();
        setSelectedStudent(null);
        setYearFilter(defaultYearFilter);
        setAllStudentCuotas([]);
        fetchedStudentCuotasId.current = null;

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

        if (!paymentName || !year) {
            Swal.fire("¡Advertencia!", "Debes seleccionar el año y el nombre de la cuota.", "warning");
            return;
        }

        const hasAnyPaymentField =
            amount !== "" ||
            paymentDate !== "" ||
            paymentMethod !== "" ||
            paymentType !== "";

        if (hasAnyPaymentField) {
            if (amount === "" || !paymentDate || !paymentMethod || !paymentType) {
                Swal.fire(
                    "¡Advertencia!",
                    "Si vas a registrar un pago, debes completar monto, fecha, método de pago y tipo de pago.",
                    "warning"
                );
                return;
            }

            const parsedDate = new Date(paymentDate);
            if (isNaN(parsedDate.getTime())) {
                Swal.fire("¡Advertencia!", "La fecha de pago ingresada no es válida.", "warning");
                return;
            }
        }

        const cuotaData = {
            student: selectedStudent._id,
            paymentName,
            year: parseInt(year, 10),
            amount: amount === "" ? null : parseFloat(amount),
            paymentDate: paymentDate || null,
            paymentMethod: paymentMethod || null,
            paymentType: paymentType || null,
        };

        try {
            if (selectedCuota) {
                await updateCuota({ ...cuotaData, _id: selectedCuota._id });
            } else {
                await addCuota(cuotaData);
            }

            const studentCuotas = await obtenerCuotasPorEstudiante(selectedStudent._id);
            setAllStudentCuotas(studentCuotas);

            Swal.fire(
                "¡Éxito!",
                selectedCuota
                    ? `Cuota actualizada exitosamente para ${selectedStudent.name} ${selectedStudent.lastName}.`
                    : hasAnyPaymentField
                        ? `Cuota pagada agregada exitosamente para ${selectedStudent.name} ${selectedStudent.lastName}.`
                        : `Cuota pendiente agregada exitosamente para ${selectedStudent.name} ${selectedStudent.lastName}.`,
                "success"
            );

            resetPaymentForm();
        } catch (error) {
            console.error('Error en handleSave:', error);
            Swal.fire(
                "¡Error!",
                error.response?.data?.message || `No se pudo guardar la cuota.`,
                "error"
            );
        }
    };


    const handleEditClick = (cuota) => {
        setSelectedCuota(cuota);
        setPaymentName(cuota.paymentName);
        setAmount(cuota.amount ?? "");
        setPaymentDate(cuota.paymentDate ? formatDate(cuota.paymentDate) : "");
        setPaymentMethod(cuota.paymentMethod || "");
        setPaymentType(cuota.paymentType || "");
        setIsEditing(true);
        setModalTitle(cuota.status === "Pagado" ? "Editar Cuota" : "Editar / Registrar Pago");
        setYear(String(cuota.year || ""));
        setShowCuotaModal(true);
    };


    const handleCancelEdit = () => {
        resetPaymentForm();
    };

    const handleCreateCuota = () => {
        resetPaymentForm({ closeModal: false });
        setModalTitle("Crear Cuota");
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
            const sent = await sendReceiptEmail(cuota.student, cuota);
            if (sent) {
                Swal.fire("¡Éxito!", "Comprobante enviado exitosamente.", "success");
            }
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
        <div className="dashboard-container">
            <div className="content-share">
                {!selectedStudent ? (
                    <div className="students-view">
                        <div className="share-toolbar">
                            <div className="share-toolbar-left">
                                <div className="search-bar">
                                    <FaSearch className="search-icon" />
                                    <input
                                        type="text"
                                        placeholder="Buscar por nombre, apellido o DNI..."
                                        value={searchTerm}
                                        onChange={handleSearchChange}
                                    />
                                </div>

                                <div className="status-tabs" aria-label="Filtrar por estado de cuota">
                                    <button
                                        type="button"
                                        className={`status-tab ${statusFilter === "Pendiente" ? "active" : ""}`}
                                        onClick={() => handleStatusFilterChange("Pendiente")}
                                    >
                                        Pendiente <span>{shareStatusCounts.pending}</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={`status-tab ${statusFilter === "Pagada" ? "active" : ""}`}
                                        onClick={() => handleStatusFilterChange("Pagada")}
                                    >
                                        Pagada <span>{shareStatusCounts.paid}</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={`status-tab ${statusFilter === "Sin cuotas" ? "active" : ""}`}
                                        onClick={() => handleStatusFilterChange("Sin cuotas")}
                                    >
                                        Sin cuotas <span>{shareStatusCounts.withoutShares}</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={`status-tab ${statusFilter === "" ? "active" : ""}`}
                                        onClick={() => handleStatusFilterChange("")}
                                    >
                                        Todos <span>{shareStatusCounts.total}</span>
                                    </button>
                                </div>
                            </div>

                            <div className="share-toolbar-actions">
                                <Button className="btn-share-masive" onClick={() => setShowMassiveModal(true)}>
                                    <FaPlus /> Crear Cuota Masiva
                                </Button>
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
                        <div className="filter-actions-share">
                            <div className="state-filter-share">
                                <label className="estado">Año:</label>
                                <select
                                    value={yearFilter}
                                    onChange={(e) => setYearFilter(e.target.value)}
                                >
                                    {YEARS.map((y) => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="actions-individuales">
                                <Button className="create-cuota-btn" onClick={handleCreateCuota}>Crear Cuota</Button>
                                <Button className="back-btn" onClick={handleBackToStudents}>Volver</Button>
                            </div>
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
                        <Modal show={showCuotaModal} onHide={handleCancelEdit} className="cuota-modal">
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
                                                {YEARS.map((y) => (
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
