import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { db } from '../db/init.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').trim().notEmpty()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, name } = req.body;

      const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existingUser) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      const result = db.prepare(
        'INSERT INTO users (email, password, name) VALUES (?, ?, ?)'
      ).run(email, hashedPassword, name);

      const user = { id: result.lastInsertRowid, email, name, role: 'user' };
      const token = generateToken(user);

      res.status(201).json({ user, token });
    } catch (error) {
      next(error);
    }
  }
);

router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;
      console.log('=== LOGIN DEBUG ===');
      console.log('Login attempt for:', email);
      console.log('Password provided:', password);

      const user = db.prepare('SELECT id, email, password, name, role FROM users WHERE email = ?').get(email);
      if (!user) {
        console.log('User not found for email:', email);
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      console.log('User found:', user.email, 'ID:', user.id);

      const validPassword = await bcrypt.compare(password, user.password);
      console.log('Password valid:', validPassword);
      if (!validPassword) {
        console.log('Invalid password for user:', email);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = generateToken(user);
      delete user.password;
      
      console.log('Login response for', email, '- user data:', user);
      res.json({ user, token });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/me', authenticateToken, (req, res, next) => {
  try {
    const user = db.prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?')
      .get(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('/me response for user id', req.user.id, '- user data:', user);
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.get('/users', authenticateToken, (req, res, next) => {
  try {
    const users = db.prepare('SELECT id, name, email FROM users ORDER BY name ASC').all();
    res.json(users);
  } catch (error) {
    next(error);
  }
});

export default router;