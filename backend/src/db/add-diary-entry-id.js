import { db } from './index.js';

// Migration to add diary_entry_id column to tasks table
try {
  // Check if column already exists
  const tableInfo = db.prepare("PRAGMA table_info(tasks)").all();
  const columnExists = tableInfo.some(col => col.name === 'diary_entry_id');
  
  if (!columnExists) {
    // Add the diary_entry_id column
    db.prepare(`
      ALTER TABLE tasks 
      ADD COLUMN diary_entry_id INTEGER 
      REFERENCES diary_entries(id) ON DELETE SET NULL
    `).run();
    
    console.log('Successfully added diary_entry_id column to tasks table');
  } else {
    console.log('diary_entry_id column already exists in tasks table');
  }
} catch (error) {
  console.error('Error adding diary_entry_id column:', error);
}