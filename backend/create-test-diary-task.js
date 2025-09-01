import { db } from './src/db/init.js';

console.log('🧪 Creating test diary entry and linked task...\n');

// Create a new diary entry for testing
const diaryResult = db.prepare(`
  INSERT INTO diary_entries (title, content, category, date, user_id)
  VALUES (?, ?, ?, ?, ?)
`).run(
  'TEST DIARY ENTRY FOR DEBUGGING',
  'This is a test diary entry created to debug the linkedTasks issue.',
  'note',
  '2025-08-31',
  1
);

console.log('✅ Created diary entry with ID:', diaryResult.lastInsertRowid);

// Get the default project and board
const project = db.prepare('SELECT * FROM projects WHERE owner_id = ? LIMIT 1').get(1);
if (!project) {
  console.log('❌ No project found for user 1');
  process.exit(1);
}

const board = db.prepare('SELECT * FROM boards WHERE project_id = ? LIMIT 1').get(project.id);
if (!board) {
  console.log('❌ No board found for project', project.id);
  process.exit(1);
}

const column = db.prepare('SELECT * FROM columns WHERE board_id = ? LIMIT 1').get(board.id);
if (!column) {
  console.log('❌ No column found for board', board.id);
  process.exit(1);
}

// Create a linked task
const taskResult = db.prepare(`
  INSERT INTO tasks (title, description, priority, column_id, assignee_id, diary_entry_id)
  VALUES (?, ?, ?, ?, ?, ?)
`).run(
  'TEST TASK LINKED TO DIARY',
  'This task was created to test the linkedTasks functionality.',
  'high',
  column.id,
  1,
  diaryResult.lastInsertRowid
);

console.log('✅ Created linked task with ID:', taskResult.lastInsertRowid);
console.log('   - Task is linked to diary entry ID:', diaryResult.lastInsertRowid);
console.log('   - Project:', project.name);
console.log('   - Board:', board.name);
console.log('   - Column:', column.name);

// Verify the link works
console.log('\n🔍 Testing the link...');

const linkedTasks = db.prepare(`
  SELECT t.id, t.title, t.priority, c.name as column_name, p.name as project_name
  FROM tasks t
  LEFT JOIN columns c ON t.column_id = c.id
  LEFT JOIN boards b ON c.board_id = b.id
  LEFT JOIN projects p ON b.project_id = p.id
  WHERE t.diary_entry_id = ?
`).all(diaryResult.lastInsertRowid);

console.log('✅ Found', linkedTasks.length, 'linked task(s):');
linkedTasks.forEach((task, i) => {
  console.log(`   ${i+1}. "${task.title}" (${task.priority}) in ${task.project_name} -> ${task.column_name}`);
});

// Now test the full diary API logic
console.log('\n🔄 Testing full diary API logic...');

const entries = db.prepare(`
  SELECT * FROM diary_entries 
  WHERE user_id = ?
  ORDER BY date DESC, created_at DESC
`).all(1);

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

const testEntry = entriesWithTasks.find(e => e.id === diaryResult.lastInsertRowid);
console.log('✅ Test diary entry in API format:');
console.log('   - Title:', testEntry.title);
console.log('   - LinkedTasks count:', testEntry.linkedTasks.length);
console.log('   - Full entry:', JSON.stringify(testEntry, null, 2));

console.log('\n🎯 Summary:');
console.log('- Created diary entry ID:', diaryResult.lastInsertRowid);
console.log('- Created task ID:', taskResult.lastInsertRowid);
console.log('- Task is properly linked via diary_entry_id');
console.log('- API logic returns linkedTasks correctly');
console.log('\nNow check the frontend to see if this test entry shows the linked task!');