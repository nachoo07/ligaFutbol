import jwt from 'jsonwebtoken';
import logger from '../../winston/logger.js';
import User from '../../models/user/user.model.js';

export const protect = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: 'Sin token, autorización denegada' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('_id name mail role state');

    if (!user) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    if (!user.state) {
      return res.status(403).json({ message: 'Usuario inactivo' });
    }

    req.user = {
      userId: user._id,
      name: user.name,
      mail: user.mail,
      role: user.role,
    };

    logger.info('Usuario autenticado', { userId: user._id, role: user.role });
    next();
  } catch (error) {
    logger.error('Error al verificar token', { error: error.message });

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'El token ha caducado' });
    }

    return res.status(401).json({ message: 'El token no es válido' });
  }
};

export const admin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Prohibido: No eres administrador' });
  }

  next();
};
