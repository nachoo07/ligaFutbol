import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaBars, FaUsers, FaAddressCard, FaMoneyBill, FaRegListAlt, FaChartBar, FaExchangeAlt, FaUserCog, FaCog, FaEnvelope, FaHome, FaArrowLeft, FaFileExcel } from 'react-icons/fa';
import { LuClipboardList } from "react-icons/lu";
import { StudentsContext } from '../../context/student/StudentContext';
import Select from 'react-select';
import { Table, Button, Form, Spinner } from 'react-bootstrap';
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

// Función para tomar la primera palabra de un texto
const getFirstWord = (text) => {
    if (!text) return '';
    const words = text.trim().split(/\s+/);
    return words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
};

const CarnetTableGenerator = () => {
    const { estudiantes, obtenerEstudiantes } = useContext(StudentsContext);
    const navigate = useNavigate();
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [schools, setSchools] = useState([]);
    const [categories, setCategories] = useState([]);
    const [colors, setColors] = useState([]);
    const [filters, setFilters] = useState({ school: '', category: '', color: '', search: '' });
    const [isMenuOpen, setIsMenuOpen] = useState(true);
    const [loading, setLoading] = useState(true); // Estado de carga
    const [downloading, setDownloading] = useState(false); // Estado de descarga

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
        const loadStudents = async () => {
            setLoading(true);
            if (!estudiantes || estudiantes.length === 0) {
                await obtenerEstudiantes();
            }
            setLoading(false);
        };
        loadStudents();
    }, [estudiantes, obtenerEstudiantes]);

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
        setSelectedStudents([]);
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

    const capitalizeInitials = (text) => {
        if (!text) return '';
        return text
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

    const handleDownloadCarnets = async () => {
        if (selectedStudents.length === 0) {
            alert('Por favor, selecciona al menos un alumno para generar los carnets.');
            return;
        }

        setDownloading(true); // Activar el estado de descarga
        const selectedStudentsData = estudiantes.filter(student => selectedStudents.includes(student._id));
        const carnetsPerPage = 10; // 2 columnas de 4 carnets por columna
        const carnetWidth = 250; // Ancho del carnet
        const carnetHeight = 150; // Alto del carnet
        const margin = 13; // Margen entre carnets
        const pageWidth = 595; // Ancho de la página A4 en puntos (pt)
        const pageHeight = 842; // Alto de la página A4 en puntos (pt)

        const pdf = new jsPDF('p', 'pt', 'a4');
        let pageIndex = 0;

        const carnetBackgroundUrl = 'https://res.cloudinary.com/dmjjwnvq8/image/upload/v1743467421/2025_vn4ksb.png';

        for (let i = 0; i < selectedStudentsData.length; i += carnetsPerPage) {
            const carnetsForPage = selectedStudentsData.slice(i, i + carnetsPerPage);

            const tempContainer = document.createElement('div');
            tempContainer.style.position = 'absolute';
            tempContainer.style.left = '-9999px';
            tempContainer.style.width = `${pageWidth}px`;
            tempContainer.style.height = `${pageHeight}px`;
            tempContainer.style.display = 'grid';
            tempContainer.style.gridTemplateColumns = `repeat(2, ${carnetWidth}px)`; // 2 columnas
            tempContainer.style.gridTemplateRows = `repeat(5, ${carnetHeight}px)`; // 5 filas
            tempContainer.style.gap = `${margin}px`;
            tempContainer.style.padding = '10px';
            tempContainer.style.boxSizing = 'border-box';
            tempContainer.style.justifyContent = 'center'; // Centrar las columnas en la página

            const imagePromises = [];
            carnetsForPage.forEach(student => {
                const profileImage = student.profileImage || 'https://i.pinimg.com/736x/24/f2/25/24f22516ec47facdc2dc114f8c3de7db.jpg';
                imagePromises.push(preloadImage(profileImage));
            });
            imagePromises.push(preloadImage(carnetBackgroundUrl));

            try {
                const loadedImages = await Promise.all(imagePromises);
                const carnetBackgroundImage = loadedImages.pop(); // Imagen de fondo del carnet
                const profileImages = loadedImages; // Fotos de perfil de los estudiantes

                carnetsForPage.forEach((student, index) => {
                    const name = getFirstWord(student.name) || 'Sin Nombre'; // Solo primera palabra del nombre
                    const lastName = getFirstWord(student.lastName) || 'Sin Apellido'; // Solo primera palabra del apellido
                    const dni = student.dni || 'Sin DNI';
                    const birthDate = student.birthDate || 'Sin Fecha'; // Fecha de nacimiento
                    const school = student.school || 'Sin Escuelita';

                    const carnet = document.createElement('div');
                    carnet.className = 'carnet';
                    carnet.style.width = `${carnetWidth}px`;
                    carnet.style.height = `${carnetHeight}px`;
                    carnet.style.position = 'relative';
                    carnet.style.overflow = 'hidden';

                    // Imagen de fondo del carnet
                    const background = document.createElement('img');
                    background.src = carnetBackgroundImage.src;
                    background.style.width = '100%';
                    background.style.height = '100%';
                    background.style.position = 'absolute';
                    background.style.top = '0';
                    background.style.left = '0';
                    background.style.zIndex = '1';
                    carnet.appendChild(background);

                    // Contenedor para los datos
                    const dataContainer = document.createElement('div');
                    dataContainer.style.position = 'absolute';
                    dataContainer.style.top = '0';
                    dataContainer.style.left = '0';
                    dataContainer.style.width = '100%';
                    dataContainer.style.height = '100%';
                    dataContainer.style.zIndex = '2';

                    // Foto de perfil
                    const profileImg = document.createElement('img');
                    profileImg.src = profileImages[index].src;
                    profileImg.style.position = 'absolute';
                    profileImg.style.left = '8px'; // Ajustado según la imagen
                    profileImg.style.top = '27px'; // Ajustado según la imagen
                    profileImg.style.width = '98px'; // Ajustado según la imagen
                    profileImg.style.height = '98px'; // Ajustado según la imagen
                    profileImg.style.objectFit = 'cover';
                    dataContainer.appendChild(profileImg);

                    // Nombre y Apellido (solo primera palabra)
                    const nameText = document.createElement('div');
                    nameText.textContent = `${name} ${lastName}`;
                    nameText.style.position = 'absolute';
                    nameText.style.left = '120px'; // Ajustado según la imagen
                    nameText.style.top = '35px'; // Ajustado según la imagen
                    nameText.style.fontSize = '10px';
                    nameText.style.color = '#000';
                    nameText.style.maxWidth = '120px'; // Ajustado para evitar desbordamiento
                    nameText.style.overflow = 'hidden';
                    nameText.style.textOverflow = 'ellipsis';
                    dataContainer.appendChild(nameText);

                    // DNI
                    const dniText = document.createElement('div');
                    dniText.textContent = dni;
                    dniText.style.position = 'absolute';
                    dniText.style.left = '120px'; // Ajustado según la imagen
                    dniText.style.top = '58px'; // Ajustado según la imagen
                    dniText.style.fontSize = '10px';
                    dniText.style.color = '#000';
                    dataContainer.appendChild(dniText);

                    // Fecha de Nacimiento
                    const birthDateText = document.createElement('div');
                    birthDateText.textContent = birthDate;
                    birthDateText.style.position = 'absolute';
                    birthDateText.style.left = '120px'; // Ajustado según la imagen
                    birthDateText.style.top = '80px'; // Ajustado según la imagen
                    birthDateText.style.fontSize = '10px';
                    birthDateText.style.color = '#000';
                    dataContainer.appendChild(birthDateText);

                    // Club
                    const clubText = document.createElement('div');
                    clubText.textContent = school;
                    clubText.style.position = 'absolute';
                    clubText.style.left = '120px'; // Ajustado según la imagen
                    clubText.style.top = '103px'; // Ajustado según la imagen
                    clubText.style.fontSize = '10px';
                    clubText.style.color = '#000';
                    clubText.style.maxWidth = '120px'; // Ajustado para evitar desbordamiento
                    clubText.style.overflow = 'hidden';
                    clubText.style.textOverflow = 'ellipsis';
                    dataContainer.appendChild(clubText);

                    carnet.appendChild(dataContainer);
                    tempContainer.appendChild(carnet);
                });

                document.body.appendChild(tempContainer);

                const canvas = await html2canvas(tempContainer, { scale: 2, useCORS: true });
                const imgData = canvas.toDataURL('image/png');

                if (pageIndex > 0) {
                    pdf.addPage();
                }
                const imgWidth = pageWidth - 20;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);

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
        setDownloading(false); // Desactivar el estado de descarga
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
                    {loading ? (
                        <div className="text-center">
                            <Spinner animation="border" role="status" />
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
                                <Button onClick={handleSelectAll} variant="secondary" disabled={downloading}>
                                    {selectedStudents.length === filteredStudents.length && filteredStudents.length > 0
                                        ? 'Desmarcar Todos'
                                        : 'Seleccionar Todos'}
                                </Button>
                                <Button onClick={handleDownloadCarnets} variant="primary" disabled={downloading}>
                                    {downloading ? (
                                        <>
                                            <Spinner
                                                as="span"
                                                animation="border"
                                                size="sm"
                                                role="status"
                                                aria-hidden="true"
                                            />
                                            {' Generando...'}
                                        </>
                                    ) : (
                                        'Descargar Carnet'
                                    )}
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
                                                        disabled={downloading}
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