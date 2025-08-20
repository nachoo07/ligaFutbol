import React, { useState, useEffect, useContext } from 'react';
import { SharesContext } from '../../context/share/ShareContext';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaBars, FaUsers, FaAddressCard, FaListUl, FaMoneyBill, FaRegListAlt, FaChartBar, FaExchangeAlt, FaUserCog, FaEnvelope, FaHome, FaArrowLeft, FaFileExcel } from 'react-icons/fa';
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
  const [years, setYears] = useState([]);
  const [filters, setFilters] = useState({ school: '', category: '', color: '', semester: '', year: '', status: 'all' });
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
    { name: 'Detalle Diario', route: '/share/detail', icon: <FaListUl /> },
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

      const uniqueSemesters = [...new Set(cuotas.map(share => {
        const match = share.paymentName.match(/Semestre (\d+)/i);
        return match ? `Semestre ${match[1]}` : null;
      }))]
        .filter(semester => semester)
        .map(semester => ({
          value: semester,
          label: semester,
        }));

      const uniqueYears = [...new Set(cuotas.map(share => {
        const yearMatch = share.paymentName.match(/(\d{4})/);
        return yearMatch ? yearMatch[1] : null;
      }))]
        .filter(year => year)
        .map(year => ({
          value: year,
          label: year,
        }));

      setSchools(uniqueSchools);
      setCategories(uniqueCategories);
      setColors(uniqueColors);
      setSemesters(uniqueSemesters);
      setYears(uniqueYears);
    }
  }, [cuotas]);

  useEffect(() => {
    if (!cuotas || !Array.isArray(cuotas)) {
      setStudentShares([]);
      return;
    }

    // Modificado: requerir que school, semester y year estén seleccionados
    const hasRequiredFilters = filters.school && filters.semester && filters.year;
    if (!hasRequiredFilters) {
      setStudentShares([]);
      return;
    }

    let filtered = [...cuotas];
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
    if (filters.year) {

      filtered = filtered.filter(share => share.paymentName.includes(filters.year));
    }
    if (filters.status && filters.status !== 'all') {

      filtered = filtered.filter(share => share.status === filters.status);
    }



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
      headers.push(`Concepto `, `Monto `, `Estado `);
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
              <label>Semestre:</label>
              <Select
                options={semesters}
                onChange={(option) => handleFilterChange('semester', option)}
                placeholder="Selecciona un semestre"
                isClearable
              />
            </div>
            <div className="filter-group">
              <label>Año:</label>
              <Select
                options={years}
                onChange={(option) => handleFilterChange('year', option)}
                placeholder="Selecciona un año"
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
              {/* Modificado: mensaje específico para indicar filtros obligatorios */}
              Por favor, selecciona una escuelita, un semestre y un año para ver las cuotas pendientes.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PendingSharesList;