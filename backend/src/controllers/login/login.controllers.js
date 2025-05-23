import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from "../../models/user/user.model.js";
import RefreshToken from "../../models/refreshToken/refreshToken.models.js";
import logger from '../../winston/logger.js'; // Asegúrate de tener un logger configurado
import 'dotenv/config';
// Generar Access Token
const generateAccessToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '2h' }); // 2 horas
};

// Generar Refresh Token
const generateRefreshToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' }); // 7 días
};


  

export const loginUser = async (req, res) => {
    const { mail, password } = req.body;

    if (!mail || !password) {
        logger.warn('Intento de login fallido: correo o contraseña no proporcionados', { mail });
        return res.status(400).json({ message: 'Se requiere correo electrónico y contraseña.' });
    }
    try {
        const user = await User.findOne({ mail });
        if (!user) {
            logger.warn('Intento de login fallido: usuario no encontrado', { mail });
            return res.status(400).json({ message: 'Credenciales inválidas' });
        }
        if (!user.state) {
            logger.warn('Intento de login fallido: cuenta inactiva', { mail });
            return res.status(403).json({ message: 'Su cuenta está inactiva. Por favor contacte al administrador.' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            logger.warn('Intento de login fallido: contraseña incorrecta', { mail });
            return res.status(400).json({ message: 'Credenciales inválidas' });
        }
        const payload = {
            userId: user._id,
            role: user.role,
            name: user.name,
            mail: user.mail,
        };

        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        // Almacenar el RefreshToken en la base de datos
        await RefreshToken.create({
            token: refreshToken,
            userId: user._id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
        });

        // Configuración de cookies
        res.cookie('token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // true en producción (HTTPS)
            sameSite: 'lax',
            path: '/',
            maxAge: 2 * 60 * 60 * 1000 // 2 horas
        });
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
        });
        logger.info('Usuario autenticado exitosamente', { mail, role: user.role });
        res.status(200).json({
            message: 'Login successful',
            user: { name: user.name, role: user.role, mail: user.mail }
        });
    } catch (error) {
        logger.error('Error al procesar el login', { mail, error: error.message });
        res.status(500).json({ message: 'Error al iniciar sesión.', error: error.message });
    }
};

export const logout = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (refreshToken) {
            await RefreshToken.deleteOne({ token: refreshToken });
            logger.info('Refresh token eliminado durante logout');
        }

        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        });
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        });
        logger.info('Usuario cerró sesión exitosamente');
        res.status(200).json({ message: 'User logged out successfully!' });
    } catch (error) {
        logger.error('Error durante el logout', { error: error.message });
        res.status(500).json({ message: 'Error during logout', error: error.message });
    }
};

// Refresh Token
export const refreshAccessToken = async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        logger.warn('Intento de refresh sin token');
        return res.status(401).json({ message: 'No autorizado, por favor inicia sesión de nuevo.' });
    }

    try {
        const storedToken = await RefreshToken.findOne({ token: refreshToken });
        if (!storedToken) {
            logger.warn('Refresh token no válido o revocado');
            return res.status(403).json({ message: 'Refresh token no válido o revocado, please log in again.' });
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const payload = {
            userId: decoded.userId,
            role: decoded.role,
            name: decoded.name,
            mail: decoded.mail
        };

        const accessToken = generateAccessToken(payload);

        // Actualizar la cookie del access token
        res.cookie('token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 2 * 60 * 60 * 1000 // 2 horas
        });
        logger.info('Access token refrescado exitosamente', { mail: decoded.mail });
        res.status(200).json({
            message: 'Access token refreshed',
            accessToken // Enviar el nuevo access token
        });
    } catch (error) {
        logger.error('Error al refrescar token', { error: error.message });
        res.status(403).json({ message: 'Invalid refresh token, please log in again.' });
    }
};