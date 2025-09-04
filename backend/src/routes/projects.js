import express from 'express';
import { body, validationResult } from 'express-validator';
import { db } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req, res, next) => {
  try {
    const projects = await db.prepare(`
      SELECT p.*, pm.role, owner.name as owner_name, owner.email as owner_email
      FROM projects p
      JOIN project_members pm ON p.id = pm.project_id
      JOIN users owner ON p.owner_id = owner.id
      WHERE pm.user_id = ?
      ORDER BY p.created_at DESC
    `).all(req.user.id);

    res.json(projects);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const project = await db.prepare(`
      SELECT p.*, pm.role 
      FROM projects p
      JOIN project_members pm ON p.id = pm.project_id
      WHERE p.id = ? AND pm.user_id = ?
    `).get(req.params.id, req.user.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const members = await db.prepare(`
      SELECT u.id, u.email, u.name, pm.role, pm.joined_at
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = ?
    `).all(req.params.id);

    res.json({ ...project, members });
  } catch (error) {
    next(error);
  }
});

router.post('/',
  [
    body('name').trim().notEmpty(),
    body('description').optional().trim()
    // body('due_date').optional().isISO8601() // Removed due_date as it's not in database schema
  ], async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, description } = req.body;

      await db.exec('BEGIN TRANSACTION');
      
      try {
        const result = await db.prepare(
          'INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)'
        ).run(name, description || null, req.user.id);

        const projectId = result.lastInsertRowid;

        await db.prepare(
          'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)'
        ).run(projectId, req.user.id, 'owner');

        const defaultColumns = ['To Do', 'In Progress', 'Review', 'Done'];
        const boardResult = await db.prepare(
          'INSERT INTO boards (name, project_id, position) VALUES (?, ?, ?)'
        ).run('Main Board', projectId, 0);

        const boardId = boardResult.lastInsertRowid;

        for (let index = 0; index < defaultColumns.length; index++) {
          await db.prepare(
            'INSERT INTO columns (name, board_id, position) VALUES (?, ?, ?)'
          ).run(defaultColumns[index], boardId, index);
        }

        await db.exec('COMMIT');

        const project = await db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
        res.status(201).json(project);
      } catch (error) {
        await db.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }
);

router.put('/:id',
  [
    body('name').optional().trim().notEmpty(),
    body('description').optional().trim()
    // body('due_date').optional().isISO8601() // Removed due_date as it's not in database schema
  ], async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const isOwner = await db.prepare(`
        SELECT role FROM project_members 
        WHERE project_id = ? AND user_id = ? AND role IN ('owner', 'admin')
      `).get(req.params.id, req.user.id);

      if (!isOwner) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const updates = [];
      const values = [];

      if (req.body.name !== undefined) {
        updates.push('name = ?');
        values.push(req.body.name);
      }

      if (req.body.description !== undefined) {
        updates.push('description = ?');
        values.push(req.body.description);
      }

      // Removed due_date handling as it's not in database schema
      // if (req.body.due_date !== undefined) {
      //   updates.push('due_date = ?');
      //   values.push(req.body.due_date);
      // }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No valid updates provided' });
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(req.params.id);

      await db.prepare(
        `UPDATE projects SET ${updates.join(', ')} WHERE id = ?`
      ).run(...values);

      const project = await db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
      res.json(project);
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/:id', async (req, res, next) => {
  try {
    const isOwner = await db.prepare(`
      SELECT role FROM project_members 
      WHERE project_id = ? AND user_id = ? AND role = 'owner'
    `).get(req.params.id, req.user.id);

    if (!isOwner) {
      return res.status(403).json({ error: 'Only project owner can delete project' });
    }

    await db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get('/:id/members', async (req, res, next) => {
  try {
    const hasAccess = await db.prepare(`
      SELECT 1 FROM project_members 
      WHERE project_id = ? AND user_id = ?
    `).get(req.params.id, req.user.id);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const members = await db.prepare(`
      SELECT u.id, u.email, u.name, pm.role, pm.joined_at
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = ?
      ORDER BY pm.role DESC, u.name ASC
    `).all(req.params.id);

    res.json(members);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/members',
  [body('email').isEmail().normalizeEmail()], async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const isAdmin = await db.prepare(`
        SELECT role FROM project_members 
        WHERE project_id = ? AND user_id = ? AND role IN ('owner', 'admin')
      `).get(req.params.id, req.user.id);

      if (!isAdmin) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const user = await db.prepare('SELECT id FROM users WHERE email = ?').get(req.body.email);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const existingMember = await db.prepare(
        'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?'
      ).get(req.params.id, user.id);

      if (existingMember) {
        return res.status(409).json({ error: 'User already a member' });
      }

      await db.prepare(
        'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)'
      ).run(req.params.id, user.id, 'member');

      res.status(201).json({ message: 'Member added successfully' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;