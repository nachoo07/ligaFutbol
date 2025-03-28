import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBars, FaUsers, FaBell, FaMoneyBill, FaChartBar, FaExchangeAlt, FaCalendarCheck, FaUserCog, FaCog, FaEnvelope, FaHome, FaArrowLeft } from 'react-icons/fa';
import { StudentsContext } from '../../context/student/StudentContext';
import Select from 'react-select';
import { Table, Button, Form } from 'react-bootstrap';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './carnetTableGenerator.css';

// Función para precargar una imagen y manejar errores
const preloadImage = (src) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = () => {
            console.error(`Error al cargar la imagen: ${src}`);
            const defaultImg = new Image();
            defaultImg.src = 'https://i.pinimg.com/736x/24/f2/25/24f22516ec47facdc2dc114f8c3de7db.jpg';
            defaultImg.onload = () => resolve(defaultImg);
            defaultImg.onerror = () => reject(new Error(`No se pudo cargar la imagen por defecto`));
        };
    });
};

const CarnetTableGenerator = () => {
    const { estudiantes } = useContext(StudentsContext);
    const navigate = useNavigate();
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [schools, setSchools] = useState([]);
    const [categories, setCategories] = useState([]);
    const [colors, setColors] = useState([]);
    const [filters, setFilters] = useState({ school: '', category: '', color: '', search: '' });
    const carnetContainerRef = useRef(null);
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
        // No mostrar alumnos hasta que se aplique al menos un filtro
        if (!filters.school && !filters.category && !filters.color && !filters.search) {
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
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(
                student =>
                    student.name.toLowerCase().includes(searchLower) ||
                    student.lastName.toLowerCase().includes(searchLower)
            );
        }
        setFilteredStudents(filtered);
        setSelectedStudents([]); // Limpiar selecciones al cambiar filtros
    }, [filters, estudiantes]);

    const handleFilterChange = (name, selectedOption) => {
        setFilters(prev => ({
            ...prev,
            [name]: selectedOption ? selectedOption.value : '',
        }));
    };

    const handleSearchChange = (event) => {
        setFilters(prev => ({
            ...prev,
            search: event.target.value,
        }));
    };

    const handleSelectStudent = (studentId) => {
        setSelectedStudents(prev => {
            if (prev.includes(studentId)) {
                return prev.filter(id => id !== studentId);
            }
            return [...prev, studentId];
        });
    };

    const handleSelectAll = () => {
        if (selectedStudents.length === filteredStudents.length) {
            setSelectedStudents([]);
        } else {
            setSelectedStudents(filteredStudents.map(student => student._id));
        }
    };

    const handleDownloadCarnets = async () => {
        if (selectedStudents.length === 0) {
            alert('Por favor, selecciona al menos un alumno para generar los carnets.');
            return;
        }

        const selectedStudentsData = estudiantes.filter(student => selectedStudents.includes(student._id));
        const carnetsPerPage = 8;
        const carnetWidth = 250;
        const carnetHeight = 150;
        const margin = 10;
        const pageWidth = 595;
        const pageHeight = 842;

        const pdf = new jsPDF('p', 'pt', 'a4');
        let pageIndex = 0;

        const logoUrl = 'https://res.cloudinary.com/dmjjwnvq8/image/upload/v1742408649/Captura_de_pantalla_2025-02-11_a_la_s_9.29.34_p._m._hz04j5.png';

        for (let i = 0; i < selectedStudentsData.length; i += carnetsPerPage) {
            const carnetsForPage = selectedStudentsData.slice(i, i + carnetsPerPage);

            const tempContainer = document.createElement('div');
            tempContainer.style.position = 'absolute';
            tempContainer.style.left = '-9999px';
            tempContainer.style.width = `${pageWidth}px`;
            tempContainer.style.height = `${pageHeight}px`;
            tempContainer.style.display = 'grid';
            tempContainer.style.gridTemplateColumns = `repeat(2, ${carnetWidth}px)`;
            tempContainer.style.gridTemplateRows = `repeat(4, ${carnetHeight}px)`;
            tempContainer.style.gap = `${margin}px`;
            tempContainer.style.padding = '20px';

            const imagePromises = [];
            carnetsForPage.forEach(student => {
                const profileImage = student.profileImage || 'https://i.pinimg.com/736x/24/f2/25/24f22516ec47facdc2dc114f8c3de7db.jpg';
                imagePromises.push(preloadImage(profileImage));
            });
            imagePromises.push(preloadImage(logoUrl));

            try {
                const loadedImages = await Promise.all(imagePromises);
                const logoImage = loadedImages.pop();
                const profileImages = loadedImages;

                carnetsForPage.forEach((student, index) => {
                    const name = student.name || 'Sin Nombre';
                    const lastName = student.lastName || 'Sin Apellido';
                    const dni = student.dni || 'Sin DNI';
                    const category = student.category || 'Sin Categoría';
                    const school = student.school || 'Sin Escuelita';

                    const carnet = document.createElement('div');
                    carnet.className = 'carnet';
                    carnet.style.width = `${carnetWidth}px`;
                    carnet.style.height = `${carnetHeight}px`;
                    carnet.style.border = '1px solid #000';
                    carnet.style.backgroundColor = '#fff';
                    carnet.style.display = 'flex';
                    carnet.style.flexDirection = 'column';

                    const header = document.createElement('div');
                    header.className = 'carnet-header';
                    header.style.backgroundColor = '#003087';
                    header.style.color = '#fff';
                    header.style.textAlign = 'center';
                    header.style.padding = '5px';
                    header.style.fontSize = '10px';
                    header.style.fontWeight = 'bold';
                    header.style.display = 'flex';
                    header.style.alignItems = 'center';
                    header.style.justifyContent = 'center';
                    header.style.gap = '5px';

                    const logo = document.createElement('img');
                    logo.src = logoImage.src;
                    logo.style.width = '20px';
                    logo.style.height = '20px';

                    const headerText = document.createElement('span');
                    headerText.textContent = 'LIGA INFANTIL DE FUTBOL YERBA BUENA';
                    header.appendChild(logo);
                    header.appendChild(headerText);

                    const content = document.createElement('div');
                    content.className = 'carnet-content';
                    content.style.display = 'flex';
                    content.style.padding = '10px';
                    content.style.gap = '10px';
                    content.style.alignItems = 'center';

                    const img = document.createElement('img');
                    img.src = profileImages[index].src;
                    img.style.width = '80px';
                    img.style.height = '100px';
                    img.style.objectFit = 'cover';

                    const info = document.createElement('div');
                    info.style.fontSize = '12px';
                    info.style.flex = '1';
                    info.innerHTML = `
                        <strong>Apellido y Nombre:</strong> ${lastName} ${name}<br>
                        <strong>DNI:</strong> ${dni}<br>
                        <strong>Categoría:</strong> ${category}<br>
                        <strong>Club:</strong> ${school}
                    `;

                    content.appendChild(img);
                    content.appendChild(info);

                    carnet.appendChild(header);
                    carnet.appendChild(content);
                    tempContainer.appendChild(carnet);
                });

                document.body.appendChild(tempContainer);

                const canvas = await html2canvas(tempContainer, { scale: 2, useCORS: true });
                const imgData = canvas.toDataURL('image/png');

                if (pageIndex > 0) {
                    pdf.addPage();
                }
                const imgWidth = pageWidth - 40;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                pdf.addImage(imgData, 'PNG', 20, 20, imgWidth, imgHeight);

                document.body.removeChild(tempContainer);
            } catch (error) {
                console.error('Error al generar el PDF:', error);
                alert('Hubo un error al generar el PDF. Por favor, intenta de nuevo.');
            }
            pageIndex++;
        }

        const schoolFilter = filters.school || 'Todas';
        const categoryFilter = filters.category || 'Todas';
        const colorFilter = filters.color || 'Todos';
        pdf.save(`carnets_${schoolFilter}_${categoryFilter}_${colorFilter}.pdf`);
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
                <div className="carnet-table-generator">
                    <h2>Generar Carnets de Alumnos</h2>
                    {estudiantes.length === 0 ? (
                        <div>Cargando estudiantes...</div>
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
                                    <label>Buscar:</label>
                                    <input
                                        type="text"
                                        placeholder="Buscar por nombre o apellido"
                                        className="form-control"
                                        value={filters.search}
                                        onChange={handleSearchChange}
                                    />
                                </div>
                            </div>
                            <div className="table-actions">
                                <Button onClick={handleSelectAll} variant="secondary">
                                    {selectedStudents.length === filteredStudents.length && filteredStudents.length > 0
                                        ? 'Desmarcar Todos'
                                        : 'Seleccionar Todos'}
                                </Button>
                                <Button onClick={handleDownloadCarnets} variant="primary">
                                    Descargar Carnet
                                </Button>
                            </div>
                            {filteredStudents.length === 0 ? (
                                <div className="no-data-message">
                                    Por favor, aplica al menos un filtro para ver los alumnos.
                                </div>
                            ) : (
                                <Table striped bordered hover responsive>
                                    <thead>
                                        <tr>
                                            <th>Seleccionar</th>
                                            <th>Nombre</th>
                                            <th>Apellido</th>
                                            <th>DNI</th>
                                            <th>Categoría</th>
                                            <th>Escuelita</th>
                                            <th>Color</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredStudents.map(student => (
                                            <tr key={student._id}>
                                                <td>
                                                    <Form.Check
                                                        type="checkbox"
                                                        checked={selectedStudents.includes(student._id)}
                                                        onChange={() => handleSelectStudent(student._id)}
                                                    />
                                                </td>
                                                <td>{student.name}</td>
                                                <td>{student.lastName}</td>
                                                <td>{student.dni}</td>
                                                <td>{student.category}</td>
                                                <td>{student.school}</td>
                                                <td>{student.color}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CarnetTableGenerator;