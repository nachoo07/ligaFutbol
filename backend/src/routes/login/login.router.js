import express from 'express';
import { loginUser, logout, refreshAccessToken } from '../../controllers/login/login.controllers.js';

const router = express.Router();

// Ruta para iniciar sesión
router.post('/login', loginUser);
//Ruta para cerear sesión
router.post('/logout', logout);
// Ruta para refrescar el token de acceso
router.post('/refresh', refreshAccessToken);

export default router;