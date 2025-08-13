import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBars, FaHome, FaUsers, FaMoneyBill, FaChartBar, FaListUl, FaExchangeAlt, FaAddressCard, FaRegListAlt, FaUserCog, FaEnvelope, FaArrowLeft, FaAngleDown, FaAngleUp } from 'react-icons/fa';
import { LuClipboardList } from "react-icons/lu";
import { Table, Button, Form } from 'react-bootstrap';
import { SharesContext } from '../../context/share/ShareContext';
import { StudentsContext } from '../../context/student/StudentContext';
import './reportSchool.css';

const ReportSchool = () => {
  const { cuotas, loading: cuotasLoading } = useContext(SharesContext);
  const { estudiantes, loading: estudiantesLoading } = useContext(StudentsContext);
  const navigate = useNavigate();

  const [schoolData, setSchoolData] = useState([]);
  const [displayedSchoolData, setDisplayedSchoolData] = useState([]); // Datos que se muestran en la tabla
  const [priceLimit, setPriceLimit] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [isDataProcessed, setIsDataProcessed] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false); // Estado para el submenú de Reportes

  const menuItems = [
    { name: 'Inicio', route: '/', icon: <FaHome /> },
    { name: 'Alumnos', route: '/student', icon: <FaUsers /> },
    { name: 'Cuotas', route: '/share', icon: <FaMoneyBill /> },
    {
      name: 'Reportes',
      icon: <FaChartBar />,
      hasSubmenu: true,
      submenu: [
        { name: 'Sede El Palmar', route: '/report/canada' },
        { name: 'Sede Valladares', route: '/report/valladares' },
        { name: 'Sede Sirga', route: '/report/sirga' },
        { name: 'Reporte escuela', route: '/report/School' },
      ],
    },
    { name: 'Movimientos', route: '/motion', icon: <FaExchangeAlt /> },
    { name: 'Carnet', route: '/carnet', icon: <FaAddressCard /> },
    { name: 'Lista buena fe', route: '/list', icon: <FaRegListAlt /> },
    { name: 'Deudores', route: '/pendingshare', icon: <LuClipboardList /> },
    { name: 'Usuarios', route: '/user', icon: <FaUserCog /> },
    { name: 'Envios de Mail', route: '/email', icon: <FaEnvelope /> },
    { name: 'Detalle Diario', route: '/share/detail', icon: <FaListUl /> },
    { name: 'Volver Atrás', route: null, action: () => navigate(-1), icon: <FaArrowLeft /> },
  ];

  useEffect(() => {
    if (!cuotasLoading && !estudiantesLoading && cuotas && estudiantes) {
      setIsDataProcessed(true);
    }
  }, [cuotasLoading, estudiantesLoading, cuotas, estudiantes]);

  useEffect(() => {
    if (!isDataProcessed) return;

    const studentsBySchool = {};
    estudiantes.forEach(student => {
      const school = student.school || 'Sin Escuela';
      if (!studentsBySchool[school]) {
        studentsBySchool[school] = new Set();
      }
      studentsBySchool[school].add(student._id);
    });

    const revenueBySchool = cuotas
      .filter(cuota => cuota.status === 'Pagado')
      .reduce((acc, cuota) => {
        const school = cuota.student?.school || 'Sin Escuela';
        if (!acc[school]) {
          acc[school] = { total: 0, efectivo: 0, transferencia: 0 };
        }
        acc[school].total += cuota.amount || 0;
        if (cuota.paymentMethod === 'Efectivo') {
          acc[school].efectivo += cuota.amount || 0;
        } else if (cuota.paymentMethod === 'Transferencia') {
          acc[school].transferencia += cuota.amount || 0;
        }
        return acc;
      }, {});

    const data = Object.keys(studentsBySchool).map(school => {
      const totalStudents = studentsBySchool[school].size;
      const revenue = revenueBySchool[school]?.total || 0;
      const efectivo = revenueBySchool[school]?.efectivo || 0;
      const transferencia = revenueBySchool[school]?.transferencia || 0;
      const expectedAmount = totalStudents * (parseFloat(priceLimit) || 0);
      const difference = expectedAmount - revenue;

      return {
        school,
        totalStudents,
        revenue,
        efectivo,
        transferencia,
        expectedAmount,
        difference,
      };
    }).sort((a, b) => a.school.localeCompare(b.school));

    setSchoolData(data);
  }, [isDataProcessed, priceLimit, cuotas, estudiantes]);

  const handleLoadData = () => {
    const limit = parseFloat(priceLimit);
    if (limit > 0) {
      setDisplayedSchoolData(schoolData);
    } else {
      setDisplayedSchoolData([]);
    }
  };

  const handlePriceLimitChange = (e) => {
    setPriceLimit(e.target.value);
  };

  return (
    <div className="dashboard-container-report">
      <div className={`sidebar ${isMenuOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          <FaBars />
        </div>
        {menuItems.map((item, index) => (
          <div key={index} className="sidebar-item-container">
            <div 
              className="sidebar-item" 
              onClick={() => {
                if (item.hasSubmenu) {
                  setIsReportsOpen(!isReportsOpen);
                } else if (item.action) {
                  item.action();
                } else {
                  navigate(item.route);
                }
              }}
            >
              <span className="icon">{item.icon}</span>
              <span className="text">{item.name}</span>
              {item.hasSubmenu && (
                <span className="arrow">
                  {isReportsOpen ? <FaAngleUp /> : <FaAngleDown />}
                </span>
              )}
            </div>
            {item.hasSubmenu && isReportsOpen && (
              <div className="submenu">
                {item.submenu.map((subItem, subIndex) => (
                  <div 
                    key={subIndex} 
                    className="submenu-item" 
                    onClick={() => navigate(subItem.route)}
                  >
                    <span className="text">{subItem.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="content-report enhanced">
        <h1 className="report-title">Recaudación por Escuela</h1>
        <div className="input-section">
          <div className="input-group">
            <label>
              Precio Límite por Alumno (CLP): 
              <span className="input-info">
                (Ingresa un valor, ej. 50000, para calcular el monto esperado por escuela. Este valor no se guarda y se reinicia al cambiar de ruta.)
              </span>
            </label>
            <input
              type="number"
              value={priceLimit}
              onChange={handlePriceLimitChange}
              placeholder="Ej: 50000"
              className="form-control"
            />
          </div>
          <Button className="load-data-btn" onClick={handleLoadData}>
            Cargar Datos
          </Button>
        </div>

        {displayedSchoolData.length > 0 ? (
          <div className="students-table-container">
            <h2 className="table-title">Cantidad de Alumnos y Recaudación por Escuela</h2>
            <Table className="students-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Escuela</th>
                  <th>Alumnos</th>
                  <th>Monto Recaudado</th>
                  <th>Efectivo</th>
                  <th>Transferencia</th>
                  <th>Monto Esperado</th>
                  <th>Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {displayedSchoolData.map((data, index) => (
                  <tr key={data.school}>
                    <td>{index + 1}</td>
                    <td>{data.school}</td>
                    <td>{data.totalStudents}</td>
                    <td>
                      {new Intl.NumberFormat('es-CL', {
                        style: 'currency',
                        currency: 'CLP',
                        minimumFractionDigits: 0,
                      }).format(data.revenue)}
                    </td>
                    <td>
                      {new Intl.NumberFormat('es-CL', {
                        style: 'currency',
                        currency: 'CLP',
                        minimumFractionDigits: 0,
                      }).format(data.efectivo)}
                    </td>
                    <td>
                      {new Intl.NumberFormat('es-CL', {
                        style: 'currency',
                        currency: 'CLP',
                        minimumFractionDigits: 0,
                      }).format(data.transferencia)}
                    </td>
                    <td>
                      {new Intl.NumberFormat('es-CL', {
                        style: 'currency',
                        currency: 'CLP',
                        minimumFractionDigits: 0,
                      }).format(data.expectedAmount)}
                    </td>
                    <td>
                      {new Intl.NumberFormat('es-CL', {
                        style: 'currency',
                        currency: 'CLP',
                        minimumFractionDigits: 0,
                      }).format(data.difference)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        ) : (
          <div className="no-data-message">
            Ingresa un precio límite válido (mayor a 0) y haz clic en "Cargar Datos" para ver la recaudación por escuela.
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportSchool;