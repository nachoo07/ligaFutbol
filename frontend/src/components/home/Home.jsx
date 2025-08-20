import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUsers, FaBell, FaMoneyBill, FaChartBar, FaExchangeAlt,FaListUl, FaCalendarCheck, FaUserCog, FaCog, FaEnvelope, FaBars, FaRegListAlt, FaAddressCard } from 'react-icons/fa';
import { LoginContext } from '../../context/login/LoginContext';
import { LuClipboardList } from "react-icons/lu";
import { useContext } from 'react';
import "./home.css";

const Home = () => {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(true);
    const { loading } = useContext(LoginContext);

    const menuItems = [
        { name: 'Alumnos', route: '/student', icon: <FaUsers /> },
        { name: 'Lista buena fe', route: '/list', icon: <FaRegListAlt /> },
        { name: 'Cuotas', route: '/share', icon: <FaMoneyBill /> },
        { name: 'Reportes', route: '/report', icon: <FaChartBar /> },
        { name: 'Movimientos', route: '/motion', icon: <FaExchangeAlt /> },
        { name: 'Carnet', route: '/carnet', icon: <FaAddressCard /> },
        { name: 'Usuarios', route: '/user', icon: <FaUserCog /> },
        { name: 'Deudores', route: '/pendingshare', icon: <LuClipboardList /> },
        { name: 'Detalle Diario', route: '/share/detail', icon: <FaListUl /> }
    ];

    if (loading) {
        return <div className="dashboard-container">Cargando...</div>;
    }

    return (
        <div className="dashboard-container">
            <div className={`sidebar ${isMenuOpen ? 'open' : 'closed'}`}>
                <div className="sidebar-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                    <FaBars />
                </div>
                {menuItems.map((item, index) => (
                    <div
                        key={index}
                        className="sidebar-item"
                        onClick={() => navigate(item.route)}
                    >
                        <span className="icon">{item.icon}</span>
                        <span className="text">{item.name}</span>
                    </div>
                ))}
            </div>
            <div className='content-home'>
                <div className="cards-container">
                    {menuItems.map((item, index) => (
                        <div
                            key={index}
                            className="card"
                            onClick={() => navigate(item.route)}
                        >
                            <div className="card-icon">{item.icon}</div>
                            <h3>{item.name}</h3>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Home;