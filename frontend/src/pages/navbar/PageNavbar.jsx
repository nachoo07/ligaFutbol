import React, { useContext, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navigate from '../../components/navbar/Navigate';
import Sidebar from '../../components/sidebar/Sidebar';
import { LoginContext } from '../../context/login/LoginContext';
import './pageNavbar.css';

const PageNavbar = () => {
  const { auth } = useContext(LoginContext);
  const [isMenuOpen, setIsMenuOpen] = useState(true);

  return (
    <div className="app-shell">
      <Sidebar
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        auth={auth}
      />

      <main className="app-main">
        <Navigate />

        <section className="app-page-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
};

export default PageNavbar;
