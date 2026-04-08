import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from "../../models/user/user.model.js";
import RefreshToken from "../../models/refreshToken/refreshToken.models.js";
import logger from '../../winston/logger.js';
import 'dotenv/config';

const ACCESS_TOKEN_EXPIRES_IN = '2h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const ACCESS_TOKEN_MAX_AGE = 2 * 60 * 60 * 1000;

const buildUserPayload = (user) => ({
  userId: user._id,
  role: user.role,
  name: user.name,
  mail: user.mail,
});

const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
};

const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
};

const getCookieConfig = (maxAge) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge,
});

const clearAuthCookies = (res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
};

export const loginUser = async (req, res) => {
  const { mail, password } = req.body;

  if (!mail || !password) {
    logger.warn('Intento de login fallido: correo o contraseña no proporcionados', { mail });
    return res.status(400).json({ message: 'Se requiere correo electrónico y contraseña.' });
  }

  try {
    const normalizedMail = mail.toLowerCase().trim();
    const user = await User.findOne({ mail: normalizedMail });

    if (!user) {
      logger.warn('Intento de login fallido: usuario no encontrado', { mail: normalizedMail });
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    if (!user.state) {
      logger.warn('Intento de login fallido: cuenta inactiva', { mail: normalizedMail });
      return res.status(403).json({ message: 'Su cuenta está inactiva. Por favor contacte al administrador.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logger.warn('Intento de login fallido: contraseña incorrecta', { mail: normalizedMail });
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    const payload = buildUserPayload(user);
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await RefreshToken.deleteMany({
      userId: user._id,
      $or: [
        { expiresAt: { $lte: new Date() } },
        { token: refreshToken },
      ],
    });

    await RefreshToken.create({
      token: refreshToken,
      userId: user._id,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE),
    });

    res.cookie('token', accessToken, getCookieConfig(ACCESS_TOKEN_MAX_AGE));
    res.cookie('refreshToken', refreshToken, getCookieConfig(REFRESH_TOKEN_MAX_AGE));

    logger.info('Usuario autenticado exitosamente', { mail: normalizedMail, role: user.role });

    return res.status(200).json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        mail: user.mail,
      },
    });
  } catch (error) {
    logger.error('Error al procesar el login', { mail, error: error.message });
    return res.status(500).json({ message: 'Error al iniciar sesión.', error: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      await RefreshToken.deleteOne({ token: refreshToken });
      logger.info('Refresh token eliminado durante logout');
    }

    clearAuthCookies(res);

    logger.info('Usuario cerró sesión exitosamente');
    return res.status(200).json({ message: 'User logged out successfully!' });
  } catch (error) {
    logger.error('Error durante el logout', { error: error.message });
    return res.status(500).json({ message: 'Error during logout', error: error.message });
  }
};

export const refreshAccessToken = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    logger.warn('Intento de refresh sin token');
    clearAuthCookies(res);
    return res.status(401).json({ message: 'No autorizado, por favor inicia sesión de nuevo.' });
  }

  try {
    const storedToken = await RefreshToken.findOne({ token: refreshToken });

    if (!storedToken) {
      logger.warn('Refresh token no válido o revocado');
      clearAuthCookies(res);
      return res.status(403).json({ message: 'Refresh token no válido o revocado.' });
    }

    if (storedToken.expiresAt <= new Date()) {
      await RefreshToken.deleteOne({ token: refreshToken });
      clearAuthCookies(res);
      return res.status(403).json({ message: 'Refresh token expirado.' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.state) {
      await RefreshToken.deleteOne({ token: refreshToken });
      clearAuthCookies(res);
      return res.status(403).json({ message: 'Sesión inválida. Por favor inicia sesión nuevamente.' });
    }

    const payload = buildUserPayload(user);
    const newAccessToken = generateAccessToken(payload);

    res.cookie('token', newAccessToken, getCookieConfig(ACCESS_TOKEN_MAX_AGE));

    logger.info('Access token refrescado exitosamente', { mail: user.mail });

    return res.status(200).json({
      message: 'Access token refreshed',
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        mail: user.mail,
      },
    });
  } catch (error) {
    await RefreshToken.deleteOne({ token: refreshToken });
    clearAuthCookies(res);
    logger.error('Error al refrescar token', { error: error.message });
    return res.status(403).json({ message: 'Invalid refresh token, please log in again.' });
  }
};
