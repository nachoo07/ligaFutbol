import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaBars, FaUsers,FaAddressCard, FaMoneyBill,FaRegListAlt, FaChartBar, FaExchangeAlt, FaUserCog, FaCog, FaEnvelope, FaHome, FaArrowLeft, FaFileExcel } from 'react-icons/fa';
import { LuClipboardList } from "react-icons/lu";
import { StudentsContext } from '../../context/student/StudentContext';
import Select from 'react-select';
import { Table, Button, Spinner } from 'react-bootstrap';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import './listaStudent.css';

const ListStudent = () => {
    const { estudiantes, obtenerEstudiantes } = useContext(StudentsContext);
    const navigate = useNavigate();
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [schools, setSchools] = useState([]);
    const [categories, setCategories] = useState([]);
    const [colors, setColors] = useState([]);
    const [filters, setFilters] = useState({ school: '', category: '', color: '' });
    const [isMenuOpen, setIsMenuOpen] = useState(true);
    const [loading, setLoading] = useState(true); // Estado de carga

    // Categorías agrupadas predefinidas
    const groupedCategories = [
        { value: '2011-2012', label: '2011-2012', years: ['2011', '2012'] },
        { value: '2013-2014', label: '2013-2014', years: ['2013', '2014'] },
        { value: '2015-2016', label: '2015-2016', years: ['2015', '2016'] },
        { value: '2017-2018', label: '2017-2018', years: ['2017', '2018'] },
        { value: '2019-2020-2021', label: '2019-2020-2021', years: ['2019', '2020', '2021'] },
        { value: '2010-2011-2012', label: '2010-2011-2012', years: ['2010', '2011', '2012'] },
        { value: '2015-2016-2017', label: '2015-2016-2017', years: ['2015', '2016', '2017'] },
    ];

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
        { name: 'Envios de Mail', route: '/email-notifications', icon: <FaEnvelope /> },
        { name: 'Volver Atrás', route: null, action: () => navigate(-1), icon: <FaArrowLeft /> },
    ];

    // Cargar estudiantes si no están en el contexto
    useEffect(() => {
        const fetchStudents = async () => {
            setLoading(true);
            if (!estudiantes || estudiantes.length === 0) {
                await obtenerEstudiantes();
            }
            setLoading(false);
        };
        fetchStudents();
    }, [obtenerEstudiantes, estudiantes]);

    // Cargar escuelas al inicio
    useEffect(() => {
        if (estudiantes && Array.isArray(estudiantes)) {
            const uniqueSchools = [...new Set(estudiantes.map(student => student.school))]
                .filter(school => school)
                .map(school => ({
                    value: school,
                    label: school,
                }));
            setSchools(uniqueSchools);
        }
    }, [estudiantes]);

    // Actualizar categorías cuando cambia la escuelita
    useEffect(() => {
        if (filters.school && estudiantes && Array.isArray(estudiantes)) {
            const studentsInSchool = estudiantes.filter(student => student.school === filters.school);
            const availableYears = [...new Set(studentsInSchool.map(student => student.category))];
            const availableCategories = groupedCategories.filter(group =>
                group.years.some(year => availableYears.includes(year))
            );
            setCategories(availableCategories);

            // Resetear categoría y color si la escuelita cambia
            if (!availableCategories.some(cat => cat.value === filters.category)) {
                setFilters(prev => ({ ...prev, category: '', color: '' }));
                setColors([]);
            }
        } else {
            setCategories([]);
            setFilters(prev => ({ ...prev, category: '', color: '' }));
            setColors([]);
        }
    }, [filters.school, estudiantes]);

    // Actualizar colores cuando cambia la categoría
    useEffect(() => {
        if (filters.school && filters.category && estudiantes && Array.isArray(estudiantes)) {
            const selectedGroup = groupedCategories.find(group => group.value === filters.category);
            if (selectedGroup) {
                const studentsInSchoolAndCategory = estudiantes.filter(student =>
                    student.school === filters.school &&
                    selectedGroup.years.includes(student.category)
                );
                const uniqueColors = [...new Set(studentsInSchoolAndCategory.map(student => student.color))]
                    .filter(color => color)
                    .map(color => ({
                        value: color,
                        label: color,
                    }));
                setColors(uniqueColors);

                // Resetear color si la categoría cambia
                if (!uniqueColors.some(col => col.value === filters.color)) {
                    setFilters(prev => ({ ...prev, color: '' }));
                }
            }
        } else {
            setColors([]);
            setFilters(prev => ({ ...prev, color: '' }));
        }
    }, [filters.school, filters.category, estudiantes]);

    // Filtrar estudiantes
    useEffect(() => {
        if (!filters.school) {
            setFilteredStudents([]);
            return;
        }

        let filtered = estudiantes || [];
        if (filters.school) {
            filtered = filtered.filter(student => student.school === filters.school);
        }
        if (filters.category) {
            const selectedGroup = groupedCategories.find(group => group.value === filters.category);
            if (selectedGroup) {
                filtered = filtered.filter(student => selectedGroup.years.includes(student.category));
            }
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
            { key: 'birthDate', width: 15 },
            { key: 'vs1', width: 5 },
            { key: 'vs2', width: 5 },
            { key: 'vs3', width: 5 },
            { key: 'vs4', width: 5 },
            { key: 'vs5', width: 5 },
            { key: 'vs6', width: 5 },
            { key: 'vs7', width: 5 },
            { key: 'vs8', width: 5 },
            { key: 'semifinal', width: 15 },
            { key: 'end', width: 15 },
        ];

        worksheet.getCell('A1').value = 'LIGA INFANTIL DE FUTBOL YERBA BUENA 2025';
        worksheet.getCell('A1').font = { bold: true, size: 14 };
        worksheet.getCell('A1').alignment = { horizontal: 'center' };
        worksheet.mergeCells('A1:N1');

        worksheet.getCell('A3').value = `CLUB PARTICIPANTE: ${filters.school || '__________'}`;
        worksheet.getCell('E3').value = `CATEGORÍA: ${filters.category || '__________'}`;

        const tableHeader = ['N°', 'NOMBRE Y APELLIDO', 'D.N.I', 'FECHA NACIMIENTO', 'VS', 'VS', 'VS', 'VS', 'VS', 'VS', 'VS', 'VS', 'SEMIFINAL', 'FINAL'];
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
                birthDate: student ? student.birthDate : '',
                vs1: '',
                vs2: '',
                vs3: '',
                vs4: '',
                vs5: '',
                vs6: '',
                vs7: '',
                vs8: '',
                semifinal: '',
                end: '',
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
            birthDate: student ? student.birthDate : '',
        });
    }

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
                <div className="student-list-exporter">
                    <h2>Exportar Lista de Buena Fe</h2>
                    {loading ? (
                        <div className="loading-container">
                            <Spinner animation="border" variant="primary" />
                            <p>Cargando estudiantes...</p>
                        </div>
                    ) : estudiantes.length === 0 ? (
                        <div>No se encontraron estudiantes.</div>
                    ) : (
                        <>
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
                                        isDisabled={!filters.school} // Deshabilitado hasta que haya escuelita
                                    />
                                </div>
                                <div className="filter-group">
                                    <label>Color:</label>
                                    <Select
                                        options={colors}
                                        onChange={(option) => handleFilterChange('color', option)}
                                        placeholder="Selecciona un color"
                                        isClearable
                                        isDisabled={!filters.category} // Deshabilitado hasta que haya categoría
                                    />
                                </div>
                            </div>

                            <div className="table-actions">
                                <Button onClick={handleExportToExcel} variant="primary">
                                    Exportar a Excel
                                </Button>
                            </div>

                            {filteredStudents.length > 0 ? (
                                <div className="preview-container">
                                    <div className="preview-header">
                                        <h1>LIGA INFANTIL DE FUTBOL YERBA BUENA 2025</h1>
                                    </div>
                                    <div className="preview-info">
                                        <p>CLUB PARTICIPANTE: {filters.school || '__________'}</p>
                                        <p>CATEGORÍA: {filters.category || '__________'}</p>
                                        <p>COLOR: {filters.color || '__________'}</p>
                                    </div>
                                    <Table bordered className="preview-table">
                                        <thead>
                                            <tr>
                                                <th>N°</th>
                                                <th>NOMBRE Y APELLIDO</th>
                                                <th>D.N.I</th>
                                                <th>FECHA NACIMIENTO</th>
                                                <th>VS</th>
                                                <th>VS</th>
                                                <th>VS</th>
                                                <th>VS</th>
                                                <th>VS</th>
                                                <th>VS</th>
                                                <th>VS</th>
                                                <th>VS</th>
                                                <th>SEMIFINAL</th>
                                                <th>FINAL</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewData.map((row, index) => (
                                                <tr key={index}>
                                                    <td>{row.number}</td>
                                                    <td>{row.name}</td>
                                                    <td>{row.dni}</td>
                                                    <td>{row.birthDate}</td>
                                                    <td></td>
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
                                    Por favor, selecciona al menos una escuelita para ver los alumnos.
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