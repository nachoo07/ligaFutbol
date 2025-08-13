import { Container, Nav, Navbar, Button } from 'react-bootstrap';
import { FaHome, FaUsers, FaAddressCard,FaRegListAlt, FaBell, FaListUl, FaMoneyBill, FaChartBar, FaExchangeAlt, FaCalendarCheck, FaUserCog, FaCog, FaEnvelope, FaAngleDown, FaAngleUp } from 'react-icons/fa';
import { LuClipboardList } from "react-icons/lu";
import './navbar.css';
import { useNavigate } from 'react-router-dom';
import { LoginContext } from '../../context/login/LoginContext';
import { useContext, useState } from 'react';
import logo from '../../assets/logo.png';

const Navigate = () => {
  const { auth, logout, userData } = useContext(LoginContext);
  const navigate = useNavigate();
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
    {
      label: 'Reportes',
      icon: <FaChartBar />,
      hasSubmenu: true,
      submenu: [
        { path: '/report/canada', label: 'Sede El Palmar' },
        { path: '/report/valladares', label: 'Sede Valladares' },
        { path: '/report/sirga', label: 'Sede Sirga' },
      ]
    },
    { path: '/carnet', label: 'Carnet', icon: <FaAddressCard /> },
    { path: '/list', label: 'Lista buena fe', icon: <FaRegListAlt /> },
    { path: '/pendingshare', label: 'Deudores', icon: <LuClipboardList /> },
    { path: '/motion', label: 'Movimientos', icon: <FaExchangeAlt /> },

    { path: '/user', label: 'Usuarios', icon: <FaUserCog /> },
    { path: '/email', label: 'Envios de Mail', icon: <FaEnvelope /> },
  ];

  const userMenu = fullMenu.filter(item =>
    ['/', '/notification', '/attendance'].includes(item.path)
  );

  const menuItems = auth === 'user' ? userMenu : fullMenu;

  return (
    <Navbar
      bg="dark"
      variant="dark"
      expand="lg"
      className="navegador"
      expanded={expanded}
      onToggle={() => setExpanded(!expanded)}
    >
      <Container>
        <Navbar.Brand onClick={() => handleNavClick('/')}>
          <img
            src={logo}
            width="90"
            height="70"
            className="logo-navbar"
            alt="Logo"
          />
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