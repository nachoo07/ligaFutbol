import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LoginContext } from '../../context/login/LoginContext';

const ProtectedRoute = ({ element, role }) => {
  const { auth, loading } = useContext(LoginContext);
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!auth) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (role && auth !== role) {
    return <Navigate to={auth === 'admin' ? '/' : '/homeuser'} replace />;
  }

  return element;
};

export default ProtectedRoute;
