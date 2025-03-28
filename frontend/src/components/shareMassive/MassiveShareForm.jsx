import { useState, useContext } from "react";
import { SharesContext } from "../../context/share/ShareContext";
import { Button } from 'react-bootstrap';
import "../share/share.css"; // Reusamos los estilos

const MassiveShareForm = () => {
  const { createMassiveShares } = useContext(SharesContext);
  const [massivePaymentName, setMassivePaymentName] = useState("");
  const [massiveAmount, setMassiveAmount] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const handleMassiveSave = () => {
    if (!massivePaymentName || !massiveAmount) {
      setAlertMessage("Por favor completa el nombre y el monto para la cuota masiva.");
      setShowAlert(true);
      return;
    }
    createMassiveShares(massivePaymentName, parseFloat(massiveAmount));
    setMassivePaymentName("");
    setMassiveAmount("");
    setShowAlert(false);
  };

  return (
    <div className="massive-cuota-form">
      <h3>Crear Cuota Masiva</h3>
      {showAlert && (
        <div className="alert alert-warning" role="alert">
          {alertMessage}
        </div>
      )}
      <div className="form-row">
        <input
          type="text"
          placeholder="Nombre de la cuota (ej. Cuota Marzo 2025)"
          value={massivePaymentName}
          onChange={(e) => setMassivePaymentName(e.target.value)}
        />
        <input
          type="number"
          min="0"
          placeholder="Monto"
          value={massiveAmount}
          onChange={(e) => setMassiveAmount(e.target.value)}
        />
        <Button className="save-btn" onClick={handleMassiveSave}>Crear Masiva</Button>
      </div>
    </div>
  );
};

export default MassiveShareForm;