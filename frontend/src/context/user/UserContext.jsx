import { useEffect, useState, createContext, useContext } from "react";
import { useLocation } from 'react-router-dom';
import axios from "axios";
import Swal from "sweetalert2";
import { LoginContext } from "../login/LoginContext";

export const UsersContext = createContext();

const UsersProvider = ({ children }) => {
    const { auth, loading: authLoading } = useContext(LoginContext);
    const [usuarios, setUsuarios] = useState([]);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const location = useLocation();

    const obtenerUsuarios = async () => {
        if (auth === 'admin') {
            try {
                const response = await axios.get("/api/users", {
                    withCredentials: true,
                });
                setUsuarios(response.data);
                setIsDataLoaded(true);
            } catch (error) {
                console.error("Error al obtener usuarios:", error);
                Swal.fire("¡Error!", "No se pudieron cargar los usuarios", "error");
            }
        }
    };

    useEffect(() => {
        if (
            !authLoading &&
            auth === 'admin' &&
            !isDataLoaded &&
            location.pathname === '/user'
        ) {
            obtenerUsuarios();
        }
    }, [auth, authLoading, location.pathname, isDataLoaded]);

    const addUsuarioAdmin = async (usuario) => {
        if (auth === 'admin') {
            try {
                const response = await axios.post("/api/users/create", usuario, {
                    withCredentials: true,
                });
                setUsuarios((prevUsuarios) => [...prevUsuarios, response.data]);
                Swal.fire("¡Éxito!", "Usuario admin creado correctamente", "success");
            } catch (error) {
                console.error("Error al crear usuario admin:", error);
                Swal.fire("¡Error!", error.response?.data?.message || "No se pudo crear el usuario admin", "error");
            }
        }
    };

    const updateUsuarioAdmin = async (id, usuarioActualizado) => {
        if (auth === 'admin') {
            try {
                const response = await axios.put(`/api/users/update/${id}`, usuarioActualizado, {
                    withCredentials: true,
                });
                setUsuarios((prevUsuarios) =>
                    prevUsuarios.map((usuario) =>
                        usuario._id === id ? response.data : usuario
                    )
                );
                Swal.fire("¡Éxito!", "Usuario actualizado correctamente", "success");
            } catch (error) {
                console.error("Error al actualizar usuario:", error);
                Swal.fire("¡Error!", error.response?.data?.message || "No se pudo actualizar el usuario", "error");
            }
        }
    };

    const deleteUsuarioAdmin = async (id) => {
        if (auth === 'admin') {
            try {
                const confirmacion = await Swal.fire({
                    title: "¿Estás seguro?",
                    text: "Esta acción no se puede deshacer",
                    icon: "warning",
                    showCancelButton: true,
                    confirmButtonColor: "#3085d6",
                    cancelButtonColor: "#d33",
                    confirmButtonText: "Sí, eliminar",
                    cancelButtonText: "Cancelar",
                });

                if (confirmacion.isConfirmed) {
                    await axios.delete(`/api/users/delete/${id}`, {
                        withCredentials: true,
                    });
                    setUsuarios((prevUsuarios) => prevUsuarios.filter((usuario) => usuario._id !== id));
                    Swal.fire("¡Eliminado!", "Usuario eliminado correctamente", "success");
                    await obtenerUsuarios(); // Actualizar lista solo tras éxito
                }
            } catch (error) {
                console.error("Error al eliminar usuario:", error);
                Swal.fire("¡Error!", error.response?.data?.message || "No se pudo eliminar el usuario", "error");
            }
        }
    };

    return (
        <UsersContext.Provider value={{
            usuarios,
            obtenerUsuarios,
            addUsuarioAdmin,
            updateUsuarioAdmin,
            deleteUsuarioAdmin,
        }}>
            {children}
        </UsersContext.Provider>
    );
};

export default UsersProvider;