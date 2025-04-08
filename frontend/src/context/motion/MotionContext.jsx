import React, { createContext, useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { LoginContext } from '../login/LoginContext';

export const MotionContext = createContext();

export const MotionProvider = ({ children }) => {
    const [motions, setMotions] = useState([]);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const { auth, loading: authLoading } = useContext(LoginContext);
    const location = useLocation();

    const fetchMotions = async () => {
        if (auth === 'admin') {
            try {
                const response = await axios.get('/api/motions/', { withCredentials: true });
                setMotions(response.data);
                setIsDataLoaded(true);
            } catch (error) {
                console.error('Error fetching motions:', error);
                Swal.fire("¡Error!", "No se pudieron obtener los movimientos. Verifica la URL y el servidor.", "error");
            }
        }
    };

    useEffect(() => {
        if (
            !authLoading &&
            auth === 'admin' &&
            !isDataLoaded &&
            (location.pathname === '/motion' || location.pathname === '/report')
        ) {
            fetchMotions();
        }
    }, [auth, authLoading, location.pathname, isDataLoaded]);

    const createMotion = async (motion) => {
        try {
            const response = await axios.post('/api/motions/create', motion, { withCredentials: true });
            setMotions(prevMotions => [...prevMotions, response.data]);
            Swal.fire("¡Éxito!", "El movimiento ha sido creado correctamente", "success");
        } catch (error) {
            console.error('Error creating motion:', error);
            Swal.fire("¡Error!", "Ha ocurrido un error al crear el movimiento", "error");
        }
    };

    const updateMotion = async (id, updatedMotion) => {
        try {
            const response = await axios.put(`/api/motions/update/${id}`, updatedMotion, { withCredentials: true });
            setMotions(prevMotions => prevMotions.map(motion => (motion._id === id ? response.data : motion)));
            Swal.fire("¡Éxito!", "Ha sido actualizado correctamente", "success");
        } catch (error) {
            console.error('Error updating motion:', error);
            Swal.fire("¡Error!", "Ha ocurrido un error al actualizar el contenido", "error");
        }
    };

    const deleteMotion = async (id) => {
        try {
            const confirmacion = await Swal.fire({
                title: "¿Estás seguro que deseas eliminar el movimiento?",
                text: "Esta acción no se puede deshacer",
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#3085d6",
                cancelButtonColor: "#d33",
                confirmButtonText: "Sí, eliminar",
                cancelButtonText: "Cancelar",
            });
            if (confirmacion.isConfirmed) {
                await axios.delete(`/api/motions/delete/${id}`, { withCredentials: true });
                setMotions(motions.filter(motion => motion._id !== id));
                Swal.fire("¡Eliminado!", "El movimiento ha sido eliminado correctamente", "success");
            }
        } catch (error) {
            console.error('Error deleting motion:', error);
            Swal.fire("¡Error!", "Ha ocurrido un error al eliminar el contenido", "error");
        }
    };

    const getMotionsByDate = async (date) => {
        try {
            const response = await axios.get(`/api/motions/date/${date}`, { withCredentials: true });
            return response.data;
        } catch (error) {
            console.error('Error obteniendo movimientos por fecha:', error);
            Swal.fire("¡Error!", "No se pudieron obtener los movimientos por fecha.", "error");
            return [];
        }
    };

    const getMotionsByDateRange = async (startDate, endDate) => {
        try {
            const response = await axios.get(`/api/motions/date-range?startDate=${startDate}&endDate=${endDate}`, { withCredentials: true });
            return response.data;
        } catch (error) {
            console.error('Error obteniendo movimientos por rango de fechas:', error);
            Swal.fire("¡Error!", "No se pudieron obtener los movimientos por rango de fechas.", "error");
            return [];
        }
    };

    const getMotionsByLocation = async (location) => {
        try {
          const response = await axios.get(`/api/motions/location/${location}`, { withCredentials: true });
          return response.data;
        } catch (error) {
          console.error('Error obteniendo movimientos por sede:', error);
          Swal.fire("¡Error!", `No se pudieron obtener los movimientos para la sede ${location}.`, "error");
          return [];
        }
      };
    
      const getMotionsByLocationAndDateRange = async (location, startDate, endDate) => {
        try {
          const response = await axios.get(
            `/api/motions/location-date-range?location=${location}&startDate=${startDate}&endDate=${endDate}`,
            { withCredentials: true }
          );
          return response.data;
        } catch (error) {
          console.error('Error obteniendo movimientos por sede y rango de fechas:', error);
          Swal.fire("¡Error!", `No se pudieron obtener los movimientos para la sede ${location} en ese rango de fechas.`, "error");
          return [];
        }
      };

    return (
        <MotionContext.Provider value={{ motions,
         createMotion,
         updateMotion,
         deleteMotion,
         getMotionsByDate,
         getMotionsByDateRange,
         fetchMotions,
         getMotionsByLocation,
         getMotionsByLocationAndDateRange }}>
         {children}
        </MotionContext.Provider>
    );
};