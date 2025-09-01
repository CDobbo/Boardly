import express from 'express';
import { db } from '../db/init.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all goals for the authenticated user
router.get('/', authenticateToken, (req, res, next) => {
  try {
    const goals = db.prepare(`
      SELECT id, title, description, category, completed, target_date, created_at, updated_at
      FROM goals 
      WHERE user_id = ?
      ORDER BY completed ASC, created_at DESC
    `).all(req.user.id);
    
    res.json(goals);
  } catch (error) {
    next(error);
  }
});

// Create a new goal
router.post('/', authenticateToken, (req, res, next) => {
  try {
    const { title, description, category, completed = false, target_date } = req.body;
    
    const result = db.prepare(`
      INSERT INTO goals (title, description, category, completed, target_date, user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(title, description, category, completed ? 1 : 0, target_date, req.user.id);
    
    const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(goal);
  } catch (error) {
    next(error);
  }
});

// Update a goal
router.put('/:id', authenticateToken, (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, category, completed, target_date } = req.body;
    // Processing goal update
    
    const result = db.prepare(`
      UPDATE goals 
      SET title = ?, description = ?, category = ?, completed = ?, target_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(title, description, category, completed ? 1 : 0, target_date, id, req.user.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    
    const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
    res.json(goal);
  } catch (error) {
    next(error);
  }
});

// Delete a goal
router.delete('/:id', authenticateToken, (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = db.prepare('DELETE FROM goals WHERE id = ? AND user_id = ?')
      .run(id, req.user.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;