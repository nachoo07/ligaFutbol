import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Button } from 'react-bootstrap';
import { LoginContext } from '../../context/login/LoginContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Login.css';
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
    <div className="login-page-container">
      <div className="login-page-form-wrapper">
        <div className="login-page-logo-container">
        <img src={logo} alt="Logo" className="login-page-logo" />
        </div>
       
        <Form onSubmit={handleSubmit} className="login-page-form">
          <Form.Group className="mb-3 login-page-form-input" controlId="exampleForm.ControlInput1">
            <Form.Label className="login-page-form-label">Usuario</Form.Label>
            <Form.Control
              type="email"
              placeholder=""
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Label htmlFor="inputPassword5" className="login-page-form-label">Contraseña</Form.Label>
          <Form.Control
            type="password"
            id="inputPassword5"
            className="mb-3 login-page-form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <div className="login-page-button-container">
            <Button variant="primary" type="submit" className="login-page-submit-button">
              Iniciar sesión
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
};

export default Login;