import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const db = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: { require: true, rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

export async function connect() {
  return db.connect();
}

export async function query(text, params) {
  return db.query(text, params);
}

// Optional: run bootstrap here (safer in a separate script)
; (async () => {
  let client;
  try {
    console.log('Attempting connection...');
    client = await db.connect();
    console.log('Connection successful.');

    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS videos (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        filepath VARCHAR(255) NOT NULL,
        mimetype VARCHAR(100) NOT NULL,
        size BIGINT NOT NULL,
        duration INT NOT NULL,
        upload_date TIMESTAMPTZ DEFAULT now(),
        author INT NOT NULL REFERENCES users(id),
        thumbnail VARCHAR(255),
        codec VARCHAR(50)
      );
    `);

    await client.query('COMMIT');
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('DB init failed:', err.message);
  } finally {
    if (client) {
      client.release();
      console.log('Releasing connection...');
    }
  }
})();

// ESM exports
export { db };
export default db;
