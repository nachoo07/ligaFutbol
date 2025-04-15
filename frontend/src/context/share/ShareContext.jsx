// context/share/ShareContext.js
import { useEffect, useState, createContext, useContext, useCallback, useRef } from "react";
import { useLocation } from 'react-router-dom';
import axios from "axios";
import { LoginContext } from "../login/LoginContext";

export const SharesContext = createContext();

const SharesProvider = ({ children }) => {
    const [cuotas, setCuotas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const { auth, loading: authLoading } = useContext(LoginContext);
    const location = useLocation();
    const hasFetched = useRef(false);

    const obtenerCuotas = useCallback(async (force = false) => {
        if (hasFetched.current && !force) return;
        hasFetched.current = true;

        try {
            const response = await axios.get("/api/shares", {
                withCredentials: true,
            });
            setCuotas(Array.isArray(response.data) ? response.data : []);
            setIsDataLoaded(true);
        } catch (error) {
            console.error("Error obteniendo cuotas:", error);
            setCuotas([]);
            throw error;
        }
    }, []);

    const obtenerCuotasPorEstudiante = useCallback(async (studentId) => {
        try {
            const response = await axios.get(`/api/shares/${studentId}`, {
                withCredentials: true,
            });
            return Array.isArray(response.data) ? response.data : [];
        } catch (error) {
            console.error("Error obteniendo cuotas por estudiante:", error);
           throw error;
        }
    }, []);

    const getAvailableShareNames = useCallback(async (year) => {
        try {
            const response = await axios.get("/api/shares/available-names", {
                params: { year },
                withCredentials: true,
            });
            return Array.isArray(response.data) ? response.data : [];
        } catch (error) {
            console.error("Error obteniendo nombres disponibles:", error);
            throw error;
        }
    }, []);

    useEffect(() => {
        if (
            authLoading ||
            loading ||
            !auth ||
            isDataLoaded ||
            !(
                location.pathname === '/share' ||
                location.pathname === '/pendingshare' ||
                location.pathname === '/report'
            )
        ) return;
        setLoading(true);
        obtenerCuotas().finally(() => setLoading(false));
    }, [auth, authLoading, location.pathname, obtenerCuotas, isDataLoaded, loading]);

    const addCuota = async (cuota) => {
        if (auth !== "admin") return Promise.reject("No autorizado");
        try {
            const response = await axios.post("/api/shares/create", cuota, {
                withCredentials: true,
            });
            setCuotas((prevCuotas) => [...prevCuotas, response.data.share]);
            hasFetched.current = false;
            return Promise.resolve();
        } catch (error) {
            console.error("Error al crear la cuota:", error);
            return Promise.reject(error);
        }
    };

    const createMassiveShares = async (paymentName, year) => {
        if (auth !== "admin") return Promise.reject("No autorizado");
        try {
            const response = await axios.post("/api/shares/create-massive", {
                paymentName,
                year,
            }, {
                withCredentials: true,
            });
            hasFetched.current = false;
            await obtenerCuotas(true); // Forzamos la recarga de cuotas
            return response.data.shares.length; // Devolvemos la cantidad de cuotas creadas
        } catch (error) {
            console.error("Error al crear cuotas masivas:", error);
            return Promise.reject(error);
        }
    };

    const deleteCuota = async (id) => {
        if (auth !== "admin") return Promise.reject("No autorizado");
        try {
            await axios.delete(`/api/shares/delete/${id}`, {
                withCredentials: true,
            });
            setCuotas((prevCuotas) => prevCuotas.filter((cuota) => cuota._id !== id));
            hasFetched.current = false;
            return Promise.resolve();
        } catch (error) {
            console.error("Error al eliminar cuota:", error);
            return Promise.reject(error);
        }
    };

    const updateCuota = async (cuota) => {
        if (auth !== "admin") return Promise.reject("No autorizado");
        try {
            const response = await axios.put(`/api/shares/update/${cuota._id}`, cuota, {
                withCredentials: true,
            });
            setCuotas((prevCuotas) =>
                prevCuotas.map((c) => (c._id === cuota._id ? response.data.share : c))
            );
            hasFetched.current = false;
            return Promise.resolve();
        } catch (error) {
            console.error("Error al actualizar cuota:", error);
            return Promise.reject(error);
        }
    };

    return (
        <SharesContext.Provider
            value={{
                cuotas,
                loading,
                obtenerCuotas,
                obtenerCuotasPorEstudiante,
                addCuota,
                deleteCuota,
                updateCuota,
                createMassiveShares,
                getAvailableShareNames,
            }}
        >
            {children}
        </SharesContext.Provider>
    );
};

export default SharesProvider;