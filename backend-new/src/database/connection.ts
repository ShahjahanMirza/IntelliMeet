import dotenv from 'dotenv';
import { pool as sqlitePool, initializeDatabase as sqliteInit } from './sqlite.js';

dotenv.config();

// Use SQLite for development, PostgreSQL for production
const USE_SQLITE = process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL;

export const pool = sqlitePool;
export const initializeDatabase = sqliteInit;
export { cleanupDatabase } from './sqlite.js';
