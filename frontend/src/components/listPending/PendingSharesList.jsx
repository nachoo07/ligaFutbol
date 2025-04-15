import React, { useState, useEffect, useContext } from 'react';
import { SharesContext } from '../../context/share/ShareContext';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaBars, FaUsers, FaAddressCard, FaMoneyBill, FaRegListAlt, FaChartBar, FaExchangeAlt, FaUserCog, FaCog, FaEnvelope, FaHome, FaArrowLeft, FaFileExcel } from 'react-icons/fa';
import { LuClipboardList } from "react-icons/lu";
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
    const [semesters, setSemesters] = useState([]);
    const [filters, setFilters] = useState({ school: '', category: '', color: '', semester: '', status: 'all' });
    const [isMenuOpen, setIsMenuOpen] = useState(true);

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
        { name: 'Envios de Mail', route: '/email', icon: <FaEnvelope /> },
        { name: 'Volver Atrás', route: null, action: () => navigate(-1), icon: <FaArrowLeft /> },
    ];

    useEffect(() => {
        obtenerCuotas();
    }, [obtenerCuotas]);

    useEffect(() => {
        if (cuotas && Array.isArray(cuotas)) {
            // Extraer escuelitas
            const uniqueSchools = [...new Set(cuotas.map(share => share.student.school))]
                .filter(school => school)
                .map(school => ({
                    value: school,
                    label: school,
                }));

            // Extraer categorías
            const uniqueCategories = [...new Set(cuotas.map(share => share.student.category))]
                .filter(category => category)
                .map(category => ({
                    value: category,
                    label: category,
                }));

            // Extraer colores
            const uniqueColors = [...new Set(cuotas.map(share => share.student.color))]
                .filter(color => color)
                .map(color => ({
                    value: color,
                    label: color,
                }));

            // Extraer semestres del paymentName
            const uniqueSemesters = [...new Set(cuotas.map(share => {
                const match = share.paymentName.match(/Semestre (\d+)/i);
                return match ? `Semestre ${match[1]}` : null;
            }))]
                .filter(semester => semester)
                .map(semester => ({
                    value: semester,
                    label: semester,
                }));

            setSchools(uniqueSchools);
            setCategories(uniqueCategories);
            setColors(uniqueColors);
            setSemesters(uniqueSemesters);
        }
    }, [cuotas]);

    useEffect(() => {
        // Si no hay filtros seleccionados, no mostrar datos
        if (!filters.school && !filters.category && !filters.color && !filters.semester && filters.status === 'all') {
            setFilteredShares([]);
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
        if (filters.semester) {
            filtered = filtered.filter(share => {
                const match = share.paymentName.match(/Semestre (\d+)/i);
                const semester = match ? `Semestre ${match[1]}` : null;
                return semester === filters.semester;
            });
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

    // Función para obtener el primer nombre
    const getFirstName = (fullName) => {
        if (!fullName) return '';
        const names = fullName.trim().split(' ');
        return names[0]; // Tomar solo el primer nombre
    };

    // Función para obtener el primer apellido
    const getFirstLastName = (fullLastName) => {
        if (!fullLastName) return '';
        const lastNames = fullLastName.trim().split(' ');
        return lastNames[0]; // Tomar solo el primer apellido
    };

    const exportToPDF = () => {
        const doc = new jsPDF();
        doc.text('Lista de Cuotas Pendientes', 14, 16);

        const tableData = filteredShares.map(share => [
            getFirstName(share.student.name), // Solo el primer nombre
            getFirstLastName(share.student.lastName), // Solo el primer apellido
            share.student.dni,
            share.student.school,
            share.paymentName,
            share.status === 'Pagado' ? share.amount.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }) : '-',
            share.status,
        ]);

        autoTable(doc, {
            head: [['Nombre', 'Apellido', 'DNI', 'Escuela', 'Concepto', 'Monto', 'Estado']],
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
                        <span class="text">{item.name}</span>
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
                            <label>Semestre:</label>
                            <Select
                                options={semesters}
                                onChange={(option) => handleFilterChange('semester', option)}
                                placeholder="Selecciona un semestre"
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
                                    <th>Concepto</th>
                                    <th>Monto</th>
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
                                        <td>{share.paymentName}</td>
                                        <td>{share.status === 'Pagado' ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(share.amount) : '-'}</td>
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