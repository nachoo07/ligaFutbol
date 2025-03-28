import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom'; // Agregamos useNavigate para la navegación
import { FaBars, FaUsers, FaBell, FaMoneyBill, FaChartBar, FaExchangeAlt, FaCalendarCheck, FaUserCog, FaCog, FaEnvelope, FaHome, FaArrowLeft } from 'react-icons/fa'; // Íconos para el menú
import { StudentsContext } from '../../context/student/StudentContext';
import Select from 'react-select';
import { Table, Button } from 'react-bootstrap';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import './listaStudent.css';

const ListStudent = () => {
    const { estudiantes } = useContext(StudentsContext);
    const navigate = useNavigate(); // Hook para la navegación
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [schools, setSchools] = useState([]);
    const [categories, setCategories] = useState([]);
    const [colors, setColors] = useState([]);
    const [filters, setFilters] = useState({ school: '', category: '', color: '' });
    const [isMenuOpen, setIsMenuOpen] = useState(true); // Estado para controlar el menú

    // Definir los ítems del menú (igual que en los otros componentes)
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
        if (estudiantes && Array.isArray(estudiantes)) {
            const uniqueSchools = [...new Set(estudiantes.map(student => student.school))]
                .filter(school => school)
                .map(school => ({
                    value: school,
                    label: school,
                }));
            const uniqueCategories = [...new Set(estudiantes.map(student => student.category))]
                .filter(category => category)
                .map(category => ({
                    value: category,
                    label: category,
                }));
            const uniqueColors = [...new Set(estudiantes.map(student => student.color))]
                .filter(color => color)
                .map(color => ({
                    value: color,
                    label: color,
                }));
            setSchools(uniqueSchools);
            setCategories(uniqueCategories);
            setColors(uniqueColors);
        }
    }, [estudiantes]);

    useEffect(() => {
        if (!filters.school && !filters.category && !filters.color) {
            setFilteredStudents([]);
            return;
        }

        let filtered = estudiantes || [];
        if (filters.school) {
            filtered = filtered.filter(student => student.school === filters.school);
        }
        if (filters.category) {
            filtered = filtered.filter(student => student.category === filters.category);
        }
        if (filters.color) {
            filtered = filtered.filter(student => student.color === filters.color);
        }
        setFilteredStudents(filtered);
    }, [filters, estudiantes]);

    const handleFilterChange = (name, selectedOption) => {
        setFilters(prev => ({
            ...prev,
            [name]: selectedOption ? selectedOption.value : '',
        }));
    };

    const handleExportToExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Lista de Alumnos');

        worksheet.columns = [
            { key: 'number', width: 5 },
            { key: 'name', width: 30 },
            { key: 'dni', width: 15 },
            { key: 'vs1', width: 5 },
            { key: 'vs2', width: 5 },
            { key: 'vs3', width: 5 },
            { key: 'vs4', width: 5 },
            { key: 'vs5', width: 5 },
            { key: 'vs6', width: 5 },
            { key: 'vs7', width: 5 },
            { key: 'vs8', width: 5 },
            { key: 'vs9', width: 5 },
        ];

        worksheet.getCell('A1').value = 'LIGA INFANTIL DE FUTBOL YERBA BUENA 2022';
        worksheet.getCell('A1').font = { bold: true, size: 14 };
        worksheet.getCell('A1').alignment = { horizontal: 'center' };
        worksheet.mergeCells('A1:L1');

        worksheet.getCell('A3').value = `CLUB PARTICIPANTE: ${filters.school || '__________'}`;
        worksheet.getCell('E3').value = `CATEGORÍA: ${filters.category || '__________'}`;
        worksheet.getCell('I3').value = 'ZONA: __________';

        const tableHeader = ['N°', 'NOMBRE Y APELLIDO', 'D.N.I', 'VS', 'VS', 'VS', 'VS', 'VS', 'VS', 'VS', 'VS', 'VS'];
        worksheet.addRow(tableHeader);
        const headerRow = worksheet.getRow(5);
        headerRow.eachCell(cell => {
            cell.font = { bold: true };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
            };
        });

        for (let i = 0; i < 18; i++) {
            const student = filteredStudents[i];
            const row = {
                number: (i + 1).toString(),
                name: student ? `${student.lastName} ${student.name}` : '',
                dni: student ? student.dni : '',
                vs1: '',
                vs2: '',
                vs3: '',
                vs4: '',
                vs5: '',
                vs6: '',
                vs7: '',
                vs8: '',
                vs9: '',
            };
            worksheet.addRow(row);
            const dataRow = worksheet.getRow(i + 6);
            dataRow.eachCell(cell => {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' },
                };
            });
        }

        worksheet.getCell('A24').value = 'RESULTADO';
        worksheet.getCell('A26').value = 'FIRMA DEL DELEGADO';
        worksheet.getCell('J26').value = 'FIRMA DEL ÁRBITRO';

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const schoolFilter = filters.school || 'Todas';
        const categoryFilter = filters.category || 'Todas';
        const colorFilter = filters.color || 'Todos';
        saveAs(blob, `lista_alumnos_${schoolFilter}_${categoryFilter}_${colorFilter}.xlsx`);
    };

    const previewData = [];
    for (let i = 0; i < 18; i++) {
        const student = filteredStudents[i];
        previewData.push({
            number: i + 1,
            name: student ? `${student.lastName} ${student.name}` : '',
            dni: student ? student.dni : '',
        });
    }

    return (
        <div className="dashboard-container-student">
            {/* Menú vertical */}
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

            {/* Contenido principal */}
            <div className="content-student">
                <div className="student-list-exporter">
                    <h2>Exportar Lista de Alumnos</h2>
                    {estudiantes.length === 0 ? (
                        <div>Cargando estudiantes...</div>
                    ) : (
                        <>
                            {/* Filtros */}
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
                            </div>

                            {/* Botón de Exportación */}
                            <div className="table-actions">
                                <Button onClick={handleExportToExcel} variant="primary">
                                    Exportar a Excel
                                </Button>
                            </div>

                            {/* Vista Previa */}
                            {filteredStudents.length > 0 ? (
                                <div className="preview-container">
                                    <div className="preview-header">
                                        <img
                                            src="https://res.cloudinary.com/dmjjwnvq8/image/upload/v1742408649/Captura_de_pantalla_2025-02-11_a_la_s_9.29.34_p._m._hz04j5.png"
                                            alt="Logo"
                                            className="preview-logo"
                                        />
                                        <h1>LIGA INFANTIL DE FUTBOL YERBA BUENA 2022</h1>
                                    </div>
                                    <div className="preview-info">
                                        <p>CLUB PARTICIPANTE: {filters.school || '__________'}</p>
                                        <p>CATEGORÍA: {filters.category || '__________'}</p>
                                        <p>ZONA: __________</p>
                                    </div>
                                    <Table bordered className="preview-table">
                                        <thead>
                                            <tr>
                                                <th>N°</th>
                                                <th>NOMBRE Y APELLIDO</th>
                                                <th>D.N.I</th>
                                                <th>VS</th>
                                                <th>VS</th>
                                                <th>VS</th>
                                                <th>VS</th>
                                                <th>VS</th>
                                                <th>VS</th>
                                                <th>VS</th>
                                                <th>VS</th>
                                                <th>VS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewData.map((row, index) => (
                                                <tr key={index}>
                                                    <td>{row.number}</td>
                                                    <td>{row.name}</td>
                                                    <td>{row.dni}</td>
                                                    <td></td>
                                                    <td></td>
                                                    <td></td>
                                                    <td></td>
                                                    <td></td>
                                                    <td></td>
                                                    <td></td>
                                                    <td></td>
                                                    <td></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                    <div className="preview-footer">
                                        <p>RESULTADO</p>
                                        <div className="signatures">
                                            <p>FIRMA DEL DELEGADO</p>
                                            <p>FIRMA DEL ÁRBITRO</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="no-data-message">
                                    Por favor, selecciona al menos un filtro para ver los alumnos.
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ListStudent;