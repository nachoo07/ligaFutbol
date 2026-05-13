import { Container, Nav, Navbar, Button } from 'react-bootstrap';
import { FaHome, FaUsers, FaAddressCard, FaRegListAlt, FaBell, FaListUl, FaMoneyBill, FaChartBar, FaExchangeAlt, FaCalendarCheck, FaUserCog, FaCog, FaEnvelope, FaAngleDown, FaAngleUp } from 'react-icons/fa';
import { LuClipboardList } from "react-icons/lu";
import './navbar.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoginContext } from '../../context/login/LoginContext';
import { useContext, useState } from 'react';
import logo from '../../assets/logo.png';

const Navigate = () => {
  const { auth, logout, userData } = useContext(LoginContext);
  const navigate = useNavigate();

  const location = useLocation();

  const pageTitles = {
    '/': 'Dashboard',
    '/student': 'Alumnos',
    '/share': 'Cuotas',
    '/report': 'Reportes',
    '/carnet': 'Carnet',
    '/list': 'Lista buena fe',
    '/pendingshare': 'Deudores',
    '/motion': 'Movimientos',
    '/user': 'Usuarios',
    '/email': 'Mail',
    '/share/detail': 'Detalle Diario',
    '/homeuser': 'Inicio',
  };

  const currentTitle = pageTitles[location.pathname] || 'Liga de Futbol';


  const [expanded, setExpanded] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false); // Estado para el submenú de Reportes

  const handleLogout = async () => {
    logout();
    navigate('/login');
    setExpanded(false);
  };

  const handleNavClick = (path) => {
    navigate(path);
    setExpanded(false);
  };

  const fullMenu = [
    { path: '/', label: 'Inicio', icon: <FaHome /> },
    { path: '/student', label: 'Alumnos', icon: <FaUsers /> },
    { path: '/share', label: 'Cuotas', icon: <FaMoneyBill /> },
    { path: '/report', label: 'Reportes', icon: <FaChartBar /> },
    { path: '/carnet', label: 'Carnet', icon: <FaAddressCard /> },
    { path: '/list', label: 'Lista buena fe', icon: <FaRegListAlt /> },
    { path: '/pendingshare', label: 'Deudores', icon: <LuClipboardList /> },
    { path: '/motion', label: 'Movimientos', icon: <FaExchangeAlt /> },
    { path: '/user', label: 'Usuarios', icon: <FaUserCog /> },
    { path: '/email', label: 'Mail', icon: <FaEnvelope /> },
  ];

  const userMenu = fullMenu.filter(item =>
    ['/', '/notification', '/attendance'].includes(item.path)
  );

  const menuItems = auth === 'user' ? userMenu : fullMenu;

  return (
    <Navbar
      expand="lg"
      className="navegador"
      expanded={expanded}
      onToggle={() => setExpanded(!expanded)}
    >
      <Container>
        <Navbar.Brand onClick={() => handleNavClick('/')} className="navbar-brand-with-title">
          <img
            src={logo}
            width="54"
            height="54"
            className="logo-navbar"
            alt="Logo"
          />
          <span className="navbar-page-title">{currentTitle}</span>
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ml-auto navbarr">
            <div className="hamburger-menu">
              {menuItems.map((item, index) => (
                <div key={index}>
                  <Nav.Link
                    onClick={() => {
                      if (item.hasSubmenu) {
                        setIsReportsOpen(!isReportsOpen);
                      } else {
                        handleNavClick(item.path);
                      }
                    }}
                  >
                    {item.icon} {item.label}
                    {item.hasSubmenu && (
                      <span className="submenu-icon">
                        {isReportsOpen ? <FaAngleUp /> : <FaAngleDown />}
                      </span>
                    )}
                  </Nav.Link>
                  {item.hasSubmenu && isReportsOpen && (
                    <div className="submenu">
                      {item.submenu.map((subItem, subIndex) => (
                        <Nav.Link
                          key={subIndex}
                          onClick={() => handleNavClick(subItem.path)}
                          className="submenu-item"
                        >
                          {subItem.label}
                        </Nav.Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <span className="navbar-text">
              Hola, {userData?.name || 'Usuario'}
            </span>
            <Button className="boton-cerrar-sesion" onClick={handleLogout}>
              Cerrar Sesión
            </Button>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Navigate;