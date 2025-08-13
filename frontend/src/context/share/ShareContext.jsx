import { useState, useEffect, useContext, useCallback, useRef, createContext } from "react";
import { useLocation } from 'react-router-dom';
import axios from "axios";
import { LoginContext } from "../login/LoginContext";

export const SharesContext = createContext();

const SharesProvider = ({ children }) => {
    const [cuotas, setCuotas] = useState([]);
    const [loading, setLoading] = useState(false);

    const [semesterStats, setSemesterStats] = useState(null); // Estadísticas por semestre
    const [selectedSemester, setSelectedSemester] = useState(""); // Semestre por defecto
    const { auth, authLoading } = useContext(LoginContext);
    const location = useLocation();
    const hasFetchedCuotas = useRef(false);
    const hasFetchedStats = useRef(false);

    const obtenerCuotas = useCallback(async (force = false) => {
        if (loading || (hasFetchedCuotas.current && !force && cuotas.length > 0)) return;
        if (authLoading || !auth || !(location.pathname === '/share' || location.pathname === '/pendingshare' || location.pathname === '/report')) return;

        setLoading(true);
        try {
            const response = await axios.get("/api/shares", { withCredentials: true });
            setCuotas(Array.isArray(response.data) ? response.data : []);
            hasFetchedCuotas.current = true;
        } catch (error) {
            console.error("Error obteniendo cuotas:", error);
            setCuotas([]);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [loading, hasFetchedCuotas, authLoading, auth, location.pathname, cuotas.length]);

    const obtenerCuotasPorSemestre = useCallback(async (semester) => {
  if (!semester) return;
  try {
    setLoading(true);
    const response = await axios.get("/api/shares/by-semester", {
      params: { semester },
      withCredentials: true,
    });
    setSemesterStats(response.data);
  } catch (error) {
    console.error(`Error obteniendo estadísticas para ${semester}:`, error);
    setSemesterStats(null);
    throw error;
  } finally {
    setLoading(false);
  }
}, []);

    const obtenerCuotasPorEstudiante = useCallback(async (studentId) => {
        try {
            const response = await axios.get(`/api/shares/${studentId}`, {
                withCredentials: true,
            });
            const data = Array.isArray(response.data) ? response.data : [];
            return data;
        } catch (error) {
            console.error("Error obteniendo cuotas por estudiante:", error);
            throw error;
        }
    }, []);

    const getAvailableShareNames = useCallback(async (year) => {
        try {
            const response = await axios.get(`/api/shares/available-names`, {
                params: { year },
                withCredentials: true,
            });
            const data = Array.isArray(response.data) ? response.data : [];
            return data;
        } catch (error) {
            console.error("Error obteniendo nombres disponibles:", error);
            throw error;
        }
    }, []);

    useEffect(() => {
  if (
    authLoading ||
    !auth ||
    !(
      location.pathname === "/share" ||
      location.pathname === "/pendingshare" ||
      location.pathname === "/report"
    )
  ) {
    return;
  }

  if (!hasFetchedCuotas.current) {
    obtenerCuotas().catch((error) => {
      console.error("Error en useEffect de SharesContext al obtener cuotas:", error);
    });
  }

  if (selectedSemester) {
    obtenerCuotasPorSemestre(selectedSemester).catch((error) => {
      console.error("Error al cargar estadísticas iniciales:", error);
    });
  } else {
    setSemesterStats(null); // Limpia las estadísticas si no hay semestre seleccionado
  }
}, [auth, authLoading, location.pathname, obtenerCuotas, obtenerCuotasPorSemestre, selectedSemester]);

    const addCuota = useCallback(async (cuota) => {
        if (!auth || auth !== "admin") return Promise.reject("No autorizado");
        try {
            const response = await axios.post("/api/shares/create", cuota, {
                withCredentials: true,
            });
            setCuotas((prevCuotas) => [...prevCuotas, response.data.share]);
            hasFetchedCuotas.current = false; // Forzar recarga
            return Promise.resolve();
        } catch (error) {
            console.error("Error al crear la cuota:", error);
            throw error;
        }
    }, [auth]);

    const createMassiveShares = useCallback(async (paymentName, year) => {
        if (!auth || auth !== "admin") return Promise.reject("No autorizado");
        try {
            const response = await axios.post("/api/shares/create-massive", {
                paymentName,
                year,
            }, {
                withCredentials: true,
            });
            hasFetchedCuotas.current = false;
            await obtenerCuotas(true); // Forzamos recarga
            return response.data.shares.length;
        } catch (error) {
            console.error("Error al crear cuotas masivas:", error);
            throw error;
        }
    }, [auth, obtenerCuotas]);

    const deleteCuota = useCallback(async (id) => {
        if (!auth || auth !== "admin") return Promise.reject("No autorizado");
        try {
            await axios.delete(`/api/shares/delete/${id}`, {
                withCredentials: true,
            });
            setCuotas((prevCuotas) => prevCuotas.filter((cuota) => cuota._id !== id));
            hasFetchedCuotas.current = false;
            return Promise.resolve();
        } catch (error) {
            console.error("Error al eliminar cuota:", error);
            throw error;
        }
    }, [auth]);

    const updateCuota = useCallback(async (cuota) => {
        if (!auth || auth !== "admin") return Promise.reject("No autorizado");
        try {
            const response = await axios.put(`/api/shares/update/${cuota._id}`, cuota, {
                withCredentials: true,
            });
            setCuotas((prevCuotas) =>
                prevCuotas.map((c) => (c._id === cuota._id ? response.data.share : c))
            );
            hasFetchedCuotas.current = false;
            return Promise.resolve();
        } catch (error) {
            console.error("Error al actualizar cuota:", error);
            throw error;
        }
    }, [auth]);

    useEffect(() => {
    if (!hasFetchedCuotas.current && auth && !authLoading && (location.pathname === '/share' || location.pathname === '/pendingshare' || location.pathname === '/report')) {
      obtenerCuotas().catch((error) => console.error('Error en useEffect de SharesContext:', error));
    }
  }, [auth, authLoading, location.pathname, obtenerCuotas]);
  
    return (
        <SharesContext.Provider
            value={{
                cuotas,
                loading,
                obtenerCuotas,
                obtenerCuotasPorSemestre,
                obtenerCuotasPorEstudiante,
                addCuota,
                deleteCuota,
                updateCuota,
                createMassiveShares,
                getAvailableShareNames,
                semesterStats,
                setSemesterStats,
                selectedSemester,
                setSelectedSemester,
            }}
        >
            {children}
        </SharesContext.Provider>
    );
};

export default SharesProvider;