import React, { useState, useEffect, useContext, useReducer } from 'react';
import { SharesContext } from '../../context/share/ShareContext';
import { UsersContext } from '../../context/user/UserContext';
import { LoginContext } from '../../context/login/LoginContext';
import { Table, Button } from 'react-bootstrap';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { registerLocale } from 'react-datepicker';
import es from 'date-fns/locale/es';
import { useNavigate } from 'react-router-dom';
import { FaSearch } from 'react-icons/fa';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Swal from 'sweetalert2';
import Sidebar from '../sidebar/Sidebar'; // Ajusta la ruta si es diferente
import './shareDetail.css';

// Registrar idioma español para DatePicker
registerLocale('es', es);

// Constantes
const CUOTA_STATUS = { PAID: 'Pagado' };
const PAYMENT_METHODS = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
};

// Reducer para manejar filtros
const filtersReducer = (state, action) => {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, selectedUser: action.payload };
    case 'SET_DATE':
      return { ...state, selectedDate: action.payload };
    case 'SET_SEARCH':
      return { ...state, searchTerm: action.payload };
    case 'CLEAR_FILTERS':
      return { selectedUser: null, selectedDate: null, searchTerm: '' };
    default:
      return state;
  }
};

// Hook personalizado para filtrado de cuotas
const useFilteredCuotas = (cuotas, filters, obtenerCuotas) => {
  const [filteredCuotas, setFilteredCuotas] = useState([]);

  useEffect(() => {
    const applyFilters = async () => {
      if (filters.selectedUser && filters.selectedDate) {
        try {
          await obtenerCuotas();
          let filtered = (Array.isArray(cuotas) ? cuotas : []).filter(
            (cuota) => cuota.status === CUOTA_STATUS.PAID && cuota.registeredBy === filters.selectedUser.label
          );
          const dateStr = filters.selectedDate.toISOString().split('T')[0];
          filtered = filtered.filter(
            (cuota) => cuota.paymentDate && new Date(cuota.paymentDate).toISOString().split('T')[0] === dateStr
          );
          if (filters.searchTerm) {
            const searchLower = filters.searchTerm.toLowerCase();
            filtered = filtered.filter((cuota) => {
              const studentName = `${cuota.student?.name || ''} ${cuota.student?.lastName || ''}`.toLowerCase();
              return studentName.includes(searchLower);
            });
          }
          setFilteredCuotas(filtered);
        } catch (error) {
          console.error('Error al filtrar cuotas:', error);
          Swal.fire('¡Error!', error.response?.data?.message || 'No se pudieron filtrar las cuotas.', 'error');
          setFilteredCuotas([]);
        }
      } else {
        setFilteredCuotas([]);
      }
    };
    applyFilters();
  }, [filters, cuotas, obtenerCuotas]);

  return filteredCuotas;
};

// Componente para la tabla de pagos
const PaymentTable = ({ filteredCuotas, formatDate, calculateTotals, filters }) => {
  const { total, efectivo, transferencia } = calculateTotals();

  return (
    <Table className="payment-table">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Estudiante</th>
          <th>Escuela</th>
          <th>Monto</th>
          <th>Método de Pago</th>
          <th>Usuario que registró</th>
        </tr>
      </thead>
      <tbody>
        {filteredCuotas.length > 0 ? (
          filteredCuotas.map((cuota) => (
            <tr key={cuota._id}>
              <td>{formatDate(cuota.paymentDate)}</td>
              <td>{cuota.student?.name} {cuota.student?.lastName || '-'}</td>
              <td>{cuota.student?.school || '-'}</td>
              <td>
                {cuota.amount !== null && cuota.amount !== undefined
                  ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(cuota.amount)
                  : '-'}
              </td>
              <td>{cuota.paymentMethod || '-'}</td>
              <td>{cuota.registeredBy || '-'}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan="6" className="text-center">
              {!filters.selectedUser || !filters.selectedDate
                ? 'Por favor, selecciona un usuario y una fecha para ver los pagos.'
                : 'No hay datos para los filtros seleccionados.'}
            </td>
          </tr>
        )}
        {filteredCuotas.length > 0 && (
          <tr className="total-row">
            <td colSpan="3" style={{ textAlign: 'right', fontWeight: 'bold' }}>Total:</td>
            <td>
              {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(total)}
            </td>
            <td colSpan="2">
              {efectivo > 0 &&
                `Efectivo: ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(efectivo)} `}
              {efectivo > 0 && transferencia > 0 && ' - '}
              {transferencia > 0 &&
                `Transferencia: ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(transferencia)}`}
            </td>
          </tr>
        )}
      </tbody>
    </Table>
  );
};

const ShareDetail = () => {
  const { cuotas, obtenerCuotas } = useContext(SharesContext);
  const { usuarios, obtenerUsuarios } = useContext(UsersContext);
  const { auth } = useContext(LoginContext);
  const navigate = useNavigate();

  const [filters, dispatch] = useReducer(filtersReducer, {
    selectedUser: null,
    selectedDate: null,
    searchTerm: '',
  });
  const [isMenuOpen, setIsMenuOpen] = useState(true);

  const filteredCuotas = useFilteredCuotas(cuotas, filters, obtenerCuotas);

  useEffect(() => {
    if (!Array.isArray(usuarios) || usuarios.length === 0) {
      obtenerUsuarios();
    }
  }, [obtenerUsuarios, usuarios]);

  const userOptions = (Array.isArray(usuarios) ? usuarios : []).map((user) => ({
    value: user._id,
    label: user.name,
  }));

  const formatDate = (dateString) => (dateString ? new Date(dateString).toISOString().split('T')[0] : '-');

  const calculateTotals = () => {
    const total = filteredCuotas.reduce((sum, cuota) => sum + (cuota.amount || 0), 0);
    const efectivo = filteredCuotas
      .filter((cuota) => cuota.paymentMethod === PAYMENT_METHODS.EFECTIVO)
      .reduce((sum, cuota) => sum + (cuota.amount || 0), 0);
    const transferencia = filteredCuotas
      .filter((cuota) => cuota.paymentMethod === PAYMENT_METHODS.TRANSFERENCIA)
      .reduce((sum, cuota) => sum + (cuota.amount || 0), 0);
    return { total, efectivo, transferencia };
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Registro de Pagos', 14, 16);

    const headers = ['Fecha', 'Estudiante', 'Escuela', 'Monto', 'Método de Pago', 'Usuario que registró'];
    const tableData = filteredCuotas.map((cuota) => [
      formatDate(cuota.paymentDate),
      `${cuota.student?.name || ''} ${cuota.student?.lastName || '-'}`,
      cuota.student?.school || '-',
      cuota.amount !== null && cuota.amount !== undefined
        ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(cuota.amount)
        : '-',
      cuota.paymentMethod || '-',
      cuota.registeredBy || '-',
    ]);

    const { total, efectivo, transferencia } = calculateTotals();
    tableData.push([
      { content: 'Total:', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
      new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(total),
      {
        content: `${efectivo > 0 ? `Efectivo: ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(efectivo)}` : ''}${
          efectivo > 0 && transferencia > 0 ? ' - ' : ''
        }${transferencia > 0 ? `Transferencia: ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(transferencia)}` : ''}`,
        colSpan: 2,
      },
    ]);

    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 20,
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 40 },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 },
        4: { cellWidth: 30 },
        5: { cellWidth: 30 },
      },
    });

    doc.save('registro_pagos.pdf');
  };

  return (
    <div className="dashboard-container-share">
      <Sidebar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} auth={auth} />
      <div className="content-share">
        <div className="payment-view">
          <h1 className="title">Registro de Pagos</h1>
          <div className="filters-container">
            <div className="search-bar">
              <input
                type="text"
                placeholder="Buscar por nombre del estudiante..."
                value={filters.searchTerm}
                onChange={(e) => dispatch({ type: 'SET_SEARCH', payload: e.target.value })}
                aria-label="Buscar por nombre del estudiante"
              />
              <FaSearch className="search-icon" aria-hidden="true" />
            </div>
            <div className="filters-actions">
              <div className="filter-group">
                <label htmlFor="user-select">Usuario que registró:</label>
                <Select
                  id="user-select"
                  options={userOptions}
                  onChange={(user) => dispatch({ type: 'SET_USER', payload: user })}
                  placeholder="Selecciona un usuario"
                  isClearable
                  value={filters.selectedUser}
                  aria-label="Seleccionar usuario que registró"
                />
              </div>
              <div className="filter-group">
                <label htmlFor="date-picker">Fecha:</label>
                <DatePicker
                  id="date-picker"
                  selected={filters.selectedDate}
                  onChange={(date) => dispatch({ type: 'SET_DATE', payload: date })}
                  onSelect={(date) => {
                    dispatch({ type: 'SET_DATE', payload: date });
                    document.activeElement.blur(); // Cierra el calendario
                  }}
                  dateFormat="yyyy-MM-dd"
                  placeholderText="Selecciona una fecha"
                  className="form-control"
                  locale="es"
                  maxDate={new Date()}
                  aria-label="Seleccionar fecha de pago"
                />
              </div>
              <div className="actions-group">
                <Button
                  onClick={exportToPDF}
                  variant="primary"
                  disabled={filteredCuotas.length === 0}
                  aria-label="Exportar a PDF"
                >
                  Exportar a PDF
                </Button>
                <Button
                  className="clear-filter-btn"
                  onClick={() => dispatch({ type: 'CLEAR_FILTERS' })}
                  aria-label="Borrar filtros"
                >
                  Borrar Filtros
                </Button>
              </div>
            </div>
          </div>
          <PaymentTable
            filteredCuotas={filteredCuotas}
            formatDate={formatDate}
            calculateTotals={calculateTotals}
            filters={filters}
          />
        </div>
      </div>
    </div>
  );
};

export default ShareDetail;