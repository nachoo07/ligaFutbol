import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export const LoginContext = createContext();
export const LoginProvider = ({ children }) => {
    const [auth, setAuth] = useState(localStorage.getItem('authRole') || null);
    const [userData, setUserData] = useState(localStorage.getItem('authName') ? { name: localStorage.getItem('authName') } : null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Verificar autenticación solo una vez al montar el componente
    useEffect(() => {
        const checkAuth = async () => {
            try {
                console.log('Verificando autenticación...');
                setLoading(true);
                const response = await axios.post('http://localhost:4001/api/auth/refresh', {}, { withCredentials: true });
                console.log('Respuesta de /api/auth/refresh:', response.data);
                setAuth(localStorage.getItem('authRole') || null);
                setUserData(localStorage.getItem('authName') ? { name: localStorage.getItem('authName') } : null);
            } catch (error) {
                console.error('Error al verificar autenticación:', error.response?.data || error.message);
                setAuth(null);
                setUserData(null);
                localStorage.removeItem('authRole');
                localStorage.removeItem('authName');
                if (window.location.pathname !== '/login') {
                    console.log('Redirigiendo a /login desde checkAuth...');
                    navigate('/login', { replace: true });
                }
            } finally {
                setLoading(false);
            }
        };
        checkAuth();
    }, []); // Eliminamos la dependencia de `navigate`

    const login = async (mail, password) => {
        try {
            console.log('Iniciando sesión con:', { mail });
            const response = await axios.post('http://localhost:4001/api/auth/login', { mail, password }, { withCredentials: true });
            console.log('Respuesta de /api/auth/login:', response.data);
            const { role, name } = response.data.user;
            setAuth(role);
            setUserData({ name });
            localStorage.setItem('authRole', role);
            localStorage.setItem('authName', name);
            console.log(`Redirigiendo después del login a: ${role === 'admin' ? '/' : '/homeuser'}`);
            navigate(role === 'admin' ? '/' : '/homeuser', { replace: true });
            return role;
        } catch (error) {
            console.error('Error en login:', error.response?.data || error.message);
            throw error.response?.data?.message || 'Error al iniciar sesión';
        }
    };

    const logout = async () => {
        try {
            console.log('Cerrando sesión...');
            await axios.post('http://localhost:4001/api/auth/logout', {}, { withCredentials: true });
            setAuth(null);
            setUserData(null);
            localStorage.removeItem('authRole');
            localStorage.removeItem('authName');
            navigate('/login', { replace: true });
        } catch (error) {
            console.error('Error en logout:', error);
        }
    };

    const refreshAccessToken = async () => {
        try {
            console.log('Renovando token...');
            await axios.post('http://localhost:4001/api/auth/refresh', {}, { withCredentials: true });
        } catch (error) {
            console.error('Error al renovar token:', error.response?.data || error.message);
            logout();
            throw error;
        }
    };

    useEffect(() => {
        const interceptor = axios.interceptors.response.use(
            (response) => response,
            async (error) => {
                const originalRequest = error.config;
                if (error.response?.status === 401 && !originalRequest._retry) {
                    if (originalRequest.url.includes('/api/auth/refresh')) {
                        console.log('Fallo en /refresh, deteniendo reintentos');
                        logout();
                        return Promise.reject(error);
                    }
                    originalRequest._retry = true;
                    try {
                        console.log('Intentando renovar token...');
                        await refreshAccessToken();
                        console.log('Token renovado, reintentando petición');
                        return axios(originalRequest);
                    } catch (refreshError) {
                        console.error('Error al renovar token:', refreshError.response?.data || refreshError.message);
                        logout();
                        return Promise.reject(refreshError);
                    }
                }
                return Promise.reject(error);
            }
        );
        return () => axios.interceptors.response.eject(interceptor);
    }, [logout]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (auth) {
                refreshAccessToken();
            }
        }, 90 * 60 * 1000); // 90 minutos
        return () => clearInterval(interval);
    }, [auth]);

    return (
        <LoginContext.Provider value={{ auth, userData, login, logout, loading }}>
            {children}
        </LoginContext.Provider>
    );
};