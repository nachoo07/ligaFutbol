import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Button } from 'react-bootstrap';
import { LoginContext } from '../../context/login/LoginContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import './login.css';
import logo from '../../assets/logo.png';

const Login = () => {
  const { login, auth } = useContext(LoginContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

    // Redirigir si ya está autenticado
    useEffect(() => {
      if (auth) {
          if (auth === 'admin') {
              navigate('/');
          } else {
              navigate('/homeuser');
          }
      }
  }, [auth, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const role = await login(email, password); // Usar la función login del contexto
      if (role === 'admin') {
        navigate('/'); // Redirige al Home
      } else {
        navigate('/homeuser'); // Redirige a otra página si es necesario
      }
    } catch (err) {
      setError(err);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-card">
          <div className="login-header">
            <div className="logo-container">
              <img src={logo} alt="Logo" className="logo" />
            </div>
            <h2 className="login-title">Bienvenido</h2>
            <p className="login-subtitle">Inicia sesión en tu cuenta</p>
          </div>
          
          <Form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <div className="input-container">
                <Form.Control
                  type="email"
                  placeholder="Correo electrónico"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  required
                />
                <span className="input-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6ZM20 6L12 11L4 6H20ZM20 18H4V8L12 13L20 8V18Z" fill="#666"/>
                  </svg>
                </span>
              </div>
            </div>

            <div className="form-group">
              <div className="input-container">
                <Form.Control
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  required
                />
                <span className="input-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 8H17V6C17 3.24 14.76 1 12 1S7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8ZM12 17C10.9 17 10 16.1 10 15S10.9 13 12 13S14 13.9 14 15S13.1 17 12 17ZM15.1 8H8.9V6C8.9 4.29 10.29 2.9 12 2.9S15.1 4.29 15.1 6V8Z" fill="#666"/>
                  </svg>
                </span>
              </div>
            </div>

            {error && (
              <div className="error-message">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22S22 17.52 22 12S17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="#e74c3c"/>
                </svg>
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="login-button" disabled={!email || !password}>
              <span>Iniciar Sesión</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 5V3C8 2.45 8.45 2 9 2H15C15.55 2 16 2.45 16 3V5H8ZM10 4H14V5H10V4ZM19 7V19C19 20.1 18.1 21 17 21H7C5.9 21 5 20.1 5 19V7H19ZM6 7V19H18V7H6Z" fill="currentColor"/>
                <path d="M10 15L12 17L16 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Button>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default Login;