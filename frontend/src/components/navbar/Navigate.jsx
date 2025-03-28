import { Container, Nav, Navbar, Button } from 'react-bootstrap';
import { FaHome, FaUsers, FaBell, FaMoneyBill, FaChartBar, FaExchangeAlt, FaCalendarCheck, FaUserCog, FaCog, FaEnvelope } from 'react-icons/fa';
import './navbar.css';
import { useNavigate } from 'react-router-dom';
import { LoginContext } from '../../context/login/LoginContext';
import { useContext, useState } from 'react';
import logo from '../../assets/logo.png';

const Navigate = () => {
    const { auth, logout, userData } = useContext(LoginContext);
    const navigate = useNavigate();
    const [expanded, setExpanded] = useState(false);
  
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
      { path: '/notification', label: 'Notificaciones', icon: <FaBell /> },
      { path: '/share', label: 'Cuotas', icon: <FaMoneyBill /> },
      { path: '/report', label: 'Reportes', icon: <FaChartBar /> },
      { path: '/motion', label: 'Movimientos', icon: <FaExchangeAlt /> },
      { path: '/attendance', label: 'Asistencia', icon: <FaCalendarCheck /> },
      { path: '/user', label: 'Usuarios', icon: <FaUserCog /> },
      { path: '/settings', label: 'Ajustes', icon: <FaCog /> },
      { path: '/email-notifications', label: 'Envios de Mail', icon: <FaEnvelope /> },
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
              className="logo"
              alt="Logo"
            />
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ml-auto navbarr">
              <div className="hamburger-menu">
                {menuItems.map((item, index) => (
                  <Nav.Link
                    key={index}
                    onClick={() => handleNavClick(item.path)}
                  >
                    {item.icon} {item.label}
                  </Nav.Link>
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
  )
}

export default Navigate