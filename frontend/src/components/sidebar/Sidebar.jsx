import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBars, FaUsers, FaAddressCard, FaListUl, FaMoneyBill, FaRegListAlt, FaChartBar, FaExchangeAlt, FaUserCog, FaHome, FaArrowLeft } from 'react-icons/fa';
import { LuClipboardList } from "react-icons/lu";
import './sidebar.css';

const Sidebar = ({ isMenuOpen, setIsMenuOpen, auth }) => {
    const navigate = useNavigate();

    const adminMenuItems = [
        { name: 'Inicio', route: '/', icon: <FaHome /> },
        { name: 'Alumnos', route: '/student', icon: <FaUsers /> },
        { name: 'Cuotas', route: '/share', icon: <FaMoneyBill /> },
        { name: 'Reportes', route: '/report', icon: <FaChartBar /> },
        { name: 'Movimientos', route: '/motion', icon: <FaExchangeAlt /> },
        { name: 'Carnet', route: '/carnet', icon: <FaAddressCard /> },
        { name: 'Lista buena fe', route: '/list', icon: <FaRegListAlt /> },
        { name: 'Deudores', route: '/pendingshare', icon: <LuClipboardList /> },
        { name: 'Usuarios', route: '/user', icon: <FaUserCog /> },
        { name: 'Detalle Diario', route: '/share/detail', icon: <FaListUl /> },
        { name: 'Mail', route: '/email', icon: <FaUserCog /> },
        {
            name: 'Volver Atrás',
            route: null,
            action: () => navigate(-1, { state: { fromDetailStudent: true } }),
            icon: <FaArrowLeft />
        },
    ];

    const userMenuItems = [{ name: 'Inicio', route: '/', icon: <FaHome /> }];

    return (
        <div className={`app-sidebar ${isMenuOpen ? 'open' : 'closed'}`}>
            <div className="app-sidebar-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                <FaBars />
            </div>
            {(auth === 'admin' ? adminMenuItems : userMenuItems).map((item, index) => (
                <div
                    key={index}
                    className="app-sidebar-item"
                    onClick={() => {
                        if (item.action) {
                            item.action();
                        } else {
                            navigate(item.route);
                        }
                    }}
                >
                    <span className="app-sidebar-icon">{item.icon}</span>
                    <span className="app-sidebar-text">{item.name}</span>
                </div>
            ))}
        </div>
    );
};

export default Sidebar;
