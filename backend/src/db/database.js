import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Determine which database to use based on environment
const usePostgreSQL = process.env.DATABASE_URL && process.env.NODE_ENV === 'production';

let db;
let initDatabase;

if (usePostgreSQL) {
  // Use PostgreSQL in production
  console.log('Using PostgreSQL database');
  const module = await import('./postgres-init.js');
  db = module.db;
  initDatabase = module.initDatabase;
} else {
  // Use SQLite for local development
  console.log('Using SQLite database');
  const module = await import('./init.js');
  db = module.db;
  initDatabase = module.initDatabase;
}

export { db, initDatabase };