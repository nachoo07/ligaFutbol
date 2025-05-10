import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from '../../pages/navbar/PageNavbar';
import PageHome from '../../pages/home/PageHome';
import PageStudent from '../../pages/student/PageStudent';
import Login from '../../components/login/Login';
import PageDetail from '../../pages/detailStudent/PageDetail';
import PageCarnet from '../../pages/carnet/PageCarnet';
import PageList from '../../pages/listStudent/PageList';
import PageShare from '../../pages/share/PageShare';
import PageMassive from '../../pages/shareMassive/PageMassive';
import { useContext } from 'react';
import { LoginContext } from '../../context/login/LoginContext';
import ProtectedRoute from '../rutas/ProtectedRoute';
import Navigate from '../../components/navbar/Navigate';
import PageEmail from '../../pages/email/PageEmail';
import PageMotion from '../../pages/motion/PageMotion';
import PageListPending from '../../pages/listPending/PageListPending';
import PageUser from '../../pages/user/PageUser';
import PageReport from '../../pages/report/PageReport';
import PageHomeUser from '../../pages/homeUser/PageHomeUser';
import SedeUno from '../../components/individualReports/SedeUno';
import SedeDos from '../../components/individualReports/SedeDos';
import SedeTres from '../../components/individualReports/SedeTres';
import ReportSchool from '../../components/reportSchool/ReportSchool';
import PageShareDetail from '../../pages/shareDetail/PageShareDetail';

const Routing = () => {
  const { auth } = useContext(LoginContext);
  return (
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
        <Route path="/email"
          element={<ProtectedRoute element={<PageEmail />} role="admin" />}
        />
        <Route path="/motion"
          element={<ProtectedRoute element={<PageMotion />} role="admin" />}
        />
        <Route path="/user"
          element={<ProtectedRoute element={<PageUser />} role="admin" />}
        />
        <Route path="/report"
          element={<ProtectedRoute element={<PageReport />} role="admin" />}
        />
         <Route path="/report/canada"
          element={<ProtectedRoute element={<SedeUno/>} role="admin" />}
        />
         <Route path="/report/valladares"
          element={<ProtectedRoute element={<SedeDos/>} role="admin" />}
        />
         <Route path="/report/sirga"
          element={<ProtectedRoute element={<SedeTres />} role="admin" />}
        />
        <Route path="/report/school"
          element={<ProtectedRoute element={<ReportSchool />} role="admin" />}
        />
        <Route path="/massive"
          element={<ProtectedRoute element={<PageMassive />} role="admin" />}
        />
        <Route path="/list"
          element={<ProtectedRoute element={<PageList />} role="admin" />}
        />
        <Route path="/share/detail"
          element={<ProtectedRoute element={<PageShareDetail />} role="admin" />}
        />
        <Route
        path="/homeuser"
        element={<ProtectedRoute element={<PageHomeUser />} role='user' />}
      />
      </Route>
    </Routes>
  );
};

export default Routing;