import React, { useState, useEffect, useContext } from 'react';
import { SharesContext } from '../../context/share/ShareContext';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaBars, FaUsers, FaAddressCard, FaMoneyBill, FaRegListAlt, FaChartBar, FaExchangeAlt, FaUserCog, FaEnvelope, FaHome, FaArrowLeft, FaFileExcel } from 'react-icons/fa';
import { LuClipboardList } from "react-icons/lu";
import Select from 'react-select';
import { Table, Button } from 'react-bootstrap';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import './pendingShareList.css';

const PendingSharesList = () => {
  const { cuotas, obtenerCuotas, loading } = useContext(SharesContext);
  const navigate = useNavigate();

  const [studentShares, setStudentShares] = useState([]);
  const [schools, setSchools] = useState([]);
  const [categories, setCategories] = useState([]);
  const [colors, setColors] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [filters, setFilters] = useState({ school: '', category: '', color: '', semester: '', status: 'all' });
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [maxShares, setMaxShares] = useState(1);

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
    console.log('Cuotas recibidas:', cuotas);
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
    console.log('Filtros aplicados:', filters);
    if (!cuotas || !Array.isArray(cuotas)) {
      setStudentShares([]);
      return;
    }

    // Solo procesar si hay al menos un filtro seleccionado
    const hasFilters = filters.school || filters.category || filters.color || filters.semester || (filters.status && filters.status !== 'all');
    if (!hasFilters) {
      setStudentShares([]);
      return;
    }

    let filtered = [...cuotas];
    if (filters.school) {
      console.log('Filtrando por escuela:', filters.school);
      filtered = filtered.filter(share => share.student.school === filters.school);
    }
    if (filters.category) {
      console.log('Filtrando por categoría:', filters.category);
      filtered = filtered.filter(share => share.student.category === filters.category);
    }
    if (filters.color) {
      console.log('Filtrando por color:', filters.color);
      filtered = filtered.filter(share => share.student.color === filters.color);
    }
    if (filters.semester) {
      console.log('Filtrando por semestre:', filters.semester);
      filtered = filtered.filter(share => {
        const match = share.paymentName.match(/Semestre (\d+)/i);
        const semester = match ? `Semestre ${match[1]}` : null;
        return semester === filters.semester;
      });
    }
    if (filters.status && filters.status !== 'all') {
      console.log('Filtrando por estado:', filters.status);
      filtered = filtered.filter(share => share.status === filters.status);
    }

    console.log('Datos filtrados:', filtered);

    // Agrupar cuotas por estudiante
    const groupedByStudent = filtered.reduce((acc, share) => {
      const studentId = share.student._id;
      if (!acc[studentId]) {
        acc[studentId] = {
          student: share.student,
          shares: [],
        };
      }
      acc[studentId].shares.push(share);
      return acc;
    }, {});

    const studentArray = Object.values(groupedByStudent);
    console.log('Estudiantes agrupados:', studentArray);

    // Determinar el número máximo de cuotas para definir columnas
    const maxSharesPerStudent = Math.max(...studentArray.map(student => student.shares.length), 1);
    setMaxShares(maxSharesPerStudent);

    setStudentShares(studentArray);
  }, [filters, cuotas]);

  const handleFilterChange = (name, selectedOption) => {
    setFilters(prev => ({
      ...prev,
      [name]: selectedOption ? selectedOption.value : '',
    }));
  };

  const getFullName = (name, lastName) => {
    if (!name && !lastName) return '';
    return `${name || ''} ${lastName || ''}`.trim();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return '-';
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Lista de Cuotas Pendientes', 14, 16);

    const headers = ['Nombre Completo', 'Escuela'];
    for (let i = 1; i <= maxShares; i++) {
      headers.push(`Concepto ${i}`, `Monto ${i}`, `Estado ${i}`);
    }

    const tableData = studentShares.map(student => {
      const row = [
        getFullName(student.student.name, student.student.lastName),
        student.student.school,
      ];
      for (let i = 0; i < maxShares; i++) {
        if (i < student.shares.length) {
          row.push(
            student.shares[i].paymentName,
            student.shares[i].amount ? student.shares[i].amount.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }) : '-',
            student.shares[i].status
          );
        } else {
          row.push('-', '-', '-');
        }
      }
      return row;
    });

    autoTable(doc, {
      head: [headers],
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
            <Button onClick={exportToPDF} variant="primary" disabled={studentShares.length === 0}>
              Exportar a PDF
            </Button>
          </div>

          {studentShares.length > 0 ? (
            <Table className="students-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nombre y Apellido</th>
                  <th>Escuela</th>
                  {Array.from({ length: maxShares }, (_, i) => (
                    <React.Fragment key={i}>
                      <th>Concepto </th>
                      <th>Monto</th>
                      <th>Estado</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {studentShares.map((student, index) => (
                  <tr
                    key={student.student._id}
                    className={student.shares.some(share => share.status === 'Pendiente') ? 'state-inactivo' : 'state-activo'}
                  >
                    <td>{index + 1}</td>
                    <td>{getFullName(student.student.name, student.student.lastName)}</td>
                    <td>{student.student.school}</td>
                    {Array.from({ length: maxShares }, (_, i) => (
                      <React.Fragment key={i}>
                        <td>{i < student.shares.length ? student.shares[i].paymentName : '-'}</td>
                        <td>
                          {i < student.shares.length && student.shares[i].amount
                            ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(student.shares[i].amount)
                            : '-'}
                        </td>
                        <td>{i < student.shares.length ? student.shares[i].status : '-'}</td>
                      </React.Fragment>
                    ))}
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