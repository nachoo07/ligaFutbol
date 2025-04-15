import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch,FaAngleDown, FaAngleUp,FaBars, FaUsers, FaAddressCard, FaMoneyBill, FaRegListAlt, FaChartBar, FaExchangeAlt, FaUserCog, FaCog, FaEnvelope, FaHome, FaArrowLeft, FaFileExcel } from 'react-icons/fa';
import { LuClipboardList } from "react-icons/lu";
import DatePicker from 'react-datepicker';
import { es } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import './report.css';
import { StudentsContext } from '../../context/student/StudentContext';
import { SharesContext } from '../../context/share/ShareContext';
import { MotionContext } from '../../context/motion/MotionContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Report = () => {
  const navigate = useNavigate();
  const { estudiantes, obtenerEstudiantes } = useContext(StudentsContext);
  const { cuotas, obtenerCuotas } = useContext(SharesContext);
  const { motions } = useContext(MotionContext);
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDate1, setSelectedDate1] = useState(new Date());
  const [selectedDate2, setSelectedDate2] = useState(new Date());
  const [selectedDate3, setSelectedDate3] = useState(new Date());
  const [selectedDate4, setSelectedDate4] = useState(new Date());
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false); // Estado para el submenú de Reporte
  useEffect(() => {
    if (!dataLoaded) {
      obtenerEstudiantes();
      obtenerCuotas();
      setDataLoaded(true);
    }
  }, [dataLoaded, obtenerEstudiantes, obtenerCuotas]);

  const activeStudents = estudiantes.filter(e => e.status === 'Activo').length;
  const inactiveStudents = estudiantes.filter(e => e.status === 'Inactivo').length;

  const formatDate = (date) => {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().split('T')[0];
  };

  const calculateCardData = (selectedDate, type) => {
    const selectedDateStr = formatDate(selectedDate);
    const filteredMovements = motions.filter(mov => mov.date.split('T')[0] === selectedDateStr);
    const filteredCuotas = cuotas.filter(cuota => cuota.paymentDate && cuota.paymentDate.split('T')[0] === selectedDateStr);

    if (type === 'cuotas') {
      const cuotasEfectivo = filteredCuotas
        .filter(cuota => cuota.paymentMethod === 'Efectivo')
        .reduce((sum, cuota) => sum + (cuota.amount || 0), 0);
      const cuotasTransferencia = filteredCuotas
        .filter(cuota => cuota.paymentMethod === 'Transferencia')
        .reduce((sum, cuota) => sum + (cuota.amount || 0), 0);
      const totalCuotas = cuotasEfectivo + cuotasTransferencia;
      return { cuotasEfectivo, cuotasTransferencia, totalCuotas };
    }

    if (type === 'reporteTotal') {
      const ingresosMovimientos = filteredMovements
        .filter(mov => mov.incomeType === 'ingreso')
        .reduce((sum, mov) => sum + (mov.amount || 0), 0);
      const ingresosCuotas = filteredCuotas
        .reduce((sum, cuota) => sum + (cuota.amount || 0), 0);
      const ingresosTotales = ingresosMovimientos + ingresosCuotas;
      const egresosTotales = filteredMovements
        .filter(mov => mov.incomeType === 'egreso')
        .reduce((sum, mov) => sum + (mov.amount || 0), 0);
      return { ingresosTotales, egresosTotales };
    }

    if (type === 'ingresos') {
      const ingresosEfectivo = filteredMovements
        .filter(mov => mov.incomeType === 'ingreso' && mov.paymentMethod === 'efectivo')
        .reduce((sum, mov) => sum + (mov.amount || 0), 0);
      const ingresosTransferencia = filteredMovements
        .filter(mov => mov.incomeType === 'ingreso' && mov.paymentMethod === 'transferencia')
        .reduce((sum, mov) => sum + (mov.amount || 0), 0);
      const totalIngresos = ingresosEfectivo + ingresosTransferencia;
      return { ingresosEfectivo, ingresosTransferencia, totalIngresos };
    }

    if (type === 'egresos') {
      const egresosEfectivo = filteredMovements
        .filter(mov => mov.incomeType === 'egreso' && mov.paymentMethod === 'efectivo')
        .reduce((sum, mov) => sum + (mov.amount || 0), 0);
      const egresosTransferencia = filteredMovements
        .filter(mov => mov.incomeType === 'egreso' && mov.paymentMethod === 'transferencia')
        .reduce((sum, mov) => sum + (mov.amount || 0), 0);
      const totalEgresos = egresosEfectivo + egresosTransferencia;
      return { egresosEfectivo, egresosTransferencia, totalEgresos };
    }

    return {};
  };
  
  
  const cardData1 = calculateCardData(selectedDate1, 'cuotas');
  const cardData2 = calculateCardData(selectedDate2, 'reporteTotal');
  const cardData3 = calculateCardData(selectedDate3, 'ingresos');
  const cardData4 = calculateCardData(selectedDate4, 'egresos');

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
      ],
    },
    { name: 'Movimientos', route: '/motion', icon: <FaExchangeAlt /> },
    { name: 'Carnet', route: '/carnet', icon: <FaAddressCard /> },
    { name: 'Lista buena fe', route: '/list', icon: <FaRegListAlt /> },
    { name: 'Deudores', route: '/pendingshare', icon: <LuClipboardList /> },
    { name: 'Usuarios', route: '/user', icon: <FaUserCog /> },
    { name: 'Envios de Mail', route: '/email', icon: <FaEnvelope /> },
    { name: 'Volver Atrás', route: null, action: () => navigate(-1), icon: <FaArrowLeft /> },
  ];

  const monthStr = `${selectedMonth.getFullYear()}-${(selectedMonth.getMonth() + 1).toString().padStart(2, '0')}`;
  const monthName = selectedMonth.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  const chartData = useMemo(() => {
    // Cuotas
    const cuotasTotal = cuotas
      .filter(cuota => cuota.paymentDate && cuota.paymentDate.startsWith(monthStr))
      .reduce((sum, cuota) => sum + (cuota.amount || 0), 0);

    // Ingresos por movimientos
    const ingresosMovimientos = motions
      .filter(mov => mov.date.startsWith(monthStr) && mov.incomeType === 'ingreso')
      .reduce((sum, mov) => sum + (mov.amount || 0), 0);

    // Egresos por movimientos
    const egresosTotal = motions
      .filter(mov => mov.date.startsWith(monthStr) && mov.incomeType === 'egreso')
      .reduce((sum, mov) => sum + (mov.amount || 0), 0);

    // Total en efectivo (cuotas + movimientos)
    const efectivoTotal = (
      cuotas
        .filter(cuota => cuota.paymentDate && cuota.paymentDate.startsWith(monthStr) && cuota.paymentMethod === 'Efectivo')
        .reduce((sum, cuota) => sum + (cuota.amount || 0), 0) +
      motions
        .filter(mov => mov.date.startsWith(monthStr) && mov.incomeType === 'ingreso' && mov.paymentMethod === 'efectivo')
        .reduce((sum, mov) => sum + (mov.amount || 0), 0)
    );

    // Total por transferencia (cuotas + movimientos)
    const transferenciaTotal = (
      cuotas
        .filter(cuota => cuota.paymentDate && cuota.paymentDate.startsWith(monthStr) && cuota.paymentMethod === 'Transferencia')
        .reduce((sum, cuota) => sum + (cuota.amount || 0), 0) +
      motions
        .filter(mov => mov.date.startsWith(monthStr) && mov.incomeType === 'ingreso' && mov.paymentMethod === 'transferencia')
        .reduce((sum, mov) => sum + (mov.amount || 0), 0)
    );

    // Balance final (ingresos totales - egresos)
    const ingresosTotales = cuotasTotal + ingresosMovimientos;
    const balance = ingresosTotales - egresosTotal;

    return {
      labels: ['Reporte del Mes'],
      datasets: [
        { label: 'Cuotas', data: [cuotasTotal], backgroundColor: '#1976D2', barThickness: 45 },
        { label: 'Ingresos', data: [ingresosMovimientos], backgroundColor: '#4CAF50', barThickness: 45 },
        { label: 'Egresos', data: [egresosTotal], backgroundColor: '#F44336', barThickness: 45 },
        { label: 'Efectivo', data: [efectivoTotal], backgroundColor: '#388E3C', barThickness: 45 },
        { label: 'Transferencia', data: [transferenciaTotal], backgroundColor: '#0288D1', barThickness: 45 },
        { label: 'Balance', data: [balance],  backgroundColor: '#FFB300', barThickness: 45,  }
      ],
    };
  }, [motions, cuotas, monthStr]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { font: { size: 15 } } },
      title: { display: true, text: `Reporte Mensual: ${monthName}`, font: { size: 16 } },
      tooltip: { 
        backgroundColor: '#424242', 
        titleFont: { size: 14 }, 
        bodyFont: { size: 12 },
        callbacks: {
          label: (context) => `${context.dataset.label}: $${context.raw.toLocaleString('es')}`
        }
      },
    },
    scales: {
      x: { 
        stacked: false, 
        ticks: { font: { size: 20 } },
        categoryPercentage: 1.0, // Controla el espacio entre categorías
      },
      y: { 
        stacked: false, 
        title: { display: true, text: 'Monto ($)', font: { size: 16 } },
        ticks: { font: { size: 12 }, callback: value => `$${value.toLocaleString('es')}` },
      },
    },
  }), [monthName]);

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
        <h1 className="report-title">Reporte General</h1>
        <div className="cards-report">
          <div className="card-student active">
            <h2>Alumnos Activos</h2>
            <p>{activeStudents}</p>
          </div>
          <div className="card-student inactive">
            <h2>Alumnos Inactivos</h2>
            <p>{inactiveStudents}</p>
          </div>
        </div>

        <div className="cards-grid">
          <div className="card-report cuotas">
            <div className="card-header">
              <h2>Cuotas</h2>
              <DatePicker
                selected={selectedDate1}
                onChange={(date) => setSelectedDate1(date)}
                dateFormat="dd/MM/yyyy"
                className="custom-datepicker"
                popperClassName="custom-datepicker-popper"
                locale={es}
                maxDate={new Date()}
              />
            </div>
            <div className="card-row">
              <p>Efectivo: ${cardData1.cuotasEfectivo.toLocaleString('es')}</p>
              <p>Transferencia: ${cardData1.cuotasTransferencia.toLocaleString('es')}</p>
              <p className="total">Total: ${cardData1.totalCuotas.toLocaleString('es')}</p>
            </div>
          </div>

          <div className="card-report reporte-total">
            <div className="card-header">
              <h2>Reporte Total Diario</h2>
              <DatePicker
                selected={selectedDate2}
                onChange={(date) => setSelectedDate2(date)}
                dateFormat="dd/MM/yyyy"
                className="custom-datepicker"
                popperClassName="custom-datepicker-popper"
                locale={es}
                maxDate={new Date()}
              />
            </div>
            <div className="card-row">
              <p>Ingreso: ${cardData2.ingresosTotales.toLocaleString('es')}</p>
              <p>Egreso: ${cardData2.egresosTotales.toLocaleString('es')}</p>
            </div>
          </div>

          <div className="card-report ingresos">
            <div className="card-header">
              <h2>Ingresos</h2>
              <DatePicker
                selected={selectedDate3}
                onChange={(date) => setSelectedDate3(date)}
                dateFormat="dd/MM/yyyy"
                className="custom-datepicker"
                popperClassName="custom-datepicker-popper"
                locale={es}
                maxDate={new Date()}
              />
            </div>
            <div className="card-row">
              <p>Efectivo: ${cardData3.ingresosEfectivo.toLocaleString('es')}</p>
              <p>Transferencia: ${cardData3.ingresosTransferencia.toLocaleString('es')}</p>
              <p className="total">Total: ${cardData3.totalIngresos.toLocaleString('es')}</p>
            </div>
          </div>

          <div className="card-report egresos">
            <div className="card-header">
              <h2>Egresos</h2>
              <DatePicker
                selected={selectedDate4}
                onChange={(date) => setSelectedDate4(date)}
                dateFormat="dd/MM/yyyy"
                className="custom-datepicker"
                popperClassName="custom-datepicker-popper"
                locale={es}
                maxDate={new Date()}
              />
            </div>
            <div className="card-row">
              <p>Efectivo: ${cardData4.egresosEfectivo.toLocaleString('es')}</p>
              <p>Transferencia: ${cardData4.egresosTransferencia.toLocaleString('es')}</p>
              <p className="total">Total: ${cardData4.totalEgresos.toLocaleString('es')}</p>
            </div>
          </div>
        </div>

        <div className="chart-container small">
          <div className='chart-header'>
          <h2 className="chart-title">Reporte Mensual</h2>
          <DatePicker
            selected={selectedMonth}
            onChange={(date) => setSelectedMonth(date)}
            dateFormat="MM/yyyy"
            showMonthYearPicker
            locale={es}
            className="custom-datepicker month-picker"
            placeholderText="Selecciona un mes"
          />
          </div>
          
          <div className="chart-wrapper">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Report;