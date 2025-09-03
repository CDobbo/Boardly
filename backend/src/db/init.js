import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Use a persistent volume path in production, local path in development
const dbPath = process.env.NODE_ENV === 'production' 
  ? '/var/data/database.sqlite'  // Render persistent disk
  : path.resolve(__dirname, '../../', process.env.DB_PATH || './database.sqlite');

export const db = new Database(dbPath);

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT CHECK(role IN ('user', 'admin')) DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      due_date DATETIME,
      owner_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS boards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      project_id INTEGER NOT NULL,
      position INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS columns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      board_id INTEGER NOT NULL,
      position INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
      status TEXT DEFAULT 'To Do',
      column_id INTEGER NOT NULL,
      assignee_id INTEGER,
      due_date DATETIME,
      position INTEGER DEFAULT 0,
      diary_entry_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE,
      FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (diary_entry_id) REFERENCES diary_entries(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS task_dependencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      depends_on_task_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      UNIQUE(task_id, depends_on_task_id)
    );

    CREATE TABLE IF NOT EXISTS project_members (
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT CHECK(role IN ('owner', 'admin', 'member')) DEFAULT 'member',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (project_id, user_id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      start_date DATETIME NOT NULL,
      end_date DATETIME,
      all_day BOOLEAN DEFAULT FALSE,
      event_type TEXT CHECK(event_type IN ('event', 'deadline', 'meeting', 'reminder')) DEFAULT 'event',
      priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
      project_id INTEGER,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_column ON tasks(column_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
    CREATE INDEX IF NOT EXISTS idx_columns_board ON columns(board_id);
    CREATE INDEX IF NOT EXISTS idx_boards_project ON boards(project_id);
    CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON task_dependencies(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends ON task_dependencies(depends_on_task_id);
    CREATE TABLE IF NOT EXISTS diary_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT CHECK(category IN ('meeting', 'action', 'note', 'decision', 'follow-up')) DEFAULT 'note',
      date DATE NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id);
    CREATE INDEX IF NOT EXISTS idx_events_project ON events(project_id);
    CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
    CREATE INDEX IF NOT EXISTS idx_diary_entries_user ON diary_entries(user_id);
    CREATE INDEX IF NOT EXISTS idx_diary_entries_date ON diary_entries(date);
    CREATE INDEX IF NOT EXISTS idx_diary_entries_category ON diary_entries(category);
  `);

  // Add role column if it doesn't exist (migration)
  try {
    const columns = db.prepare("PRAGMA table_info(users)").all();
    const hasRoleColumn = columns.some(col => col.name === 'role');
    
    if (!hasRoleColumn) {
      db.exec("ALTER TABLE users ADD COLUMN role TEXT CHECK(role IN ('user', 'admin')) DEFAULT 'user'");
      console.log('Added role column to users table');
    }

    // Set Chris@Chris.com as admin
    const updateAdmin = db.prepare("UPDATE users SET role = 'admin' WHERE email = 'Chris@Chris.com'");
    const result = updateAdmin.run();
    if (result.changes > 0) {
      console.log('Set Chris@Chris.com as admin');
    }

    // Update any existing backlog tasks to 'To Do'
    const updateBacklogTasks = db.prepare("UPDATE tasks SET status = 'To Do' WHERE status = 'backlog'");
    const backlogResult = updateBacklogTasks.run();
    if (backlogResult.changes > 0) {
      console.log(`Updated ${backlogResult.changes} backlog tasks to 'To Do'`);
    }
  } catch (error) {
    console.log('Migration already applied or error:', error.message);
  }

  console.log('Database initialized successfully');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  initDatabase();
}