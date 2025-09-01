import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { db } from '../db/init.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// Get all events for the authenticated user
router.get('/', [
  query('start').optional().isISO8601(),
  query('end').optional().isISO8601(),
  query('project_id').optional().isInt()
], (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let query = `
      SELECT e.*, p.name as project_name 
      FROM events e
      LEFT JOIN projects p ON e.project_id = p.id
      WHERE e.user_id = ?
    `;
    const params = [req.user.id];

    // Filter by date range if provided
    if (req.query.start) {
      query += ' AND e.start_date >= ?';
      params.push(req.query.start);
    }
    
    if (req.query.end) {
      query += ' AND e.start_date <= ?';
      params.push(req.query.end);
    }

    // Filter by project if provided
    if (req.query.project_id) {
      query += ' AND e.project_id = ?';
      params.push(req.query.project_id);
    }

    query += ' ORDER BY e.start_date ASC';

    const events = db.prepare(query).all(...params);
    // Convert all_day from integer to boolean
    const eventsWithBoolean = events.map(event => ({
      ...event,
      all_day: event.all_day === 1
    }));
    res.json(eventsWithBoolean);
  } catch (error) {
    next(error);
  }
});

// Get a specific event
router.get('/:id', [
  param('id').isInt()
], (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const event = db.prepare(`
      SELECT e.*, p.name as project_name 
      FROM events e
      LEFT JOIN projects p ON e.project_id = p.id
      WHERE e.id = ? AND e.user_id = ?
    `).get(req.params.id, req.user.id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Convert all_day from integer to boolean
    event.all_day = event.all_day === 1;
    res.json(event);
  } catch (error) {
    next(error);
  }
});

// Create a new event
router.post('/', (req, res, next) => {
  console.log('POST /api/events hit with body:', req.body);
  try {
    // Validation temporarily removed

    // Validate project access if project_id is provided
    if (req.body.project_id) {
      const hasAccess = db.prepare(`
        SELECT 1 FROM project_members 
        WHERE project_id = ? AND user_id = ?
      `).get(req.body.project_id, req.user.id);

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this project' });
      }
    }

    console.log('Creating event with data:', JSON.stringify(req.body));

    // Validate end_date is after start_date
    if (req.body.end_date && new Date(req.body.end_date) <= new Date(req.body.start_date)) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    const insertValues = [
      req.body.title,
      req.body.description || null,
      req.body.start_date,
      req.body.end_date || null,
      req.body.all_day ? 1 : 0,  // Convert boolean to integer for SQLite
      req.body.event_type || 'event',
      req.body.priority || 'medium',
      req.body.project_id || null,
      req.user.id
    ];
    
    console.log('Insert values:', insertValues);
    console.log('Insert value types:', insertValues.map(v => typeof v));

    const result = db.prepare(`
      INSERT INTO events (title, description, start_date, end_date, all_day, event_type, priority, project_id, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(...insertValues);

    const event = db.prepare(`
      SELECT e.*, p.name as project_name 
      FROM events e
      LEFT JOIN projects p ON e.project_id = p.id
      WHERE e.id = ?
    `).get(result.lastInsertRowid);

    // Convert all_day from integer to boolean
    event.all_day = event.all_day === 1;
    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
});

// Update an event
router.put('/:id', [
  param('id').isInt(),
  body('title').optional().trim().notEmpty(),
  body('description').optional().trim(),
  body('start_date').optional().isISO8601(),
  body('end_date').optional().isISO8601(),
  body('all_day').optional().isBoolean(),
  body('event_type').optional().isIn(['event', 'deadline', 'meeting', 'reminder']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('project_id').optional().isInt()
], (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if event exists and user owns it
    const existingEvent = db.prepare('SELECT * FROM events WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!existingEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Validate project access if project_id is being changed
    if (req.body.project_id !== undefined && req.body.project_id !== null) {
      const hasAccess = db.prepare(`
        SELECT 1 FROM project_members 
        WHERE project_id = ? AND user_id = ?
      `).get(req.body.project_id, req.user.id);

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this project' });
      }
    }

    const updates = [];
    const values = [];

    const allowedFields = ['title', 'description', 'start_date', 'end_date', 'all_day', 'event_type', 'priority', 'project_id'];
    
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        // Convert boolean to integer for SQLite
        if (field === 'all_day') {
          values.push(req.body[field] ? 1 : 0);
        } else {
          values.push(req.body[field]);
        }
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.params.id);

    db.prepare(`UPDATE events SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const event = db.prepare(`
      SELECT e.*, p.name as project_name 
      FROM events e
      LEFT JOIN projects p ON e.project_id = p.id
      WHERE e.id = ?
    `).get(req.params.id);

    // Convert all_day from integer to boolean
    event.all_day = event.all_day === 1;
    res.json(event);
  } catch (error) {
    next(error);
  }
});

// Delete an event
router.delete('/:id', [
  param('id').isInt()
], (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const result = db.prepare('DELETE FROM events WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;