import * as fs from 'fs';
import * as path from 'path';
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: Number(process.env.DATABASE_PORT ?? 3306),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    multipleStatements: true,
  });

  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf-8');

    console.log('Running schema...');
    await conn.query(schema);
    console.log('Running seed...');
    await conn.query(seed);
    console.log('Migration complete.');
  } finally {
    await conn.end();
  }
}

migrate().catch((e) => { console.error(e); process.exit(1); });
