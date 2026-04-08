import React, { Suspense, lazy, useContext } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from '../../pages/navbar/PageNavbar';
import Login from '../../components/login/Login';
import { LoginContext } from '../../context/login/LoginContext';
import ProtectedRoute from '../rutas/ProtectedRoute';
import Navigate from '../../components/navbar/Navigate';

const PageHome = lazy(() => import('../../pages/home/PageHome'));
const PageStudent = lazy(() => import('../../pages/student/PageStudent'));
const PageDetail = lazy(() => import('../../pages/detailStudent/PageDetail'));
const PageCarnet = lazy(() => import('../../pages/carnet/PageCarnet'));
const PageList = lazy(() => import('../../pages/listStudent/PageList'));
const PageShare = lazy(() => import('../../pages/share/PageShare'));
const PageMassive = lazy(() => import('../../pages/shareMassive/PageMassive'));
const PageEmail = lazy(() => import('../../pages/email/PageEmail'));
const PageMotion = lazy(() => import('../../pages/motion/PageMotion'));
const PageListPending = lazy(() => import('../../pages/listPending/PageListPending'));
const PageUser = lazy(() => import('../../pages/user/PageUser'));
const PageReport = lazy(() => import('../../pages/report/PageReport'));
const PageHomeUser = lazy(() => import('../../pages/homeUser/PageHomeUser'));
const PageShareDetail = lazy(() => import('../../pages/shareDetail/PageShareDetail'));

const RouteLoader = () => (
  <div style={{ padding: '2rem', textAlign: 'center' }}>
    Cargando...
  </div>
);

const Routing = () => {
  const { auth } = useContext(LoginContext);
  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        {/* Rutas sin Navbar */}
        <Route path="/login" element={auth ? <Navigate to="/" /> : <Login />} />

        {/* Rutas con Navbar */}
        <Route element={<Layout />}>
          <Route
            path="/"
            element={<ProtectedRoute element={<PageHome />} role="admin" />}
          />
          <Route
            path="/carnet"
            element={<ProtectedRoute element={<PageCarnet />} role="admin" />}
          />
          <Route
            path="/share"
            element={<ProtectedRoute element={<PageShare />} role="admin" />}
          />
          <Route
            path="/share/:studentId"
            element={<ProtectedRoute element={<PageShare />} role="admin" />}
          />
          <Route
            path="/student"
            element={<ProtectedRoute element={<PageStudent />} />}
          />
          <Route
            path="/pendingshare"
            element={<ProtectedRoute element={<PageListPending />} role="admin" />}
          />
          <Route
            path="/detailstudent/:id"
            element={<ProtectedRoute element={<PageDetail />} />}
          />
          <Route
            path="/email"
            element={<ProtectedRoute element={<PageEmail />} role="admin" />}
          />
          <Route
            path="/motion"
            element={<ProtectedRoute element={<PageMotion />} role="admin" />}
          />
          <Route
            path="/user"
            element={<ProtectedRoute element={<PageUser />} role="admin" />}
          />
          <Route
            path="/report"
            element={<ProtectedRoute element={<PageReport />} role="admin" />}
          />
          <Route
            path="/massive"
            element={<ProtectedRoute element={<PageMassive />} role="admin" />}
          />
          <Route
            path="/list"
            element={<ProtectedRoute element={<PageList />} role="admin" />}
          />
          <Route
            path="/share/detail"
            element={<ProtectedRoute element={<PageShareDetail />} role="admin" />}
          />
          <Route
            path="/homeuser"
            element={<ProtectedRoute element={<PageHomeUser />} role='user' />}
          />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default Routing;
