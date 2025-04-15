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
                 // Añadir el parámetro invalidate: true para evitar problemas de caché en Cloudinary
                 formData.append("invalidate", "true");
                const response = await axios.post("/api/students/create", formData, {
                    withCredentials: true,
                    headers: { "Content-Type": "multipart/form-data" },
                });
                setEstudiantes((prev) => [...prev, response.data.student]);
                Swal.fire("¡Éxito!", "El estudiante ha sido creado correctamente", "success");
                await obtenerEstudiantes(); // Recargar datos después de agregar
            } catch (error) {
                console.error("Error al crear el estudiante:", error.response?.data || error.message);
                Swal.fire("¡Error!", `Ha ocurrido un error al crear el estudiante: ${error.response?.data?.message || error.message}`, "error");
                throw error; // Lanzar el error para que se pueda depurar
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
                     // Añadir el parámetro invalidate: true para evitar problemas de caché en Cloudinary
                     formData.append("invalidate", "true");
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

                // Mapa de traducción para nombres de campos
                const fieldTranslations = {
                    name: "Nombre",
                    lastName: "Apellido",
                    dni: "DNI",
                    birthDate: "Fecha de nacimiento",
                    address: "Dirección",
                    motherName: "Nombre de la madre",
                    fatherName: "Nombre del padre",
                    motherPhone: "Teléfono de la madre",
                    fatherPhone: "Teléfono del padre",
                    category: "Categoría",
                    school: "Escuela",
                    sex: "Sexo",
                };

                // Agrupar errores por tipo y personalizar mensajes
                const errorGroups = response.data.errors.reduce((acc, error) => {
                    // Extraer el DNI y la fila del mensaje de error
                    const dniMatch = error.match(/DNI (\d+)/);
                    const dni = dniMatch ? dniMatch[1] : "Desconocido";
                    const rowMatch = error.match(/Fila (\d+)/);
                    const row = rowMatch ? rowMatch[1] : "Desconocida";
                    let errorType = "Otros errores";
                    let customizedMessage = error;

                    if (error.includes("Faltan campos obligatorios")) {
                        errorType = "Campos obligatorios faltantes";
                        // Extraer los campos faltantes y traducirlos
                        const fieldsMatch = error.match(/Faltan campos obligatorios: (.+)$/);
                        if (fieldsMatch) {
                            const missingFields = fieldsMatch[1].split(", ").map((field) => fieldTranslations[field] || field);
                            customizedMessage = `Fila ${row}: Faltan campos obligatorios: ${missingFields.join(", ")}`;
                        }
                    } else if (error.includes("DNI") && error.includes("debe contener 8 a 10 dígitos")) {
                        errorType = "DNI con formato inválido";
                    } else if (error.includes("ya existe")) {
                        errorType = "DNI repetido";
                    } else if (error.includes("El teléfono de la madre")) {
                        errorType = "Teléfono de la madre inválido";
                    } else if (error.includes("El teléfono del padre")) {
                        errorType = "Teléfono del padre inválido";
                    } else if (error.includes("Formato inválido de email")) {
                        errorType = "Email con formato inválido";
                    } else if (error.includes("Formato de fecha inválido")) {
                        errorType = "Fecha de nacimiento con formato inválido";
                    } else if (error.includes("La fecha de nacimiento es obligatoria")) {
                        errorType = "Fecha de nacimiento faltante";
                    } else if (error.includes("Sexo debe ser")) {
                        errorType = "Sexo inválido";
                    } else if (error.includes("Solo se permite 1 imagen en 'profileImage'")) {
                        errorType = "Múltiples imágenes en profileImage";
                    } else if (error.includes("Error al procesar profileImage")) {
                        errorType = "Error al procesar profileImage";
                    } else if (error.includes("Solo se permiten hasta 2 imágenes en 'archived'")) {
                        errorType = "Más de 2 imágenes en archived";
                    } else if (error.includes("Error al procesar archived")) {
                        errorType = "Error al procesar archived";
                    }

                    if (!acc[errorType]) {
                        acc[errorType] = [];
                    }
                    acc[errorType].push({ dni, row, message: customizedMessage });
                    return acc;
                }, {});

                // Siempre importar los alumnos válidos
                setEstudiantes((prev) => [...prev, ...response.data.students]);

                // Generar el mensaje para Swal.fire
                let message = `Se importaron ${response.data.imported} estudiantes.`;
                if (response.data.errors.length > 0) {
                    message += "<br /><br /><strong>Resumen de errores:</strong><ul>";
                    for (const [errorType, errors] of Object.entries(errorGroups)) {
                        message += `<li>${errorType}: ${errors.length} alumnos afectados.</li>`;
                    }
                    message += "</ul>";

                    // Mostrar los primeros 5 errores detallados de cada tipo, excepto para "DNI repetido"
                    message += "<br /><strong>Detalles de los primeros errores:</strong><ul>";
                    for (const [errorType, errors] of Object.entries(errorGroups)) {
                        if (errorType === "DNI repetido") continue; // No mostrar detalles de DNI repetido
                        message += `<li><strong>${errorType}:</strong><ul>`;
                        const limitedErrors = errors.slice(0, 5);
                        limitedErrors.forEach((error) => {
                            // Para "Otros errores", incluir la fila en el mensaje
                            if (errorType === "Otros errores") {
                                message += `<li>Fila ${error.row}: ${error.message.split(": ").slice(1).join(": ")}</li>`;
                            } else {
                                message += `<li>${error.message}</li>`;
                            }
                        });
                        if (errors.length > 5) {
                            message += `<li>(y ${errors.length - 5} errores más...)</li>`;
                        }
                        message += "</ul></li>";
                    }
                    message += "</ul>";
                }

                if (response.data.success || response.data.imported > 0) {
                    Swal.fire({
                        icon: "success",
                        title: "¡Éxito!",
                        html: message,
                        confirmButtonText: "Aceptar",
                        width: "600px",
                        customClass: {
                            htmlContainer: "swal2-html-container-scroll",
                        },
                    });
                } else {
                    Swal.fire({
                        icon: "error",
                        title: "Error",
                        html: message,
                        confirmButtonText: "Aceptar",
                        width: "600px",
                        customClass: {
                            htmlContainer: "swal2-html-container-scroll",
                        },
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