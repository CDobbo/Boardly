import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// PostgreSQL connection pool
export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

export async function initDatabase() {
  try {
    // Create tables
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT CHECK(role IN ('user', 'admin')) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        due_date TIMESTAMP,
        owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS boards (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        position INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS columns (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
        position INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS diary_entries (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT CHECK(category IN ('meeting', 'action', 'note', 'decision', 'follow-up')) DEFAULT 'note',
        date DATE NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
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
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS task_dependencies (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        depends_on_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(task_id, depends_on_task_id)
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS project_members (
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT CHECK(role IN ('owner', 'admin', 'member')) DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (project_id, user_id)
      )
    `);

    await db.query(`
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
      )
    `);

    // Create indexes
    await db.query(`CREATE INDEX IF NOT EXISTS idx_tasks_column ON tasks(column_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_columns_board ON columns(board_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_boards_project ON boards(project_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON task_dependencies(task_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends ON task_dependencies(depends_on_task_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_events_project ON events(project_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_diary_entries_user ON diary_entries(user_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_diary_entries_date ON diary_entries(date)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_diary_entries_category ON diary_entries(category)`);

    // Update any existing backlog tasks to 'To Do'
    const updateResult = await db.query("UPDATE tasks SET status = 'To Do' WHERE status = 'backlog'");
    if (updateResult.rowCount > 0) {
      console.log(`Updated ${updateResult.rowCount} backlog tasks to 'To Do'`);
    }

    console.log('PostgreSQL database initialized successfully');
  } catch (error) {
    console.error('Error initializing PostgreSQL database:', error);
    throw error;
  }
}

// PostgreSQL query wrapper to match SQLite API
db.prepare = function(query) {
  return {
    get: async (...params) => {
      const result = await db.query(query, params);
      return result.rows[0];
    },
    all: async (...params) => {
      const result = await db.query(query, params);
      return result.rows;
    },
    run: async (...params) => {
      const result = await db.query(query, params);
      return {
        changes: result.rowCount,
        lastInsertRowid: result.rows[0]?.id
      };
    }
  };
};

if (import.meta.url === `file://${process.argv[1]}`) {
  initDatabase().then(() => {
    process.exit(0);
  }).catch(err => {
    console.error(err);
    process.exit(1);
  });
}