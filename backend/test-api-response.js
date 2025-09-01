import { db } from './src/db/init.js';

console.log('🔍 Testing backend diary API logic directly...\n');

// Get all entries for user 1 (same as the API)
const sql = `
  SELECT * FROM diary_entries 
  WHERE user_id = ?
  ORDER BY date DESC, created_at DESC
`;
const entries = db.prepare(sql).all(1);

console.log(`Found ${entries.length} diary entries for user 1\n`);

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

// Find entry 611
const entry611 = entriesWithTasks.find(e => e.id === 611);

if (entry611) {
  console.log('✅ Entry 611 found with linkedTasks property:');
  console.log('   - Title:', entry611.title);
  console.log('   - Has linkedTasks property:', 'linkedTasks' in entry611);
  console.log('   - LinkedTasks array length:', entry611.linkedTasks ? entry611.linkedTasks.length : 'undefined');
  
  if (entry611.linkedTasks && entry611.linkedTasks.length > 0) {
    console.log('   - Task details:');
    entry611.linkedTasks.forEach((task, i) => {
      console.log(`     ${i+1}. "${task.title}" (${task.priority}, ${task.project_name} -> ${task.column_name})`);
    });
  }
  
  console.log('\n📄 Full API response format for entry 611:');
  console.log(JSON.stringify(entry611, null, 2));
} else {
  console.log('❌ Entry 611 not found in results');
  console.log('Available entry IDs:', entriesWithTasks.map(e => e.id));
}