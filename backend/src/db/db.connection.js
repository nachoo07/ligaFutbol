import mongoose from 'mongoose';
import { CONNECTION_STRING } from '../config/config.js';

export const connectDB = async () => {
  if (!CONNECTION_STRING) {
    throw new Error('Falta la variable CONNECTION_STRING en el archivo .env');
  }

  try {
    await mongoose.connect(CONNECTION_STRING, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('Conectado a la base de datos MongoDB');
  } catch (error) {
    console.error('Error al conectar con MongoDB:', error.message);
    throw error;
  }
};

mongoose.connection.on('error', (err) => {
  console.error('Error de MongoDB:', err.message);
});
