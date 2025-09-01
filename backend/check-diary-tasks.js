import { db } from './src/db/init.js';

console.log('Tasks with diary entries:');
const tasks = db.prepare(`
  SELECT t.id, t.title, t.diary_entry_id, 
         de.title as diary_entry_title, de.date as diary_entry_date
  FROM tasks t
  JOIN diary_entries de ON t.diary_entry_id = de.id  
  ORDER BY t.id DESC
`).all();

console.log(`Found ${tasks.length} tasks linked to diary entries:`);
tasks.forEach(task => {
  console.log(`Task ID: ${task.id}, Title: "${task.title}"`);
  console.log(`  -> From diary: "${task.diary_entry_title}" (${task.diary_entry_date})`);
});

console.log('\nAll diary entries:');
const entries = db.prepare('SELECT id, title, date FROM diary_entries ORDER BY id DESC LIMIT 5').all();
entries.forEach(entry => {
  console.log(`Entry ID: ${entry.id}, Title: "${entry.title}", Date: ${entry.date}`);
});