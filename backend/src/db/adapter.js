import dotenv from 'dotenv';
import pg from 'pg';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;

// Check if we should use PostgreSQL
const usePostgreSQL = process.env.DATABASE_URL && (
  process.env.NODE_ENV === 'production' || 
  process.env.USE_POSTGRESQL === 'true'
);

class DatabaseAdapter {
  constructor() {
    if (usePostgreSQL) {
      console.log('Connecting to PostgreSQL database');
      this.type = 'postgresql';
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? {
          rejectUnauthorized: false
        } : false
      });
    } else {
      console.log('Using SQLite database');
      this.type = 'sqlite';
      const dbPath = process.env.NODE_ENV === 'production' 
        ? '/var/data/database.sqlite'
        : path.resolve(__dirname, '../../', process.env.DB_PATH || './database.sqlite');
      this.db = new Database(dbPath);
    }
  }

  // Unified prepare method that returns consistent API
  prepare(query) {
    // Convert SQLite-style placeholders (?) to PostgreSQL-style ($1, $2, etc.)
    let pgQuery = query;
    let paramIndex = 1;
    if (this.type === 'postgresql') {
      pgQuery = query.replace(/\?/g, () => `$${paramIndex++}`);
    }

    return {
      get: async (...params) => {
        if (this.type === 'sqlite') {
          return this.db.prepare(query).get(...params);
        } else {
          const result = await this.pool.query(pgQuery, params);
          return result.rows[0];
        }
      },
      all: async (...params) => {
        if (this.type === 'sqlite') {
          return this.db.prepare(query).all(...params);
        } else {
          const result = await this.pool.query(pgQuery, params);
          return result.rows;
        }
      },
      run: async (...params) => {
        if (this.type === 'sqlite') {
          const result = this.db.prepare(query).run(...params);
          return {
            changes: result.changes,
            lastInsertRowid: result.lastInsertRowid
          };
        } else {
          // Handle INSERT statements with RETURNING for PostgreSQL
          let finalQuery = pgQuery;
          if (pgQuery.toLowerCase().includes('insert into')) {
            // Add RETURNING id clause if not present
            if (!pgQuery.toLowerCase().includes('returning')) {
              finalQuery = pgQuery + ' RETURNING id';
            }
          }
          
          const result = await this.pool.query(finalQuery, params);
          return {
            changes: result.rowCount,
            lastInsertRowid: result.rows[0]?.id || null
          };
        }
      }
    };
  }

  // Execute raw SQL (for schema creation)
  async exec(sql) {
    if (this.type === 'sqlite') {
      return this.db.exec(sql);
    } else {
      // Split multiple statements for PostgreSQL
      const statements = sql.split(';').filter(s => s.trim());
      for (const statement of statements) {
        if (statement.trim()) {
          await this.pool.query(statement);
        }
      }
    }
  }

  // Transaction support
  async transaction(callback) {
    if (this.type === 'sqlite') {
      const trx = this.db.transaction(callback);
      return trx();
    } else {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        const result = await callback();
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
  }

  // Close connection
  async close() {
    if (this.type === 'sqlite') {
      this.db.close();
    } else {
      await this.pool.end();
    }
  }
}

// Create singleton instance
const adapter = new DatabaseAdapter();
export const db = adapter;

// Export the adapter prepare method for compatibility
export default adapter;