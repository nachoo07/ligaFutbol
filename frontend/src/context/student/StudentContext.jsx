import { useEffect, useState, createContext, useContext } from "react";
import { useLocation } from 'react-router-dom';
import axios from "axios";
import Swal from "sweetalert2";
import { LoginContext } from "../login/LoginContext";

export const StudentsContext = createContext();

const StudentsProvider = ({ children }) => {
    const [estudiantes, setEstudiantes] = useState([]);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [loading, setLoading] = useState(false); // Nuevo estado para controlar solicitudes
    const { auth, loading: authLoading } = useContext(LoginContext);
    const location = useLocation();

    const obtenerEstudiantes = async () => {
        if (loading) return; // Evitar solicitudes simultáneas
        if (auth !== "admin" && auth !== "user") return;

        setLoading(true);
        try {
            const response = await axios.get("/api/students", {
                withCredentials: true,
            });
            setEstudiantes(Array.isArray(response.data) ? response.data : []);
            setIsDataLoaded(true);
        } catch (error) {
            console.error("Error obteniendo estudiantes:", error);
            Swal.fire("¡Error!", "No se pudieron obtener los estudiantes. Verifica la URL y el servidor.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (
            !authLoading &&
            (auth === "admin" || auth === "user") &&
            !isDataLoaded &&
            (
                location.pathname === '/student' ||
                location.pathname === '/pendingshare' ||
                location.pathname === '/report'
            )
        ) {
            obtenerEstudiantes();
        }
    }, [auth, authLoading, location.pathname, isDataLoaded]);

    const addEstudiante = async (estudiante) => {
        if (auth === "admin") {
            try {
                const formData = new FormData();
                for (const key in estudiante) {
                    if (key === "archived" && Array.isArray(estudiante[key])) {
                        estudiante[key].forEach((file) => formData.append("archived", file));
                    } else if (estudiante[key] !== null && estudiante[key] !== undefined) {
                        formData.append(key, estudiante[key]);
                    }
                }
                const response = await axios.post("/api/students/create", formData, {
                    withCredentials: true,
                    headers: { "Content-Type": "multipart/form-data" },
                });
                setEstudiantes((prev) => [...prev, response.data.student]);
                Swal.fire("¡Éxito!", "El estudiante ha sido creado correctamente", "success");
                await obtenerEstudiantes(); // Recargar datos después de agregar
            } catch (error) {
                console.error("Error al crear el estudiante:", error);
                Swal.fire("¡Error!", "Ha ocurrido un error al crear el estudiante", "error");
            }
        }
    };

    const deleteEstudiante = async (id) => {
        if (auth === "admin") {
            try {
                const confirmacion = await Swal.fire({
                    title: "¿Estás seguro que deseas eliminar el estudiante?",
                    text: "Esta acción no se puede deshacer",
                    icon: "warning",
                    showCancelButton: true,
                    confirmButtonColor: "#3085d6",
                    cancelButtonColor: "#d33",
                    confirmButtonText: "Sí, eliminar",
                    cancelButtonText: "Cancelar",
                });
                if (confirmacion.isConfirmed) {
                    const response = await axios.delete(`/api/students/delete/${id}`, {
                        withCredentials: true,
                    });
                    setEstudiantes((prev) => prev.filter((estudiante) => estudiante._id !== id));
                    if (response.data.errors && response.data.errors.length > 0) {
                        await Swal.fire({
                            title: '¡Advertencia!',
                            html: `El estudiante fue eliminado, pero hubo problemas al eliminar archivos:<br>${response.data.errors.join('<br>')}`,
                            icon: 'warning',
                            confirmButtonText: 'OK',
                        });
                    } else {
                        await Swal.fire("¡Eliminado!", "El estudiante ha sido eliminado correctamente", "success");
                    }
                    await obtenerEstudiantes(); // Recargar datos después de eliminar
                    return true;
                } else {
                    return false;
                }
            } catch (error) {
                console.error("Error al eliminar estudiante:", error);
                Swal.fire("¡Error!", error.response?.data?.message || "Ha ocurrido un error al eliminar el estudiante", "error");
                return false;
            }
        }
    };

    const updateEstudiante = async (id, formData) => {
        if (auth === "admin") {
            try {
                const response = await axios.put(
                    `/api/students/update/${id}`,
                    formData,
                    {
                        withCredentials: true,
                        headers: {
                            "Content-Type": "multipart/form-data",
                        },
                    }
                );
                setEstudiantes((prev) =>
                    prev.map((est) => (est._id === id ? response.data.student : est))
                );
                await obtenerEstudiantes(); // Recargar datos después de actualizar
                return response;
            } catch (error) {
                console.error("Error en axios.put:", error.response ? error.response.data : error.message);
                throw error;
            }
        } else {
            console.error("No tienes permisos:", auth);
            throw new Error("No tienes permisos para actualizar estudiantes");
        }
    };

    const importStudents = async (file) => {
        if (auth === "admin") {
            try {
                const formData = new FormData();
                formData.append("excelFile", file);

                const response = await axios.post("/api/students/import", formData, {
                    withCredentials: true,
                    headers: { "Content-Type": "multipart/form-data" },
                });

                setEstudiantes((prev) => [...prev, ...response.data.students]);

                if (response.data.success) {
                    let message = `Se importaron ${response.data.imported} estudiantes.`;
                    if (response.data.errors.length > 0) {
                        message += `<br />Errores: <ul>${response.data.errors.map((err, idx) => `<li>${err}</li>`).join("")}</ul>`;
                    }
                    Swal.fire({
                        icon: "success",
                        title: "¡Éxito!",
                        html: message,
                    });
                } else {
                    Swal.fire({
                        icon: "error",
                        title: "Error",
                        html: `No se pudieron importar los estudiantes.<br />Errores: <ul>${response.data.errors.map(
                            (err, idx) => `<li>${err}</li>`
                        ).join("")}</ul>`,
                    });
                }

                await obtenerEstudiantes(); // Recargar datos después de importar
            } catch (error) {
                console.error("Error al importar estudiantes:", error);
                Swal.fire(
                    "¡Error!",
                    error.response?.data?.message || "Ha ocurrido un error al importar el archivo Excel",
                    "error"
                );
            }
        } else {
            Swal.fire("¡Error!", "No tienes permisos para importar estudiantes", "error");
        }
    };

    const countStudentsByCategory = (category) => {
        const estudiantesArray = Array.isArray(estudiantes) ? estudiantes : [];
        return estudiantesArray.filter((student) => student.category === category).length;
    };

    return (
        <StudentsContext.Provider
            value={{
                estudiantes,
                obtenerEstudiantes,
                addEstudiante,
                deleteEstudiante,
                updateEstudiante,
                importStudents,
                countStudentsByCategory,
            }}
        >
            {children}
        </StudentsContext.Provider>
    );
};

export default StudentsProvider;