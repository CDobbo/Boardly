import Database from 'better-sqlite3';
import path from 'path';

const db = new Database('./database.sqlite');

console.log('=== USERS ===');
const users = db.prepare("SELECT id, email, name, role FROM users").all();
console.log(users);

console.log('\n=== PROJECTS ===');
const projects = db.prepare(`
  SELECT p.id, p.name, p.description, u.email as owner_email 
  FROM projects p 
  JOIN users u ON p.owner_id = u.id
`).all();
console.log(projects);

console.log('\n=== TASKS COUNT ===');
const taskCount = db.prepare("SELECT COUNT(*) as count FROM tasks").get();
console.log(taskCount);

db.close();