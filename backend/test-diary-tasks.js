import { db } from './src/db/init.js';

console.log('Testing diary entries with linked tasks...');

// Get the most recent diary entry
const recentEntry = db.prepare(`
  SELECT id, title FROM diary_entries 
  ORDER BY id DESC LIMIT 1
`).get();

console.log('Most recent diary entry:', recentEntry);

if (recentEntry) {
  // Check if any tasks are linked to this entry
  const linkedTasks = db.prepare(`
    SELECT t.id, t.title, t.priority, c.name as column_name, p.name as project_name
    FROM tasks t
    LEFT JOIN columns c ON t.column_id = c.id
    LEFT JOIN boards b ON c.board_id = b.id
    LEFT JOIN projects p ON b.project_id = p.id
    WHERE t.diary_entry_id = ?
  `).all(recentEntry.id);
  
  console.log('Linked tasks for entry', recentEntry.id, ':', linkedTasks);
}

// Also check all tasks with diary entries
const allLinkedTasks = db.prepare(`
  SELECT t.id, t.title, t.diary_entry_id, de.title as diary_title
  FROM tasks t
  JOIN diary_entries de ON t.diary_entry_id = de.id
  ORDER BY t.id DESC LIMIT 5
`).all();

console.log('All tasks with diary entries:', allLinkedTasks);