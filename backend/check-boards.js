import Database from 'better-sqlite3';

const db = new Database('./database.sqlite');

console.log('=== BOARDS ===');
const boards = db.prepare(`
  SELECT b.id, b.name, b.project_id, p.name as project_name, 
         (SELECT COUNT(*) FROM columns c WHERE c.board_id = b.id) as column_count,
         (SELECT COUNT(*) FROM tasks t JOIN columns c ON t.column_id = c.id WHERE c.board_id = b.id) as task_count
  FROM boards b 
  JOIN projects p ON b.project_id = p.id
`).all();
console.log(boards);

console.log('\n=== COLUMNS ===');
const columns = db.prepare(`
  SELECT c.id, c.name, c.board_id, b.name as board_name, c.position,
         (SELECT COUNT(*) FROM tasks t WHERE t.column_id = c.id) as task_count
  FROM columns c
  JOIN boards b ON c.board_id = b.id
  ORDER BY c.board_id, c.position
`).all();
console.log(columns);

console.log('\n=== PROJECT MEMBERS ===');
const members = db.prepare(`
  SELECT pm.project_id, p.name as project_name, pm.user_id, u.name as user_name, u.email, pm.role
  FROM project_members pm
  JOIN projects p ON pm.project_id = p.id  
  JOIN users u ON pm.user_id = u.id
  WHERE u.email = 'chris@chris.com'
`).all();
console.log(members);

db.close();