import express from 'express';
import { PORT } from './config/config.js';
import morgan from 'morgan';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Middleware base
app.use(express.json({ limit: '25mb' }));
app.use(morgan('dev'));
app.use(cookieParser());
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://69.62.96.81:4002',
    'https://ligainfantilyb.com',
    'http://localhost:4002'
  ],
  credentials: true,
}));

app.get('/', (req, res) => {
  res.send('Hello World');
});

const startServer = async () => {
  try {
    console.log('Iniciando backend...');
    console.log('Cargando conexion a base de datos...');
    const { connectDB } = await import('./db/db.connection.js');
    await connectDB();

    console.log('Cargando rutas de estudiantes...');
    const { default: studentRouter } = await import('./routes/student/student.router.js');
    app.use('/api/students', studentRouter);

    console.log('Cargando rutas de cuotas...');
    const { default: shareRouter } = await import('./routes/share/share.router.js');
    app.use('/api/shares', shareRouter);

    console.log('Cargando rutas de usuarios...');
    const { default: userRoutes } = await import('./routes/user/user.router.js');
    app.use('/api/users', userRoutes);

    console.log('Cargando rutas de autenticacion...');
    const { default: authRoutes } = await import('./routes/login/login.router.js');
    app.use('/api/auth', authRoutes);

    console.log('Cargando rutas de email...');
    const { default: emailRoutes } = await import('./routes/email/email.router.js');
    app.use('/api/email', emailRoutes);

    console.log('Cargando rutas de movimientos...');
    const { default: motionRoutes } = await import('./routes/motion/motion.router.js');
    app.use('/api/motions', motionRoutes);

    // 404 de API
    app.use('/api', (req, res) => {
      res.status(404).json({ message: 'Ruta no encontrada' });
    });

    // Middleware global de errores: siempre al final
    app.use((err, req, res, next) => {
      console.error(err.stack);

      const statusCode = err.statusCode || 500;
      res.status(statusCode).json({
        message: err.message || 'Something went wrong!',
        error: process.env.NODE_ENV === 'production' ? undefined : err.stack,
      });
    });

    app.listen(PORT, () => {
      console.log(`La aplicación está escuchando en el puerto ${PORT}`);
    });
  } catch (error) {
    console.error('No se pudo iniciar el backend:', error.message);
    process.exit(1);
  }
};

startServer();
