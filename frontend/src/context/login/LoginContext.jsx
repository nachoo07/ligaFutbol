import React, { createContext, useState, useEffect, useCallback } from 'react';
import client, { refreshSession } from '../../api/axios';
import { useNavigate } from 'react-router-dom';

export const LoginContext = createContext();

export const LoginProvider = ({ children }) => {
  const [auth, setAuth] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  const clearSession = useCallback(() => {
    setAuth(null);
    setUserData(null);
    localStorage.removeItem('authRole');
    localStorage.removeItem('authName');
    sessionStorage.removeItem('auth_error_message');
  }, []);

  const persistSession = useCallback((user) => {
    setAuth(user.role);
    setUserData({
      id: user.id,
      name: user.name,
      role: user.role,
      mail: user.mail,
    });
    localStorage.setItem('authRole', user.role);
    localStorage.setItem('authName', user.name);
  }, []);

  const logout = useCallback(async (redirectToLogin = true) => {
    try {
      setIsLoggingOut(true);
      await client.post('/auth/logout');
    } catch (error) {
      console.error('Error en logout:', error.response?.data || error.message);
    } finally {
      clearSession();
      if (redirectToLogin) {
        navigate('/login', { replace: true });
      }
      setIsLoggingOut(false);
    }
  }, [clearSession, navigate]);

  const refreshAccessToken = useCallback(async () => {
    const response = await refreshSession();
    const user = response.data?.user;

    if (!user) {
      throw new Error('La respuesta de refresh no contiene usuario');
    }

    persistSession(user);
    return user;
  }, [persistSession]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        await refreshAccessToken();
      } catch (error) {
        console.error('Error al verificar autenticación:', error.response?.data || error.message);
        clearSession();

        if (window.location.pathname !== '/login') {
          navigate('/login', { replace: true });
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [refreshAccessToken, clearSession, navigate]);

  const login = async (mail, password) => {
    try {
      const response = await client.post('/auth/login', { mail, password });

      const user = response.data?.user;
      if (!user) {
        throw new Error('La respuesta de login no contiene usuario');
      }

      persistSession(user);
      navigate(user.role === 'admin' ? '/' : '/homeuser', { replace: true });
      return user.role;
    } catch (error) {
      console.error('Error en login:', error.response?.data || error.message);
      throw error.response?.data?.message || 'Error al iniciar sesión';
    }
  };

  useEffect(() => {
    const handleSessionExpired = () => {
      if (isLoggingOut) return;

      clearSession();

      if (window.location.pathname !== '/login') {
        navigate('/login', { replace: true });
      }
    };

    window.addEventListener('SESSION_EXPIRED', handleSessionExpired);
    return () => window.removeEventListener('SESSION_EXPIRED', handleSessionExpired);
  }, [clearSession, isLoggingOut, navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (auth && !isLoggingOut) {
        refreshAccessToken().catch((error) => {
          console.error('Error en refresh programado:', error.response?.data || error.message);
        });
      }
    }, 90 * 60 * 1000);

    return () => clearInterval(interval);
  }, [auth, isLoggingOut, refreshAccessToken]);

  return (
    <LoginContext.Provider value={{ auth, userData, login, logout, loading, authLoading: loading }}>
      {children}
    </LoginContext.Provider>
  );
};
