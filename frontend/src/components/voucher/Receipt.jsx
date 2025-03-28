import React from 'react';
import './receipt.css';

const Receipt = ({ student, share }) => {
    return (
        <div className="receipt-container">
            {/* Encabezado */}
            <div className="receipt-header">
                <div className="receipt-header-logo">
                    <img
                        src="https://res.cloudinary.com/dmjjwnvq8/image/upload/v1742739966/logo_nuc99w.png"
                        alt="Logo Liga de Fútbol Infantil"
                        crossOrigin="anonymous"
                    />
                    <h1 className="receipt-header-title">Liga de Fútbol Infantil</h1>
                </div>
                <h1 className="receipt-header-invoice">Factura</h1>
            </div>

            {/* Contenido principal */}
            <div className="receipt-content">
                {/* Información del estudiante */}
                <div className="receipt-section">
                    <h3 className="receipt-section-title">Información del Alumno</h3>
                    <p className="receipt-text">
                        <strong>Nombre:</strong> {student.name} {student.lastName}
                    </p>
                    <p className="receipt-text">
                        <strong>DNI:</strong> {student.dni || 'No disponible'}
                    </p>
                </div>

                {/* Detalles del pago */}
                <div className="receipt-section">
                    <h3 className="receipt-section-title">Detalle del Pago</h3>
                    <p className="receipt-text">
                        <strong>Concepto:</strong> {share.paymentName}
                    </p>
                    <p className="receipt-text">
                        <strong>Monto Pagado:</strong> ${share.amount.toLocaleString('es-ES')}
                    </p>
                    <p className="receipt-text">
                        <strong>Método de Pago:</strong> {share.paymentMethod || 'No especificado'}
                    </p>
                    <p className="receipt-text">
                        <strong>Fecha de Pago:</strong>{' '}
                        {new Date(share.paymentDate || share.updatedAt).toLocaleDateString('es-ES')}
                    </p>
                </div>

              
            </div>

            {/* Pie de página */}
            <div className="receipt-footer">
                <p className="receipt-texto">Gracias por su pago.</p>
            </div>
        </div>
    );
};

export default Receipt;