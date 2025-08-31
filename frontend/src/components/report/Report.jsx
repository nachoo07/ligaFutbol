import React, { useState, useEffect, useContext, useMemo, useCallback, useReducer } from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch, FaFileExcel } from "react-icons/fa";
import DatePicker, { registerLocale } from "react-datepicker";
import { es } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import "./report.css";
import { StudentsContext } from "../../context/student/StudentContext";
import { SharesContext } from "../../context/share/ShareContext";
import { MotionContext } from "../../context/motion/MotionContext";
import { LoginContext } from "../../context/login/LoginContext";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import Sidebar from "../sidebar/Sidebar"; // Ajusta la ruta si es diferente

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
registerLocale("es", es);

// Constantes
const PAYMENT_METHODS = { EFECTIVO: "Efectivo", TRANSFERENCIA: "Transferencia" };
const INCOME_TYPES = { INGRESO: "ingreso", EGRESO: "egreso" };

// Reducer para fechas
const datesReducer = (state, action) => {
  switch (action.type) {
    case "SET_CUOTAS_DATE":
      return { ...state, cuotasDate: action.payload };
    case "SET_REPORTE_TOTAL_DATE":
      return { ...state, reporteTotalDate: action.payload };
    case "SET_INGRESOS_DATE":
      return { ...state, ingresosDate: action.payload };
    case "SET_EGRESOS_DATE":
      return { ...state, egresosDate: action.payload };
    case "SET_MONTH":
      return { ...state, month: action.payload };
    default:
      return state;
  }
};

// Hook para cálculos de reportes
const useReportData = (cuotas, motions, estudiantes, selectedSemester, obtenerCuotasPorSemestre, dates) => {
  const [semesterStats, setSemesterStats] = useState(null);

  const formatDate = (date) => {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().split("T")[0];
  };

  const calculateCardData = useCallback(
    (selectedDate, type) => {
      const selectedDateStr = formatDate(selectedDate);
      const filteredMovements = Array.isArray(motions)
        ? motions.filter((mov) => mov.date && mov.date.split("T")[0] === selectedDateStr)
        : [];
      const filteredCuotas = Array.isArray(cuotas)
        ? cuotas.filter((cuota) => cuota.paymentDate && cuota.paymentDate.split("T")[0] === selectedDateStr)
        : [];

      if (type === "cuotas") {
        const cuotasEfectivo = filteredCuotas
          .filter((cuota) => cuota.paymentMethod === PAYMENT_METHODS.EFECTIVO)
          .reduce((sum, cuota) => sum + (cuota.amount || 0), 0);
        const cuotasTransferencia = filteredCuotas
          .filter((cuota) => cuota.paymentMethod === PAYMENT_METHODS.TRANSFERENCIA)
          .reduce((sum, cuota) => sum + (cuota.amount || 0), 0);
        const totalCuotas = cuotasEfectivo + cuotasTransferencia;
        return { cuotasEfectivo, cuotasTransferencia, totalCuotas };
      }

      if (type === "reporteTotal") {
        const ingresosMovimientos = filteredMovements
          .filter((mov) => mov.incomeType === INCOME_TYPES.INGRESO)
          .reduce((sum, mov) => sum + (mov.amount || 0), 0);
        const ingresosCuotas = filteredCuotas.reduce((sum, cuota) => sum + (cuota.amount || 0), 0);
        const ingresosTotales = ingresosMovimientos + ingresosCuotas;
        const egresosTotales = filteredMovements
          .filter((mov) => mov.incomeType === INCOME_TYPES.EGRESO)
          .reduce((sum, mov) => sum + (mov.amount || 0), 0);
        return { ingresosTotales, egresosTotales };
      }

      if (type === "ingresos") {
        const ingresosEfectivo = filteredMovements
          .filter((mov) => mov.incomeType === INCOME_TYPES.INGRESO && mov.paymentMethod === PAYMENT_METHODS.EFECTIVO.toLowerCase())
          .reduce((sum, mov) => sum + (mov.amount || 0), 0);
        const ingresosTransferencia = filteredMovements
          .filter((mov) => mov.incomeType === INCOME_TYPES.INGRESO && mov.paymentMethod === PAYMENT_METHODS.TRANSFERENCIA.toLowerCase())
          .reduce((sum, mov) => sum + (mov.amount || 0), 0);
        const totalIngresos = ingresosEfectivo + ingresosTransferencia;
        return { ingresosEfectivo, ingresosTransferencia, totalIngresos };
      }

      if (type === "egresos") {
        const egresosEfectivo = filteredMovements
          .filter((mov) => mov.incomeType === INCOME_TYPES.EGRESO && mov.paymentMethod === PAYMENT_METHODS.EFECTIVO.toLowerCase())
          .reduce((sum, mov) => sum + (mov.amount || 0), 0);
        const egresosTransferencia = filteredMovements
          .filter((mov) => mov.incomeType === INCOME_TYPES.EGRESO && mov.paymentMethod === PAYMENT_METHODS.TRANSFERENCIA.toLowerCase())
          .reduce((sum, mov) => sum + (mov.amount || 0), 0);
        const totalEgresos = egresosEfectivo + egresosTransferencia;
        return { egresosEfectivo, egresosTransferencia, totalEgresos };
      }

      return {};
    },
    [cuotas, motions]
  );

  useEffect(() => {
    if (selectedSemester) {
      obtenerCuotasPorSemestre(selectedSemester)
        .then((stats) => setSemesterStats(stats.data))
        .catch((error) => {
          Swal.fire("¡Error!", error.response?.data?.message || "No se pudieron obtener las estadísticas del semestre.", "error");
          setSemesterStats(null);
        });
    } else {
      setSemesterStats(null);
    }
  }, [selectedSemester, obtenerCuotasPorSemestre]);

  return { calculateCardData, semesterStats, formatDate };
};

const Report = () => {
  const navigate = useNavigate();
  const { estudiantes, obtenerEstudiantes } = useContext(StudentsContext);
  const { cuotas, obtenerCuotasPorSemestre, selectedSemester, setSelectedSemester } = useContext(SharesContext);
  const { motions } = useContext(MotionContext);
  const { auth, authLoading } = useContext(LoginContext);
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [dates, dispatch] = useReducer(datesReducer, {
    cuotasDate: new Date(),
    reporteTotalDate: new Date(),
    ingresosDate: new Date(),
    egresosDate: new Date(),
    month: new Date(),
  });

  const { calculateCardData, semesterStats, formatDate } = useReportData(
    cuotas,
    motions,
    estudiantes,
    selectedSemester,
    obtenerCuotasPorSemestre,
    dates
  );

  // Carga inicial de datos
  useEffect(() => {
    if (!isDataLoaded && !authLoading && auth) {
      obtenerEstudiantes()
        .then(() => setIsDataLoaded(true))
        .catch((error) => Swal.fire("¡Error!", "No se pudieron cargar los estudiantes.", "error"));
    }
  }, [obtenerEstudiantes, isDataLoaded, authLoading, auth]);

  // Opciones de semestre (con tu modificación)
  const semesterOptions = useMemo(() => {
    const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - 0 + i);
    return years.flatMap((year) => [`Semestre 1 ${year}`, `Semestre 2 ${year}`]);
  }, []);

  // Manejo de cambio de semestre
  const handleSemesterChange = useCallback(
    (e) => {
      const newSemester = e.target.value;
      if (newSemester !== selectedSemester) {
        setSelectedSemester(newSemester);
      }
    },
    [selectedSemester, setSelectedSemester]
  );

  // Depuración del toggle del sidebar
  const toggleMenu = () => {
    console.log("Toggling sidebar, current isMenuOpen:", isMenuOpen);
    setIsMenuOpen((prev) => !prev);
  };

  // Datos del gráfico
  const chartData = useMemo(() => {
    const cuotasArray = Array.isArray(cuotas) ? cuotas : [];
    const motionsArray = Array.isArray(motions) ? motions : [];
    const monthStr = `${dates.month.getFullYear()}-${(dates.month.getMonth() + 1).toString().padStart(2, "0")}`;
    const cuotasTotal = cuotasArray
      .filter((cuota) => cuota.paymentDate && cuota.paymentDate.startsWith(monthStr))
      .reduce((sum, cuota) => sum + (cuota.amount || 0), 0);
    const ingresosMovimientos = motionsArray
      .filter((mov) => mov.date && mov.date.startsWith(monthStr) && mov.incomeType === INCOME_TYPES.INGRESO)
      .reduce((sum, mov) => sum + (mov.amount || 0), 0);
    const egresosTotal = motionsArray
      .filter((mov) => mov.date && mov.date.startsWith(monthStr) && mov.incomeType === INCOME_TYPES.EGRESO)
      .reduce((sum, mov) => sum + (mov.amount || 0), 0);
    const efectivoTotal = cuotasArray
      .filter((cuota) => cuota.paymentDate && cuota.paymentDate.startsWith(monthStr) && cuota.paymentMethod === PAYMENT_METHODS.EFECTIVO)
      .reduce((sum, cuota) => sum + (cuota.amount || 0), 0) +
      motionsArray
        .filter(
          (mov) =>
            mov.date &&
            mov.date.startsWith(monthStr) &&
            mov.incomeType === INCOME_TYPES.INGRESO &&
            mov.paymentMethod === PAYMENT_METHODS.EFECTIVO.toLowerCase()
        )
        .reduce((sum, mov) => sum + (mov.amount || 0), 0);
    const transferenciaTotal = cuotasArray
      .filter((cuota) => cuota.paymentDate && cuota.paymentDate.startsWith(monthStr) && cuota.paymentMethod === PAYMENT_METHODS.TRANSFERENCIA)
      .reduce((sum, cuota) => sum + (cuota.amount || 0), 0) +
      motionsArray
        .filter(
          (mov) =>
            mov.date &&
            mov.date.startsWith(monthStr) &&
            mov.incomeType === INCOME_TYPES.INGRESO &&
            mov.paymentMethod === PAYMENT_METHODS.TRANSFERENCIA.toLowerCase()
        )
        .reduce((sum, mov) => sum + (mov.amount || 0), 0);
    const ingresosTotales = cuotasTotal + ingresosMovimientos;
    const balance = ingresosTotales - egresosTotal;

    return {
      labels: ["Reporte del Mes"],
      datasets: [
        { label: "Cuotas", data: [cuotasTotal], backgroundColor: "#1976D2", barThickness: 45 },
        { label: "Ingresos", data: [ingresosMovimientos], backgroundColor: "#4CAF50", barThickness: 45 },
        { label: "Egresos", data: [egresosTotal], backgroundColor: "#F44336", barThickness: 45 },
        { label: "Efectivo", data: [efectivoTotal], backgroundColor: "#388E3C", barThickness: 45 },
        { label: "Transferencia", data: [transferenciaTotal], backgroundColor: "#0288D1", barThickness: 45 },
        { label: "Balance", data: [balance], backgroundColor: "#FFB300", barThickness: 45 },
      ],
      totals: { cuotasTotal, ingresosMovimientos, egresosTotal, efectivoTotal, transferenciaTotal, balance },
    };
  }, [cuotas, motions, dates.month]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }, // Desactivar leyenda automática
      title: {
        display: true,
        text: `Reporte Mensual: ${dates.month.toLocaleString("es-ES", { month: "long", year: "numeric" })}`,
        font: { size: 16 },
        padding: { top: 10, bottom: 20 },
      },
      tooltip: {
        backgroundColor: "#424242",
        titleFont: { size: 14 },
        bodyFont: { size: 12 },
        callbacks: {
          label: (context) => `${context.dataset.label}: $${context.raw.toLocaleString("es-CL")}`,
        },
      },
    },
    scales: {
      x: { stacked: false, ticks: { font: { size: 14 } }, categoryPercentage: 1.0 },
      y: {
        stacked: false,
        title: { display: true, text: "Monto ($)", font: { size: 14 } },
        ticks: { font: { size: 12 }, callback: (value) => `$${value.toLocaleString("es-CL")}` },
      },
    },
  }), [dates.month]);

  const exportToExcel = () => {
    const data = [
      ["Reporte de Cuotas", ""],
      ["Semestre", selectedSemester || "No seleccionado"],
      ["Alumnos Activos", Array.isArray(estudiantes) ? estudiantes.filter((e) => e.status === "Activo").length : 0],
      ["Alumnos Inactivos", Array.isArray(estudiantes) ? estudiantes.filter((e) => e.status === "Inactivo").length : 0],
      ["Alumnos con Pago Total", semesterStats?.alumnosConPagoTotal || 0],
      ["Alumnos con Pago Parcial", semesterStats?.alumnosConPagoParcial || 0],
      ["Alumnos con Cuotas Pendientes", semesterStats?.alumnosConCuotasPendientes || 0],
      ["Monto Recaudado", semesterStats?.montoRecaudado ? `$${semesterStats.montoRecaudado.toLocaleString("es-CL")}` : "$0"],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    XLSX.writeFile(wb, `Reporte_Cuotas_${selectedSemester ? selectedSemester.replace(" ", "_") : "General"}.xlsx`);
  };

  const cardData1 = calculateCardData(dates.cuotasDate, "cuotas");
  const cardData2 = calculateCardData(dates.reporteTotalDate, "reporteTotal");
  const cardData3 = calculateCardData(dates.ingresosDate, "ingresos");
  const cardData4 = calculateCardData(dates.egresosDate, "egresos");

  return (
    <div className="dashboard-container-report">
      <Sidebar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} auth={auth} toggleMenu={toggleMenu} />
      <div className="content-report enhanced">
        <h1 className="report-title">Reporte General</h1>

        <div className="semester-selector">
          <label htmlFor="semester-select">Seleccionar Semestre:</label>
          <select
            id="semester-select"
            value={selectedSemester || ""}
            onChange={handleSemesterChange}
            className="custom-select"
            aria-label="Seleccionar semestre"
          >
            <option value="">Seleccionar semestre</option>
            {semesterOptions.map((semester, index) => (
              <option key={index} value={semester}>
                {semester}
              </option>
            ))}
          </select>
          <button
            onClick={exportToExcel}
            className="btn-export"
            disabled={!selectedSemester}
            aria-label="Exportar a Excel"
          >
            <FaFileExcel aria-hidden="true" /> Exportar a Excel
          </button>
        </div>

        <div className="cards-report">
          <div className="card-student active">
            <h2 className="card-student-title">Alumnos Activos</h2>
            <p className="card-student-number">{Array.isArray(estudiantes) ? estudiantes.filter((e) => e.status === "Activo").length : 0}</p>
          </div>
          <div className="card-student inactive">
            <h2 className="card-student-title">Alumnos Inactivos</h2>
            <p className="card-student-number">{Array.isArray(estudiantes) ? estudiantes.filter((e) => e.status === "Inactivo").length : 0}</p>
          </div>
          <div className="card-student full-payments">
            <h2 className="card-student-title">Alumnos con Pago Total</h2>
            <p className="card-student-number">{selectedSemester ? semesterStats?.alumnosConPagoTotal || 0 : "-"}</p>
          </div>
          <div className="card-student partial-payments">
            <h2 className="card-student-title">Alumnos con Pago Parcial</h2>
            <p className="card-student-number">{selectedSemester ? semesterStats?.alumnosConPagoParcial || 0 : "-"}</p>
          </div>
          <div className="card-student pending-cuotas">
            <h2 className="card-student-title">Alumnos con Cuotas Pendientes</h2>
            <p className="card-student-number">{selectedSemester ? semesterStats?.alumnosConCuotasPendientes || 0 : "-"}</p>
          </div>
          <div className="card-student total-collected">
            <h2 className="card-student-title">Monto Recaudado</h2>
            <p className="card-student-number">{selectedSemester ? `$${semesterStats?.montoRecaudado?.toLocaleString("es-CL") || "0"}` : "-"}</p>
          </div>
        </div>

        <div className="cards-grid">
          <div className="card-report cuotas">
            <div className="card-header">
              <h2 className="card-title-share">Cuotas</h2>
              <DatePicker
                selected={dates.cuotasDate}
                onChange={(date) => dispatch({ type: "SET_CUOTAS_DATE", payload: date })}
                onSelect={(date) => {
                  dispatch({ type: "SET_CUOTAS_DATE", payload: date });
                  document.activeElement.blur();
                }}
                dateFormat="dd/MM/yyyy"
                className="custom-datepicker"
                popperClassName="custom-datepicker-popper"
                locale={es}
                maxDate={new Date()}
                aria-label="Seleccionar fecha para cuotas"
              />
            </div>
            <div className="card-row">
              <p>Efectivo: ${cardData1.cuotasEfectivo.toLocaleString("es-CL")}</p>
              <p>Transferencia: ${cardData1.cuotasTransferencia.toLocaleString("es-CL")}</p>
              <p className="total">Total: ${cardData1.totalCuotas.toLocaleString("es-CL")}</p>
            </div>
          </div>

          <div className="card-report reporte-total">
            <div className="card-header">
              <h2 className="card-title-share">Reporte Total</h2>
              <DatePicker
                selected={dates.reporteTotalDate}
                onChange={(date) => dispatch({ type: "SET_REPORTE_TOTAL_DATE", payload: date })}
                onSelect={(date) => {
                  dispatch({ type: "SET_REPORTE_TOTAL_DATE", payload: date });
                  document.activeElement.blur();
                }}
                dateFormat="dd/MM/yyyy"
                className="custom-datepicker"
                popperClassName="custom-datepicker-popper"
                locale={es}
                maxDate={new Date()}
                aria-label="Seleccionar fecha para reporte total"
              />
            </div>
            <div className="card-row">
              <p>Ingresos: ${cardData2.ingresosTotales.toLocaleString("es-CL")}</p>
              <p>Egresos: ${cardData2.egresosTotales.toLocaleString("es-CL")}</p>
            </div>
          </div>

          <div className="card-report ingresos">
            <div className="card-header">
              <h2 className="card-title-share">Ingresos</h2>
              <DatePicker
                selected={dates.ingresosDate}
                onChange={(date) => dispatch({ type: "SET_INGRESOS_DATE", payload: date })}
                onSelect={(date) => {
                  dispatch({ type: "SET_INGRESOS_DATE", payload: date });
                  document.activeElement.blur();
                }}
                dateFormat="dd/MM/yyyy"
                className="custom-datepicker"
                popperClassName="custom-datepicker-popper"
                locale={es}
                maxDate={new Date()}
                aria-label="Seleccionar fecha para ingresos"
              />
            </div>
            <div className="card-row">
              <p>Efectivo: ${cardData3.ingresosEfectivo.toLocaleString("es-CL")}</p>
              <p>Transferencia: ${cardData3.ingresosTransferencia.toLocaleString("es-CL")}</p>
              <p className="total">Total: ${cardData3.totalIngresos.toLocaleString("es-CL")}</p>
            </div>
          </div>

          <div className="card-report egresos">
            <div className="card-header">
              <h2 className="card-title-share">Egresos</h2>
              <DatePicker
                selected={dates.egresosDate}
                onChange={(date) => dispatch({ type: "SET_EGRESOS_DATE", payload: date })}
                onSelect={(date) => {
                  dispatch({ type: "SET_EGRESOS_DATE", payload: date });
                  document.activeElement.blur();
                }}
                dateFormat="dd/MM/yyyy"
                className="custom-datepicker"
                popperClassName="custom-datepicker-popper"
                locale={es}
                maxDate={new Date()}
                aria-label="Seleccionar fecha para egresos"
              />
            </div>
            <div className="card-row">
              <p>Efectivo: ${cardData4.egresosEfectivo.toLocaleString("es-CL")}</p>
              <p>Transferencia: ${cardData4.egresosTransferencia.toLocaleString("es-CL")}</p>
              <p className="total">Total: ${cardData4.totalEgresos.toLocaleString("es-CL")}</p>
            </div>
          </div>
        </div>

        <div className="chart-container">
          <div className="chart-header">
            <h2 className="chart-title">Reporte Mensual</h2>
            <DatePicker
              selected={dates.month}
              onChange={(date) => dispatch({ type: "SET_MONTH", payload: date })}
              onSelect={(date) => {
                dispatch({ type: "SET_MONTH", payload: date });
                document.activeElement.blur();
              }}
              dateFormat="MM/yyyy"
              showMonthYearPicker
              locale={es}
              className="custom-datepicker month-picker"
              placeholderText="Selecciona un mes"
              aria-label="Seleccionar mes para reporte mensual"
            />
          </div>
          <div className="chart-content">
            <div className="chart-wrapper">
              <Bar data={chartData} options={chartOptions} />
            </div>
            <div className="chart-totals">
              {chartData.datasets.map((dataset, index) => (
                <div key={index} className="total-item">
                  <span
                    className="total-color"
                    style={{ backgroundColor: dataset.backgroundColor }}
                  ></span>
                  <span className="total-label">{dataset.label}:</span>
                  <span className="total-value">
                    ${chartData.totals[Object.keys(chartData.totals)[index]].toLocaleString("es-CL")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Report;