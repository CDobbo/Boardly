import { db } from './src/db/init.js';
import bcrypt from 'bcryptjs';

const email = 'chris@chris.com';
const testPassword = 'Chris123'; // Try common password

const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
if (user) {
  console.log('User found:', {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    hasPassword: !!user.password
  });
  
  // Test password
  const isValid = await bcrypt.compare(testPassword, user.password);
  console.log(`Password "${testPassword}" is valid:`, isValid);
  
  // If you know the correct password, we can update it
  // const newHash = await bcrypt.hash('your-actual-password', 10);
  // db.prepare('UPDATE users SET password = ? WHERE email = ?').run(newHash, email);
} else {
  console.log('User not found');
}

process.exit(0);