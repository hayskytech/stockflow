import mysql from 'mysql2/promise';
import { ENV } from '../config/env.js';

export const pool = mysql.createPool({
  host: ENV.DB_HOST,
  port: ENV.DB_PORT,
  database: ENV.DB_NAME,
  user: ENV.DB_USER,
  password: ENV.DB_PASSWORD,
  connectionLimit: ENV.DB_POOL_LIMIT,
  dateStrings: true,
});
