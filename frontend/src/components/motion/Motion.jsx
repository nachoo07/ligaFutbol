import { React, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../motion/motion.css'
import {
  FaBars, FaUsers, FaBell, FaMoneyBill, FaChartBar, FaExchangeAlt,
  FaCalendarCheck, FaUserCog, FaCog, FaEnvelope, FaHome, FaArrowLeft
} from 'react-icons/fa';
import Icome from './income/Income'

const Motion = () => {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(true);
  
    const menuItems = [
      { name: 'Inicio', route: '/', icon: <FaHome /> },
      { name: 'Alumnos', route: '/student', icon: <FaUsers /> },
      { name: 'Notificaciones', route: '/notification', icon: <FaBell /> },
      { name: 'Cuotas', route: '/share', icon: <FaMoneyBill /> },
      { name: 'Reportes', route: '/report', icon: <FaChartBar /> },
      { name: 'Movimientos', route: '/motion', icon: <FaExchangeAlt /> },
      { name: 'Asistencia', route: '/attendance', icon: <FaCalendarCheck /> },
      { name: 'Usuarios', route: '/user', icon: <FaUserCog /> },
      { name: 'Ajustes', route: '/settings', icon: <FaCog /> },
      { name: 'Envios de Mail', route: '/email-notifications', icon: <FaEnvelope /> },
      { name: 'Volver Atrás', route: null, action: () => navigate(-1), icon: <FaArrowLeft /> }
    ];

  return (

    <>
     <div className="dashboard-container-motion">
        <div className={`sidebar ${isMenuOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <FaBars />
          </div>
          {menuItems.map((item, index) => (
            <div
              key={index}
              className="sidebar-item"
              onClick={() => item.action ? item.action() : navigate(item.route)}
            >
              <span className="icon">{item.icon}</span>
              <span className="text">{item.name}</span>
            </div>
          ))}
        </div>
        <div className="content-motion">
          <Icome />
        </div>
      </div>
    </>
  )
}

export default Motion