import express from 'express';
import { body, validationResult, query } from 'express-validator';
import { db } from '../db/init.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', 
  [
    query('date').optional().isISO8601(),
    query('category').optional().isIn(['meeting', 'action', 'note', 'decision', 'follow-up']),
    query('search').optional().trim()
  ],
  (req, res, next) => {
    // Diary API accessed
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      let sql = `
        SELECT * FROM diary_entries 
        WHERE user_id = ?
      `;
      const params = [req.user.id];

      if (req.query.date) {
        sql += ' AND date = ?';
        params.push(req.query.date);
      }

      if (req.query.category) {
        sql += ' AND category = ?';
        params.push(req.query.category);
      }

      if (req.query.search) {
        sql += ' AND (title LIKE ? OR content LIKE ?)';
        const searchTerm = `%${req.query.search}%`;
        params.push(searchTerm, searchTerm);
      }

      sql += ' ORDER BY date DESC, created_at DESC';

      const entries = db.prepare(sql).all(...params);
      
      // Add linked tasks to each diary entry
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
      
      // Debug log for entry 611
      const entry611 = entriesWithTasks.find(e => e.id === 611);
      if (entry611) {
        // Entry linked tasks processed
      }
      
      // Add cache-busting headers
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'ETag': `"${Date.now()}"`
      });
      
      res.json(entriesWithTasks);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/by-date', (req, res, next) => {
  try {
    const entriesByDate = db.prepare(`
      SELECT 
        date,
        COUNT(*) as count,
        GROUP_CONCAT(category) as categories
      FROM diary_entries 
      WHERE user_id = ?
      GROUP BY date
      ORDER BY date DESC
      LIMIT 30
    `).all(req.user.id);

    res.json(entriesByDate);
  } catch (error) {
    next(error);
  }
});

router.post('/',
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('content').trim().notEmpty().withMessage('Content is required'),
    body('category').isIn(['meeting', 'action', 'note', 'decision', 'follow-up']).withMessage('Invalid category'),
    body('date').isISO8601().withMessage('Valid date is required')
  ],
  (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, content, category, date } = req.body;

      const result = db.prepare(`
        INSERT INTO diary_entries (title, content, category, date, user_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(title, content, category, date, req.user.id);

      const entry = db.prepare('SELECT * FROM diary_entries WHERE id = ?').get(result.lastInsertRowid);
      res.status(201).json(entry);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:id', (req, res, next) => {
  try {
    const entry = db.prepare(`
      SELECT * FROM diary_entries 
      WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.user.id);

    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    res.json(entry);
  } catch (error) {
    next(error);
  }
});

router.put('/:id',
  [
    body('title').optional().trim().notEmpty(),
    body('content').optional().trim().notEmpty(),
    body('category').optional().isIn(['meeting', 'action', 'note', 'decision', 'follow-up']),
    body('date').optional().isISO8601()
  ],
  (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const entry = db.prepare(`
        SELECT * FROM diary_entries 
        WHERE id = ? AND user_id = ?
      `).get(req.params.id, req.user.id);

      if (!entry) {
        return res.status(404).json({ error: 'Entry not found' });
      }

      const updates = [];
      const values = [];

      Object.keys(req.body).forEach(key => {
        if (req.body[key] !== undefined && ['title', 'content', 'category', 'date'].includes(key)) {
          updates.push(`${key} = ?`);
          values.push(req.body[key]);
        }
      });

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No valid updates provided' });
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(req.params.id, req.user.id);

      db.prepare(`
        UPDATE diary_entries 
        SET ${updates.join(', ')} 
        WHERE id = ? AND user_id = ?
      `).run(...values);

      const updatedEntry = db.prepare(`
        SELECT * FROM diary_entries 
        WHERE id = ? AND user_id = ?
      `).get(req.params.id, req.user.id);

      res.json(updatedEntry);
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/:id', (req, res, next) => {
  try {
    const entry = db.prepare(`
      SELECT * FROM diary_entries 
      WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.user.id);

    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    db.prepare('DELETE FROM diary_entries WHERE id = ? AND user_id = ?')
      .run(req.params.id, req.user.id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;