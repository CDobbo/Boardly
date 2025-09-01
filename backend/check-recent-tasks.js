import { db } from './src/db/init.js';

console.log('Recent tasks:');
const tasks = db.prepare(`
  SELECT t.id, t.title, t.description, t.diary_entry_id, 
         de.title as diary_entry_title, de.date as diary_entry_date,
         c.name as column_name
  FROM tasks t
  LEFT JOIN diary_entries de ON t.diary_entry_id = de.id  
  LEFT JOIN columns c ON t.column_id = c.id
  ORDER BY t.id DESC LIMIT 5
`).all();

tasks.forEach(task => {
  console.log(`ID: ${task.id}, Title: "${task.title}", Column: ${task.column_name}, Diary ID: ${task.diary_entry_id}`);
  if (task.diary_entry_title) {
    console.log(`  -> From diary: "${task.diary_entry_title}" (${task.diary_entry_date})`);
  }
});