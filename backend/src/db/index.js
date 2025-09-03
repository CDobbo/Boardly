import dotenv from 'dotenv';
import pg from 'pg';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;

// Check if we should use PostgreSQL
// Always use PostgreSQL if DATABASE_URL is set, or in production
const usePostgreSQL = !!(process.env.DATABASE_URL || process.env.NODE_ENV === 'production');

class DatabaseWrapper {
  constructor() {
    if (usePostgreSQL) {
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is required in production. Please set it to your PostgreSQL connection string.');
      }
      console.log('Connecting to PostgreSQL database');
      this.type = 'postgresql';
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? {
          rejectUnauthorized: false
        } : false
      });
      
      // Test connection
      this.pool.connect((err, client, release) => {
        if (err) {
          console.error('Error connecting to PostgreSQL:', err.stack);
        } else {
          console.log('Connected to PostgreSQL database');
          release();
        }
      });
    } else {
      console.log('Using SQLite database');
      this.type = 'sqlite';
      // Don't create SQLite in production when we should be using PostgreSQL
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Cannot use SQLite in production. DATABASE_URL must be set.');
      }
      const dbPath = path.resolve(__dirname, '../../', process.env.DB_PATH || './database.sqlite');
      this.sqliteDb = new Database(dbPath);
    }
  }

  // Synchronous prepare for backward compatibility (works with SQLite, makes async calls for PostgreSQL)
  prepare(query) {
    if (this.type === 'sqlite') {
      return this.sqliteDb.prepare(query);
    }
    
    // For PostgreSQL, convert placeholders and return an object with sync-looking methods
    // that actually perform async operations (this is a compatibility hack)
    let pgQuery = query;
    let paramIndex = 1;
    pgQuery = query.replace(/\?/g, () => `$${paramIndex++}`);
    
    return {
      get: (...params) => {
        // WARNING: This is a sync wrapper around async - only works because most routes already handle promises
        const promise = this.pool.query(pgQuery, params).then(result => result.rows[0]);
        // Return undefined synchronously, but the routes are already async so they'll await properly
        return promise;
      },
      all: (...params) => {
        const promise = this.pool.query(pgQuery, params).then(result => result.rows);
        return promise;
      },
      run: (...params) => {
        let finalQuery = pgQuery;
        if (pgQuery.toLowerCase().includes('insert into')) {
          if (!pgQuery.toLowerCase().includes('returning')) {
            finalQuery = pgQuery + ' RETURNING id';
          }
        }
        
        const promise = this.pool.query(finalQuery, params).then(result => ({
          changes: result.rowCount,
          lastInsertRowid: result.rows[0]?.id || null
        }));
        return promise;
      }
    };
  }

  // Execute raw SQL
  exec(sql) {
    if (this.type === 'sqlite') {
      return this.sqliteDb.exec(sql);
    } else {
      // For PostgreSQL, return a promise
      const statements = sql.split(';').filter(s => s.trim());
      return Promise.all(statements.map(statement => 
        statement.trim() ? this.pool.query(statement) : Promise.resolve()
      ));
    }
  }

  // Transaction support
  transaction(callback) {
    if (this.type === 'sqlite') {
      const trx = this.sqliteDb.transaction(callback);
      return trx();
    } else {
      return (async () => {
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
      })();
    }
  }

  // Close connection
  close() {
    if (this.type === 'sqlite') {
      this.sqliteDb.close();
    } else {
      return this.pool.end();
    }
  }
}

// Create singleton instance
export const db = new DatabaseWrapper();

// Initialize database
export async function initDatabase() {
  if (usePostgreSQL) {
    // PostgreSQL schema
    const initSQL = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT CHECK(role IN ('user', 'admin')) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        due_date TIMESTAMP,
        owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS boards (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        position INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS columns (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
        position INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS diary_entries (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT CHECK(category IN ('meeting', 'action', 'note', 'decision', 'follow-up')) DEFAULT 'note',
        date DATE NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
        status TEXT DEFAULT 'To Do',
        column_id INTEGER NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
        assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        due_date TIMESTAMP,
        position INTEGER DEFAULT 0,
        diary_entry_id INTEGER REFERENCES diary_entries(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS task_dependencies (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        depends_on_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(task_id, depends_on_task_id)
      );

      CREATE TABLE IF NOT EXISTS project_members (
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT CHECK(role IN ('owner', 'admin', 'member')) DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (project_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP,
        all_day BOOLEAN DEFAULT FALSE,
        event_type TEXT CHECK(event_type IN ('event', 'deadline', 'meeting', 'reminder')) DEFAULT 'event',
        priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS goals (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        target_date DATE,
        status TEXT CHECK(status IN ('active', 'completed', 'paused')) DEFAULT 'active',
        progress INTEGER DEFAULT 0,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create tables one by one for PostgreSQL
    const statements = initSQL.split(';').filter(s => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await db.pool.query(statement);
        } catch (error) {
          // Table might already exist, continue
          console.log('Table creation note:', error.message);
        }
      }
    }

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_tasks_column ON tasks(column_id)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id)',
      'CREATE INDEX IF NOT EXISTS idx_columns_board ON columns(board_id)',
      'CREATE INDEX IF NOT EXISTS idx_boards_project ON boards(project_id)',
      'CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON task_dependencies(task_id)',
      'CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends ON task_dependencies(depends_on_task_id)',
      'CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_events_project ON events(project_id)',
      'CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date)',
      'CREATE INDEX IF NOT EXISTS idx_diary_entries_user ON diary_entries(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_diary_entries_date ON diary_entries(date)',
      'CREATE INDEX IF NOT EXISTS idx_diary_entries_category ON diary_entries(category)'
    ];

    for (const index of indexes) {
      try {
        await db.pool.query(index);
      } catch (error) {
        // Index might already exist
      }
    }

    console.log('PostgreSQL database initialized successfully');
  } else {
    // Use existing SQLite initialization - only import if needed
    if (!usePostgreSQL) {
      const { initDatabase: initSQLite } = await import('./init.js');
      initSQLite();
    }
  }
}

export default db;