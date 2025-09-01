import express from 'express';
import { db } from './src/db/init.js';

// Create a test user token (bypassing auth for testing)
const testUserId = 1;

// Test the diary entries logic directly
console.log('Testing diary API logic...\n');

// Get all entries for user
let sql = `
  SELECT * FROM diary_entries 
  WHERE user_id = ?
  ORDER BY date DESC, created_at DESC
`;
const entries = db.prepare(sql).all(testUserId);

console.log(`Found ${entries.length} diary entries for user ${testUserId}\n`);

// Add linked tasks to each diary entry (same logic as the API)
const entriesWithTasks = entries.map(entry => {
  const linkedTasks = db.prepare(`
    SELECT t.id, t.title, t.priority, c.name as column_name, p.name as project_name
    FROM tasks t
    LEFT JOIN columns c ON t.column_id = c.id
    LEFT JOIN boards b ON c.board_id = b.id
    LEFT JOIN projects p ON b.project_id = p.id
    WHERE t.diary_entry_id = ?
  `).all(entry.id);
  
  return { ...entry, linkedTasks };
});

// Find the specific entry we're interested in
const targetEntry = entriesWithTasks.find(e => e.id === 611);

if (targetEntry) {
  console.log('Entry 611: "' + targetEntry.title + '"');
  console.log('Has linkedTasks field:', 'linkedTasks' in targetEntry);
  console.log('Number of linked tasks:', targetEntry.linkedTasks ? targetEntry.linkedTasks.length : 0);
  
  if (targetEntry.linkedTasks && targetEntry.linkedTasks.length > 0) {
    console.log('\nLinked tasks:');
    targetEntry.linkedTasks.forEach((task, index) => {
      console.log(`  ${index + 1}. "${task.title}"`);
      console.log(`     Priority: ${task.priority}, Column: ${task.column_name}, Project: ${task.project_name}`);
    });
  }
  
  console.log('\nFull entry object:');
  console.log(JSON.stringify(targetEntry, null, 2));
} else {
  console.log('Entry 611 not found!');
}

console.log('\n\nChecking if any entries have linked tasks...');
const entriesWithLinkedTasks = entriesWithTasks.filter(e => e.linkedTasks && e.linkedTasks.length > 0);
console.log(`${entriesWithLinkedTasks.length} out of ${entriesWithTasks.length} entries have linked tasks`);

if (entriesWithLinkedTasks.length > 0) {
  console.log('\nEntries with linked tasks:');
  entriesWithLinkedTasks.forEach(entry => {
    console.log(`- Entry ${entry.id}: "${entry.title}" (${entry.linkedTasks.length} tasks)`);
  });
}