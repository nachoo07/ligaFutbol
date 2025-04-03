import express from 'express';
import { PORT } from './config/config.js';
import morgan from 'morgan';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import './db/db.connection.js';
import studentRouter from './routes/student/student.router.js';
import shareRouter from './routes/share/share.router.js';
import userRoutes from './routes/user/user.router.js';
import authRoutes from './routes/login/login.router.js';
import emailRoutes from './routes/email/email.router.js';
import motionRoutes from './routes/motion/motion.router.js';
import dotenv from 'dotenv';

dotenv.config();
const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));
app.use(cookieParser());
app.use(cors({
  origin: ['http://localhost:4001', 'http://localhost:5173'],
  credentials: true,
}));

// Rutas
app.use('/api/students', studentRouter);
app.use('/api/shares', shareRouter);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/motions', motionRoutes);

// Ruta base
app.get('/', (req, res) => {
  res.send('Hello World');
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`La aplicación está escuchando en el puerto ${PORT}`);
});