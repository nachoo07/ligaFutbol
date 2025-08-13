import { React, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../motion/motion.css'
import { FaSearch, FaBars, FaUsers,FaAddressCard, FaListUl, FaMoneyBill,FaRegListAlt, FaChartBar, FaExchangeAlt, FaUserCog, FaCog, FaEnvelope, FaHome, FaArrowLeft, FaFileExcel } from 'react-icons/fa';
import { LuClipboardList } from "react-icons/lu";
import Icome from './income/Income'

const Motion = () => {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(true);
    const menuItems = [
        { name: 'Inicio', route: '/', icon: <FaHome /> },
        { name: 'Alumnos', route: '/student', icon: <FaUsers /> },
        { name: 'Cuotas', route: '/share', icon: <FaMoneyBill /> },
        { name: 'Reportes', route: '/report', icon: <FaChartBar /> },
        { name: 'Movimientos', route: '/motion', icon: <FaExchangeAlt /> },
        { name: 'Carnet', route: '/carnet', icon: <FaAddressCard /> },
        { name: 'Lista buena fe', route: '/list', icon: <FaRegListAlt /> },
        { name: 'Deudores', route: '/pendingshare', icon: <LuClipboardList /> },
        { name: 'Usuarios', route: '/user', icon: <FaUserCog /> },
        { name: 'Envios de Mail', route: '/email', icon: <FaEnvelope /> },
        { name: 'Detalle Diario', route: '/share/detail', icon: <FaListUl /> },
        { name: 'Volver Atrás', route: null, action: () => navigate(-1), icon: <FaArrowLeft /> },
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