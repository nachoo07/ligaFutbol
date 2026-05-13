import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaBars,
  FaUsers,
  FaAddressCard,
  FaListUl,
  FaMoneyBill,
  FaRegListAlt,
  FaChartBar,
  FaExchangeAlt,
  FaUserCog,
  FaHome,
  FaArrowLeft,
  FaEnvelope,
  FaCog,
} from 'react-icons/fa';
import { LuClipboardList } from 'react-icons/lu';
import './sidebar.css';

const Sidebar = ({ isMenuOpen, setIsMenuOpen, auth, menuItems }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const adminMenuSections = [
    {
      title: 'Operación',
      items: [
        { name: 'Inicio', route: '/', icon: <FaHome /> },
        { name: 'Alumnos', route: '/student', icon: <FaUsers /> },
        { name: 'Cuotas', route: '/share', icon: <FaMoneyBill /> },
        { name: 'Movimientos', route: '/motion', icon: <FaExchangeAlt /> },
        { name: 'Mail', route: '/email', icon: <FaEnvelope /> },
      ],
    },
    {
      title: 'Análisis',
      items: [
        { name: 'Reportes', route: '/report', icon: <FaChartBar /> },
        { name: 'Lista buena fe', route: '/list', icon: <FaRegListAlt /> },
        { name: 'Deudores', route: '/pendingshare', icon: <LuClipboardList /> },
        { name: 'Detalle Diario', route: '/share/detail', icon: <FaListUl /> },
        { name: 'Carnet', route: '/carnet', icon: <FaAddressCard /> },
      ],
    },
    {
      title: 'Configuración',
      items: [
        { name: 'Usuarios', route: '/user', icon: <FaUserCog /> },
      ],
    },
    {
        
      items: [
        {
          name: 'Volver Atrás',
          route: null,
          action: () => navigate(-1, { state: { fromDetailStudent: true } }),
          icon: <FaArrowLeft />,
        },
      ],
    },
  ];

  const userMenuSections = [
    {
      title: 'Operación',
      items: [
        { name: 'Inicio', route: '/homeuser', icon: <FaHome /> },
        { name: 'Alumnos', route: '/student', icon: <FaUsers /> },
      ],
    },
  ];

  const sections = menuItems
    ? [{ title: '', items: menuItems }]
    : auth === 'admin'
      ? adminMenuSections
      : userMenuSections;

  return (
    <aside className={`app-sidebar ${isMenuOpen ? 'open' : 'closed'}`}>
      <div className="app-sidebar-brand">
        {isMenuOpen && <strong>Liga de Futbol</strong>}
        <button type="button" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          <FaBars />
        </button>
      </div>

      <nav className="app-sidebar-nav">
        {sections.map((section) => (
          <div className="app-sidebar-section" key={section.title || 'menu'}>
            {section.title && isMenuOpen && (
              <span className="app-sidebar-section-title">{section.title}</span>
            )}

            {section.items.map((item) => {
              const isActive = item.route && location.pathname === item.route;

              return (
                <button
                  type="button"
                  key={item.name}
                  className={`app-sidebar-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    if (item.action) item.action();
                    else if (item.route) navigate(item.route);
                  }}
                >
                  <span className="app-sidebar-icon">{item.icon}</span>
                  {isMenuOpen && <span className="app-sidebar-text">{item.name}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
