import mongoose from 'mongoose';
import { CONNECTION_STRING } from '../config/config.js';

mongoose.connect(CONNECTION_STRING)

mongoose.connection.on('connected', () => {
  console.log('conectado a la base de datos mongodb')
})

mongoose.connection.on('error', (err) => {
  console.error(err)
})
