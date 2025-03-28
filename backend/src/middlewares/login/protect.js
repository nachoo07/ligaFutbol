import jwt from 'jsonwebtoken';

export const protect = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ message: 'Sin token, autorización denegada' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'El token ha caducado, actualice o inicie sesión nuevamente' });
        }
        return res.status(401).json({ message: 'El token no es válido' });
    }
};

export const admin = (req, res, next) => {
    // Verificar si el rol del usuario es 'admin'
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Prohibido: No eres administrador' });
    }
    next();
};