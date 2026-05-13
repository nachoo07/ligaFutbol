import { useState, useEffect, useContext, useMemo } from "react";
import { SharesContext } from "../../context/share/ShareContext";
import { StudentsContext } from "../../context/student/StudentContext";
import { Modal, Button, Form, Spinner } from 'react-bootstrap';
import Swal from 'sweetalert2';
import "../share/share.css";

const YEARS = [2025, 2026, 2027];

const getStudentId = (student) => {
    if (!student) return "";
    return typeof student === "string" ? student : student._id;
};

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const MassiveShareForm = ({ show, onHide }) => {
    const { cuotas, createMassiveShares, getAvailableShareNames, obtenerCuotas } = useContext(SharesContext);
    const { estudiantes, obtenerEstudiantes } = useContext(StudentsContext);
    const [year, setYear] = useState("");
    const [paymentName, setPaymentName] = useState("");
    const [school, setSchool] = useState("");
    const [availableNames, setAvailableNames] = useState([]);
    const [loading, setLoading] = useState(false);

    const students = useMemo(
        () => Array.isArray(estudiantes) ? estudiantes : [],
        [estudiantes]
    );
    const shares = useMemo(
        () => Array.isArray(cuotas) ? cuotas : [],
        [cuotas]
    );
    const normalizedPaymentName = normalizeText(paymentName);
    const isThirdShare = normalizedPaymentName.includes("tercera cuota");
    const activeStudentsById = useMemo(() => new Map(
        students
            .filter((student) => student.status === "Activo")
            .map((student) => [student._id, student])
    ), [students]);
    const previousPaymentName = isThirdShare
        ? normalizedPaymentName.replace("tercera cuota", "segunda cuota")
        : "";
    const eligibleSchools = useMemo(() => [...new Set(
        shares
            .filter((share) => {
                const studentId = getStudentId(share.student);
                const student = activeStudentsById.get(studentId);
                const alreadyHasThirdShare = shares.some((candidate) => (
                    getStudentId(candidate.student) === studentId &&
                    normalizeText(candidate.paymentName) === normalizedPaymentName &&
                    Number(candidate.year) === Number(year)
                ));

                return (
                    isThirdShare &&
                    student &&
                    !alreadyHasThirdShare &&
                    normalizeText(share.paymentName) === previousPaymentName &&
                    Number(share.year) === Number(year) &&
                    share.paymentType === "Pago Parcial" &&
                    share.status === "Pagado"
                );
            })
            .map((share) => activeStudentsById.get(getStudentId(share.student))?.school)
            .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b)), [activeStudentsById, isThirdShare, normalizedPaymentName, previousPaymentName, shares, year]);

    useEffect(() => {
        if (show && students.length === 0) {
            obtenerEstudiantes().catch((error) => {
                console.error("Error al obtener estudiantes:", error);
            });
        }

        if (show && shares.length === 0) {
            obtenerCuotas().catch((error) => {
                console.error("Error al obtener cuotas:", error);
            });
        }
    }, [show, students.length, shares.length, obtenerEstudiantes, obtenerCuotas]);

    useEffect(() => {
        if (year) {
            getAvailableShareNames(year).then((names) => {
                setAvailableNames(names);
                setPaymentName("");
            }).catch((error) => {
                console.error("Error al obtener nombres disponibles:", error);
                Swal.fire("¡Error!", error.response?.data?.message || "No se pudieron obtener los nombres disponibles.", "error");
            });
        } else {
            setAvailableNames([]);
            setPaymentName("");
        }
    }, [year, getAvailableShareNames]);

    useEffect(() => {
        if (!isThirdShare) {
            setSchool("");
        } else if (school && !eligibleSchools.includes(school)) {
            setSchool("");
        }
    }, [isThirdShare, school, eligibleSchools]);

    useEffect(() => {
        if (!show) {
            setYear("");
            setPaymentName("");
            setSchool("");
            setAvailableNames([]);
            setLoading(false);
        }
    }, [show]);

    const handleMassiveSave = async () => {
        if (!year || !paymentName) {
            Swal.fire("¡Advertencia!", "Por favor selecciona el año y el nombre de la cuota.", "warning");
            return;
        }

        if (isThirdShare && !school) {
            Swal.fire("¡Advertencia!", "Para crear una tercera cuota masiva tenés que seleccionar una escuela.", "warning");
            return;
        }

        setLoading(true);
        try {
            const result = await createMassiveShares(paymentName, parseInt(year), isThirdShare ? school : "");
            await obtenerCuotas(true);
            const createdSharesCount = typeof result === "number" ? result : result.created;
            const message = result?.message || `Se crearon ${createdSharesCount} cuotas masivas correctamente`;
            Swal.fire(
                createdSharesCount > 0 ? "¡Éxito!" : "Sin cuotas nuevas",
                message,
                createdSharesCount > 0 ? "success" : "info"
            );
            onHide(); // Cerrar el modal después de mostrar la alerta
        } catch (error) {
            console.error("Error al crear cuotas masivas:", error);
            Swal.fire("¡Error!", error.response?.data?.message || "No se pudieron crear las cuotas masivas.", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} centered className="massive-cuota-modal">
            <Modal.Header closeButton>
                <Modal.Title>Crear Cuota Masiva</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form>
                    <Form.Group className="mb-3">
                        <Form.Label>Año</Form.Label>
                        <Form.Select
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            disabled={loading}
                        >
                            <option value="">Selecciona un año</option>
                            {YEARS.map((y) => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Nombre de la Cuota</Form.Label>
                        <Form.Select
                            value={paymentName}
                            onChange={(e) => setPaymentName(e.target.value)}
                            disabled={!year || loading}
                        >
                            <option value="">Selecciona un nombre</option>
                            {availableNames.map((item) => (
                                <option key={item.name} value={item.name} disabled={item.isBlocked}>
                                    {item.name}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                    {isThirdShare && (
                        <Form.Group className="mb-3">
                            <Form.Label>Escuela</Form.Label>
                            <Form.Select
                                value={school}
                                onChange={(e) => setSchool(e.target.value)}
                                disabled={loading}
                            >
                                <option value="">
                                    {eligibleSchools.length > 0
                                        ? "Selecciona una escuela"
                                        : "No hay escuelas habilitadas"}
                                </option>
                                {eligibleSchools.map((schoolName) => (
                                    <option key={schoolName} value={schoolName}>{schoolName}</option>
                                ))}
                            </Form.Select>
                            <Form.Text className="text-muted">
                                Solo aparecen escuelas con alumnos activos que tienen la segunda cuota pagada como Pago Parcial y todavía no tienen esta tercera cuota.
                            </Form.Text>
                        </Form.Group>
                    )}
                </Form>
                {loading && (
                    <div className="text-center my-3">
                        <Spinner animation="border" role="status" />
                        <p>Generando cuotas masivas, por favor espera...</p>
                    </div>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide} disabled={loading}>
                    Cerrar
                </Button>
                <Button variant="primary" onClick={handleMassiveSave} disabled={loading}>
                    {loading ? 'Creando...' : 'Crear Masiva'}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default MassiveShareForm;
