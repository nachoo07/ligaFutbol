import express from 'express';
import {PORT} from './config/config.js';
import morgan from 'morgan';
import cors from 'cors';
import cookieParser from 'cookie-parser'; // Importa cookie-parser
import './db/db.connection.js';
import studentRouter from './routes/student/student.router.js';
import shareRouter from './routes/share/share.router.js';
import userRoutes from './routes/user/user.router.js';
import authRoutes from './routes/login/login.router.js';
import emailRoutes from './routes/email/email.router.js';
import motionRoutes from './routes/motion/motion.router.js';
import RefreshToken from './models/refreshToken/refreshToken.models.js';

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev')); // Logger de solicitudes

app.use(cookieParser()); // Agrega middleware para manejar cookies
app.use(cors({
  origin: ['http://localhost:4001', 'http://localhost:5173'], // Ajusta según tu frontend
    credentials: true, // Necesario para enviar/recibir cookies
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
  
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!', error: err.message });
});
  
  // Servidor escuchando
app.listen(PORT, () => {
    console.log(`La aplicación está escuchando en el puerto ${PORT}`);
  });

  process.on('SIGTERM', async () => {
    console.log('Servidor apagándose, invalidando RefreshTokens...');
    try {
        await RefreshToken.deleteMany({});
        console.log('RefreshTokens eliminados');
    } catch (error) {
        console.error('Error al eliminar RefreshTokens:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Conexión a la base de datos cerrada');
        process.exit(0);
    }
});

process.on('SIGINT', async () => {
    console.log('Servidor apagándose, invalidando RefreshTokens...');
    try {
        await RefreshToken.deleteMany({});
        console.log('RefreshTokens eliminados');
    } catch (error) {
        console.error('Error al eliminar RefreshTokens:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Conexión a la base de datos cerrada');
        process.exit(0);
    }
});