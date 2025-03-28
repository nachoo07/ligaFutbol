import React, { useState, useEffect, useContext } from 'react';
import { SharesContext } from '../../context/share/ShareContext';
import { useNavigate } from 'react-router-dom';
import { FaBars, FaUsers, FaBell, FaMoneyBill, FaChartBar, FaExchangeAlt, FaCalendarCheck, FaUserCog, FaCog, FaEnvelope, FaHome, FaArrowLeft } from 'react-icons/fa';
import Select from 'react-select';
import { Table, Button } from 'react-bootstrap';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import './pendingShareList.css';

const PendingSharesList = () => {
    const { cuotas, obtenerCuotas, loading } = useContext(SharesContext);
    const navigate = useNavigate();

    const [filteredShares, setFilteredShares] = useState([]);
    const [schools, setSchools] = useState([]);
    const [categories, setCategories] = useState([]);
    const [colors, setColors] = useState([]);
    const [filters, setFilters] = useState({ school: '', category: '', color: '', status: 'all' });
    const [isMenuOpen, setIsMenuOpen] = useState(true);

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
        { name: 'Volver Atrás', route: null, action: () => navigate(-1), icon: <FaArrowLeft /> },
    ];

    useEffect(() => {
        obtenerCuotas();
    }, [obtenerCuotas]);

    useEffect(() => {
        if (cuotas && Array.isArray(cuotas)) {
            const uniqueSchools = [...new Set(cuotas.map(share => share.student.school))]
                .filter(school => school)
                .map(school => ({
                    value: school,
                    label: school,
                }));
            const uniqueCategories = [...new Set(cuotas.map(share => share.student.category))]
                .filter(category => category)
                .map(category => ({
                    value: category,
                    label: category,
                }));
            const uniqueColors = [...new Set(cuotas.map(share => share.student.color))]
                .filter(color => color)
                .map(color => ({
                    value: color,
                    label: color,
                }));
            setSchools(uniqueSchools);
            setCategories(uniqueCategories);
            setColors(uniqueColors);
        }
    }, [cuotas]);

    useEffect(() => {
        // Si no hay filtros seleccionados, no mostrar datos
        if (!filters.school && !filters.category && !filters.color && !filters.status) {
            setFilteredShares([]); // Tabla vacía
            return;
        }
    
        // Aplicar filtros
        let filtered = cuotas || [];
        if (filters.school) {
            filtered = filtered.filter(share => share.student.school === filters.school);
        }
        if (filters.category) {
            filtered = filtered.filter(share => share.student.category === filters.category);
        }
        if (filters.color) {
            filtered = filtered.filter(share => share.student.color === filters.color);
        }
        if (filters.status && filters.status !== 'all') {
            filtered = filtered.filter(share => share.status === filters.status);
        }
    
        setFilteredShares(filtered);
    }, [filters, cuotas]);
    

    const handleFilterChange = (name, selectedOption) => {
        setFilters(prev => ({
            ...prev,
            [name]: selectedOption ? selectedOption.value : '',
        }));
    };

    const exportToPDF = () => {
        const doc = new jsPDF();
        doc.text('Lista de Cuotas Pendientes', 14, 16);

        const tableData = filteredShares.map(share => [
            share.student.name,
            share.student.lastName,
            share.student.dni,
            share.student.school,
            share.status,
        ]);

        autoTable(doc, {
            head: [['Nombre', 'Apellido', 'DNI', 'Escuela', 'Estado']],
            body: tableData,
            startY: 20,
        });

        doc.save('cuotas_pendientes.pdf');
    };

    return (
        <div className="dashboard-container-student">
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

        <div className="content-student">
            <div className="students-view">
                <h1 className="title">Cuotas Pendientes</h1>
                <div className="filters">
                    <div className="filter-group">
                        <label>Escuelita:</label>
                        <Select
                            options={schools}
                            onChange={(option) => handleFilterChange('school', option)}
                            placeholder="Selecciona una escuelita"
                            isClearable
                        />
                    </div>
                    <div className="filter-group">
                        <label>Categoría:</label>
                        <Select
                            options={categories}
                            onChange={(option) => handleFilterChange('category', option)}
                            placeholder="Selecciona una categoría"
                            isClearable
                        />
                    </div>
                    <div className="filter-group">
                        <label>Color:</label>
                        <Select
                            options={colors}
                            onChange={(option) => handleFilterChange('color', option)}
                            placeholder="Selecciona un color"
                            isClearable
                        />
                    </div>
                    <div className="filter-group">
                        <label>Estado:</label>
                        <Select
                            options={[
                                { value: 'all', label: 'Todos' },
                                { value: 'Pagado', label: 'Pagado' },
                                { value: 'Pendiente', label: 'Pendiente' },
                            ]}
                            onChange={(option) => handleFilterChange('status', option)}
                            placeholder="Selecciona un estado"
                            isClearable
                        />
                    </div>
                </div>

                <div className="table-actions">
                    <Button onClick={exportToPDF} variant="primary" disabled={filteredShares.length === 0}>
                        Exportar a PDF
                    </Button>
                </div>

                {filteredShares.length > 0 ? (
                    <Table className="students-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Nombre</th>
                                <th>Apellido</th>
                                <th>DNI</th>
                                <th>Escuela</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredShares.map((share, index) => (
                                <tr key={index} className={share.status === 'Pendiente' ? 'state-inactivo' : 'state-activo'}>
                                    <td>{index + 1}</td>
                                    <td>{share.student.name}</td>
                                    <td>{share.student.lastName}</td>
                                    <td>{share.student.dni}</td>
                                    <td>{share.student.school}</td>
                                    <td>{share.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                ) : (
                    <div className="no-data-message">
                        Por favor, selecciona al menos un filtro para ver las cuotas pendientes.
                    </div>
                )}
            </div>
        </div>
    </div>
    );
};

export default PendingSharesList;