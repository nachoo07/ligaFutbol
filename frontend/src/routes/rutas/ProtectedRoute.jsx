import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LoginContext } from '../../context/login/LoginContext'; // Asegúrate de importar tu contexto

const ProtectedRoute = ({ element, role, ...rest }) => {
    const { auth } = useContext(LoginContext); // Obtenemos el estado del rol del usuario desde el contexto

    const location = useLocation(); // Obtenemos la ubicación actual
  
    // Si el usuario no está autenticado, siempre redirigir a /login
    if (!auth) {
      if (location.pathname !== '/login') {
        return <Navigate to="/login" />;
      }
      return element;
    }
  
    // Si el usuario está autenticado pero no tiene el rol correcto
    if (role && auth !== role) {
      return <Navigate to="/homeuser" />;
    }
  
    // Si todo está bien, renderiza el componente solicitado
    return element;
}

export default ProtectedRoute