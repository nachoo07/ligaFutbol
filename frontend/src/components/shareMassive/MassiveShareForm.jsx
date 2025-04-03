import { useState, useEffect, useContext } from "react";
import { SharesContext } from "../../context/share/ShareContext";
import { Modal, Button, Form, Spinner } from 'react-bootstrap';
import Swal from 'sweetalert2';
import "../share/share.css";

const MassiveShareForm = ({ show, onHide }) => {
    const { createMassiveShares, getAvailableShareNames, obtenerCuotas } = useContext(SharesContext);
    const [year, setYear] = useState("");
    const [paymentName, setPaymentName] = useState("");
    const [availableNames, setAvailableNames] = useState([]);
    const [loading, setLoading] = useState(false); // Estado para controlar la carga

    const years = Array.from({ length: 5 }, (_, i) => 2025 + i);

    useEffect(() => {
        if (year) {
            getAvailableShareNames(year).then((names) => {
                setAvailableNames(names);
                setPaymentName("");
            }).catch((error) => {
                console.error("Error al obtener nombres disponibles:", error);
            });
        } else {
            setAvailableNames([]);
            setPaymentName("");
        }
    }, [year, getAvailableShareNames]);

    useEffect(() => {
        if (!show) {
            setYear("");
            setPaymentName("");
            setAvailableNames([]);
            setLoading(false); // Resetear el estado de carga al cerrar el modal
        }
    }, [show]);

    const handleMassiveSave = () => {
        if (!year || !paymentName) {
            Swal.fire("¡Advertencia!", "Por favor selecciona el año y el nombre de la cuota.", "warning");
            return;
        }

        setLoading(true); // Activar el estado de carga
        createMassiveShares(paymentName, parseInt(year)).then(() => {
            obtenerCuotas(true);
            setLoading(false); // Desactivar el estado de carga
            onHide();
        }).catch((error) => {
            console.error("Error al crear cuotas masivas:", error);
            setLoading(false); // Desactivar el estado de carga en caso de error
        });
    };

    return (
        <Modal show={show} onHide={onHide} centered>
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
                            disabled={loading} // Deshabilitar mientras se carga
                        >
                            <option value="">Selecciona un año</option>
                            {years.map((y) => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Nombre de la Cuota</Form.Label>
                        <Form.Select
                            value={paymentName}
                            onChange={(e) => setPaymentName(e.target.value)}
                            disabled={!year || loading} // Deshabilitar mientras se carga
                        >
                            <option value="">Selecciona un nombre</option>
                            {availableNames.map((item) => (
                                <option key={item.name} value={item.name} disabled={item.isBlocked}>
                                    {item.name}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
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