import React, { useState, useEffect, useContext } from 'react';
import { SharesContext } from '../../context/share/ShareContext';
import { UsersContext } from '../../context/user/UserContext';
import { LoginContext } from '../../context/login/LoginContext';
import { Table, Button } from 'react-bootstrap';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaBars, FaUsers, FaAddressCard, FaMoneyBill, FaRegListAlt, FaChartBar, FaExchangeAlt, FaUserCog, FaCog, FaEnvelope, FaHome, FaArrowLeft } from 'react-icons/fa';
import { LuClipboardList } from "react-icons/lu";
import './shareDetail.css';

const ShareDetail = () => {
    const { cuotas, obtenerCuotas } = useContext(SharesContext);
    const { usuarios, obtenerUsuarios } = useContext(UsersContext);
    const { auth } = useContext(LoginContext);
    const navigate = useNavigate();

    const [filteredCuotas, setFilteredCuotas] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(true);
    const [isDataLoaded, setIsDataLoaded] = useState(false);

    useEffect(() => {
        if (usuarios.length === 0) {
            obtenerUsuarios();
        }
    }, []);

    useEffect(() => {
        // Cargar datos si hay al menos un filtro o búsqueda
        if ((selectedUser || selectedDate || searchTerm) && !isDataLoaded) {
            fetchCuotas();
        }
    }, [selectedUser, selectedDate, searchTerm]);

    useEffect(() => {
        if (!isDataLoaded) return;

        let filtered = [...cuotas].filter(cuota => cuota.status === 'Pagado');

        if (selectedUser) {
            filtered = filtered.filter(cuota => cuota.registeredBy === selectedUser.label);
        }
        if (selectedDate) {
            const dateStr = selectedDate.toISOString().split('T')[0];
            filtered = filtered.filter(cuota => cuota.paymentDate && new Date(cuota.paymentDate).toISOString().split('T')[0] === dateStr);
        }
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(cuota => {
                const studentName = `${cuota.student?.name || ''} ${cuota.student?.lastName || ''}`.toLowerCase();
                return studentName.includes(searchLower);
            });
        }

        // Si no hay filtros ni búsqueda activa, no mostrar datos
        if (!selectedUser && !selectedDate && !searchTerm) {
            setFilteredCuotas([]);
        } else {
            setFilteredCuotas(filtered);
        }
    }, [cuotas, selectedUser, selectedDate, searchTerm, isDataLoaded]);

    const userOptions = usuarios.map(user => ({
        value: user._id,
        label: user.name,
    }));

    const formatDate = (dateString) => dateString ? new Date(dateString).toISOString().split('T')[0] : '-';

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
        { name: 'Volver Atrás', route: null, action: () => navigate(-1), icon: <FaArrowLeft /> },
    ];

    const userMenuItems = [
        { name: 'Inicio', route: '/', icon: <FaHome /> },
    ];

    const handleSearchChange = (e) => setSearchTerm(e.target.value);

    const fetchCuotas = async () => {
        try {
            await obtenerCuotas();
            setIsDataLoaded(true);
        } catch (error) {
            console.error('Error al obtener cuotas:', error);
        }
    };

    const clearFilters = () => {
        setSelectedUser(null);
        setSelectedDate(null);
        setSearchTerm('');
        setFilteredCuotas([]);
        setIsDataLoaded(false); // Restablecer carga de datos
    };

    // Calcular totales
    const calculateTotals = () => {
        const total = filteredCuotas.reduce((sum, cuota) => sum + (cuota.amount || 0), 0);
        const efectivo = filteredCuotas
            .filter(cuota => cuota.paymentMethod === 'Efectivo')
            .reduce((sum, cuota) => sum + (cuota.amount || 0), 0);
        const transferencia = filteredCuotas
            .filter(cuota => cuota.paymentMethod === 'Transferencia')
            .reduce((sum, cuota) => sum + (cuota.amount || 0), 0);

        return { total, efectivo, transferencia };
    };

    const { total, efectivo, transferencia } = calculateTotals();

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
                        onClick={() => item.action ? item.action() : navigate(item.route)}
                    >
                        <span className="icon">{item.icon}</span>
                        <span className="text">{item.name}</span>
                    </div>
                ))}
            </div>
            <div className="content-share">
                <div className="payment-view">
                    <h1 className="title">Registro de Pagos</h1>
                    <div className="payment-header">
                        <div className="search-bar">
                            <input
                                type="text"
                                placeholder="Buscar por nombre del estudiante..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                            />
                            <FaSearch className="search-icon" />
                        </div>
                        <div className="filters">
                            <div className="filter-group">
                                <label>Usuario que registró:</label>
                                <Select
                                    options={userOptions}
                                    onChange={setSelectedUser}
                                    placeholder="Selecciona un usuario"
                                    isClearable
                                    value={selectedUser}
                                />
                            </div>
                            <div className="filter-group">
                                <label>Fecha:</label>
                                <DatePicker
                                    selected={selectedDate}
                                    onChange={setSelectedDate}
                                    dateFormat="yyyy-MM-dd"
                                    placeholderText="Selecciona una fecha"
                                    className="form-control"
                                />
                            </div>
                            <Button className="clear-filter-btn" onClick={clearFilters}>
                                Borrar Filtros
                            </Button>
                        </div>
                    </div>
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
                                            {cuota.amount
                                                ? new Intl.NumberFormat('es-CL', {
                                                      style: 'currency',
                                                      currency: 'CLP',
                                                      minimumFractionDigits: 0,
                                                  }).format(cuota.amount)
                                                : '-'}
                                        </td>
                                        <td>{cuota.paymentMethod || '-'}</td>
                                        <td>{cuota.registeredBy || '-'}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="text-center">
                                        {isDataLoaded && !searchTerm && !selectedUser && !selectedDate
                                            ? "Seleccione algún filtro o use el buscador para ver los pagos."
                                            : searchTerm && !filteredCuotas.length
                                            ? "No hay datos según tu búsqueda."
                                            : "Seleccione algún filtro o use el buscador para ver los pagos."}
                                    </td>
                                </tr>
                            )}
                            {filteredCuotas.length > 0 && (
                                <tr className="total-row">
                                    <td colSpan="3" style={{ textAlign: 'right', fontWeight: 'bold' }}>Total:</td>
                                    <td>
                                        {new Intl.NumberFormat('es-CL', {
                                            style: 'currency',
                                            currency: 'CLP',
                                            minimumFractionDigits: 0,
                                        }).format(total)}
                                    </td>
                                    <td colSpan="2">
                                        {efectivo > 0 && `Efectivo: ${new Intl.NumberFormat('es-CL', {
                                            style: 'currency',
                                            currency: 'CLP',
                                            minimumFractionDigits: 0,
                                        }).format(efectivo)}`}
                                        {efectivo > 0 && transferencia > 0 && ' - '}
                                        {transferencia > 0 && `Transferencia: ${new Intl.NumberFormat('es-CL', {
                                            style: 'currency',
                                            currency: 'CLP',
                                            minimumFractionDigits: 0,
                                        }).format(transferencia)}`}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                </div>
            </div>
        </div>
    );
};

export default ShareDetail;