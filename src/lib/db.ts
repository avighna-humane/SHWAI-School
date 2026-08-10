import postgres from 'postgres';

// Uses Replit's built-in PostgreSQL (DATABASE_URL is always set in the runtime).
const DB_URL = process.env.DATABASE_URL ?? '';

if (!DB_URL && typeof window === 'undefined') {
  console.warn('[db] DATABASE_URL is not set');
}

export const sql = postgres(DB_URL, {
  max: 5,
  idle_timeout: 30,
  connect_timeout: 10,
});
