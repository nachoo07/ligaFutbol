import dotenv from 'dotenv';

dotenv.config();

export const PORT = process.env.PORT || 4002;
export const CONNECTION_STRING = process.env.CONNECTION_STRING