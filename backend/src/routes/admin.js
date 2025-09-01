import express from 'express';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { db } from '../db/init.js';
import { requireAdmin } from '../middleware/admin.js';

const router = express.Router();

// Get all users
router.get('/users', requireAdmin, (req, res, next) => {
  try {
    // Admin retrieving user list
    
    const users = db.prepare(`
      SELECT id, email, name, role, created_at, updated_at
      FROM users 
      ORDER BY created_at DESC
    `).all();
    
    // User list retrieved successfully
    
    res.json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    next(error);
  }
});

// Create new user
router.post('/users', requireAdmin, async (req, res, next) => {
  try {
    const { email, name, password, role = 'user' } = req.body;
    
    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Email, name, and password are required' });
    }

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Role must be either user or admin' });
    }

    // Check if user already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const insertUser = db.prepare(`
      INSERT INTO users (email, name, password, role)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = insertUser.run(email, name, hashedPassword, role);
    
    const user = db.prepare(`
      SELECT id, email, name, role, created_at, updated_at
      FROM users WHERE id = ?
    `).get(result.lastInsertRowid);
    
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

// Update user
router.put('/users/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, name, role, password } = req.body;
    
    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }

    if (role && !['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Role must be either user or admin' });
    }

    // Check if user exists
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent removing admin role from the last admin
    if (user.role === 'admin' && role === 'user') {
      const adminCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('admin');
      if (adminCount.count <= 1) {
        return res.status(400).json({ error: 'Cannot remove admin role from the last admin user' });
      }
    }

    let updateQuery = 'UPDATE users SET email = ?, name = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    let params = [email, name, role || user.role, id];

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery = 'UPDATE users SET email = ?, name = ?, role = ?, password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      params = [email, name, role || user.role, hashedPassword, id];
    }

    db.prepare(updateQuery).run(...params);

    const updatedUser = db.prepare(`
      SELECT id, email, name, role, created_at, updated_at
      FROM users WHERE id = ?
    `).get(id);
    
    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
});

// Delete user
router.delete('/users/:id', requireAdmin, (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deleting the last admin
    if (user.role === 'admin') {
      const adminCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('admin');
      if (adminCount.count <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last admin user' });
      }
    }

    // Check if user is the current admin trying to delete themselves
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get system statistics
router.get('/stats', requireAdmin, (req, res, next) => {
  try {
    const stats = {
      users: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
      admins: db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('admin').count,
      projects: db.prepare('SELECT COUNT(*) as count FROM projects').get().count,
      tasks: db.prepare('SELECT COUNT(*) as count FROM tasks').get().count,
    };
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// Cleanup test users (admin only)
router.delete('/cleanup-test-users', requireAdmin, (req, res, next) => {
  try {
    // Delete users with test email pattern
    const result = db.prepare(`
      DELETE FROM users 
      WHERE email LIKE 'test%@example.com'
    `).run();
    
    // Test users cleaned up
    res.json({ 
      success: true, 
      message: `Cleaned up ${result.changes} test users` 
    });
  } catch (error) {
    next(error);
  }
});

// Create database backup
router.post('/backup', requireAdmin, (req, res, next) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'backups');
    const backupFileName = `database-backup-${timestamp}.db`;
    const backupPath = path.join(backupDir, backupFileName);
    
    // Create backups directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Get database path
    const dbPath = path.join(process.cwd(), 'database.db');
    
    // Copy database file
    fs.copyFileSync(dbPath, backupPath);
    
    // Get backup file size
    const stats = fs.statSync(backupPath);
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    // Database backup created
    
    res.json({
      success: true,
      message: 'Database backup created successfully',
      filename: backupFileName,
      path: backupPath,
      size: `${fileSizeInMB} MB`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Backup creation failed:', error);
    next(error);
  }
});

// List database backups
router.get('/backups', requireAdmin, (req, res, next) => {
  try {
    const backupDir = path.join(process.cwd(), 'backups');
    
    if (!fs.existsSync(backupDir)) {
      return res.json([]);
    }
    
    const files = fs.readdirSync(backupDir)
      .filter(file => file.endsWith('.db'))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          size: `${(stats.size / (1024 * 1024)).toFixed(2)} MB`,
          created: stats.birthtime.toISOString(),
          modified: stats.mtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.created) - new Date(a.created));
    
    res.json(files);
  } catch (error) {
    next(error);
  }
});

export default router;