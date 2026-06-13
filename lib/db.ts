import mysql from 'mysql2/promise';
import '@/lib/env';

declare global {
  // eslint-disable-next-line no-var
  var __dbPool: mysql.Pool | undefined;
}

function createPool(): mysql.Pool {
  return mysql.createPool({
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: Number(process.env.DATABASE_PORT ?? 3306),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    connectionLimit: 5,
    waitForConnections: true,
    charset: 'utf8mb4',
  });
}

export const db: mysql.Pool =
  process.env.NODE_ENV === 'production'
    ? createPool()
    : (global.__dbPool ?? (global.__dbPool = createPool()));
