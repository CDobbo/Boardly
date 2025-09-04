import express from 'express';
import { body, validationResult } from 'express-validator';
import { db } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

const checkProjectAccess = async (req, res, next) => {
  const projectId = req.params.projectId || req.body.projectId;
  
  const hasAccess = await db.prepare(`
    SELECT 1 FROM project_members 
    WHERE project_id = ? AND user_id = ?
  `).get(projectId, req.user.id);

  if (!hasAccess) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  next();
};

router.get('/project/:projectId', checkProjectAccess, async (req, res, next) => {
  try {
    const boards = await db.prepare(`
      SELECT b.*, 
        (SELECT COUNT(*) FROM columns c 
         JOIN tasks t ON c.id = t.column_id 
         WHERE c.board_id = b.id) as task_count
      FROM boards b
      WHERE b.project_id = ?
      ORDER BY b.position, b.created_at
    `).all(req.params.projectId);

    const boardsWithColumnsAndTasks = [];
    for (const board of boards) {
      const columns = await db.prepare(`
        SELECT c.*,
          (SELECT COUNT(*) FROM tasks WHERE column_id = c.id) as task_count
        FROM columns c
        WHERE c.board_id = ?
        ORDER BY c.position
      `).all(board.id);

      // Get all tasks for this board and nest them within their columns
      const allTasks = await db.prepare(`
        SELECT t.*, t.column_id as columnId, u.name as assignee_name, u.email as assignee_email,
          de.title as diary_entry_title, de.date as diary_entry_date
        FROM tasks t
        LEFT JOIN users u ON t.assignee_id = u.id
        LEFT JOIN diary_entries de ON t.diary_entry_id = de.id
        JOIN columns c ON t.column_id = c.id
        WHERE c.board_id = ?
        ORDER BY t.position
      `).all(board.id);

      // Nest tasks within their respective columns
      const columnsWithTasks = columns.map(column => ({
        ...column,
        tasks: allTasks.filter(task => task.column_id === column.id)
      }));

      const result = { ...board, columns: columnsWithTasks };
      boardsWithColumnsAndTasks.push(result);
    }

    // Return the first board if exists (since frontend expects single board)
    const response = boardsWithColumnsAndTasks.length > 0 ? boardsWithColumnsAndTasks[0] : null;
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const board = await db.prepare(`
      SELECT b.*, p.name as project_name 
      FROM boards b
      JOIN projects p ON b.project_id = p.id
      WHERE b.id = ?
    `).get(req.params.id);

    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const hasAccess = await db.prepare(`
      SELECT 1 FROM project_members 
      WHERE project_id = ? AND user_id = ?
    `).get(board.project_id, req.user.id);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const columns = await db.prepare(`
      SELECT * FROM columns 
      WHERE board_id = ? 
      ORDER BY position
    `).all(req.params.id);

    const columnsWithTasks = [];
    for (const column of columns) {
      const tasks = await db.prepare(`
        SELECT t.*, u.name as assignee_name, u.email as assignee_email
        FROM tasks t
        LEFT JOIN users u ON t.assignee_id = u.id
        WHERE t.column_id = ?
        ORDER BY t.position
      `).all(column.id);

      columnsWithTasks.push({ ...column, tasks });
    }

    res.json({ ...board, columns: columnsWithTasks });
  } catch (error) {
    next(error);
  }
});

router.post('/',
  [
    body('name').trim().notEmpty(),
    body('projectId').isInt()
  ],
  checkProjectAccess, async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, projectId } = req.body;

      const maxPosition = await db.prepare(
        'SELECT MAX(position) as max FROM boards WHERE project_id = ?'
      ).get(projectId);

      const position = (maxPosition.max || 0) + 1;

      const result = await db.prepare(
        'INSERT INTO boards (name, project_id, position) VALUES (?, ?, ?)'
      ).run(name, projectId, position);

      const board = await db.prepare('SELECT * FROM boards WHERE id = ?').get(result.lastInsertRowid);
      res.status(201).json(board);
    } catch (error) {
      next(error);
    }
  }
);

router.post('/:boardId/columns',
  [body('name').trim().notEmpty()], async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const board = await db.prepare('SELECT project_id FROM boards WHERE id = ?')
        .get(req.params.boardId);

      if (!board) {
        return res.status(404).json({ error: 'Board not found' });
      }

      const hasAccess = db.prepare(`
        SELECT 1 FROM project_members 
        WHERE project_id = ? AND user_id = ?
      `).get(board.project_id, req.user.id);

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const maxPosition = await db.prepare(
        'SELECT MAX(position) as max FROM columns WHERE board_id = ?'
      ).get(req.params.boardId);

      const position = (maxPosition.max || 0) + 1;

      const result = await db.prepare(
        'INSERT INTO columns (name, board_id, position) VALUES (?, ?, ?)'
      ).run(req.body.name, req.params.boardId, position);

      const column = await db.prepare('SELECT * FROM columns WHERE id = ?')
        .get(result.lastInsertRowid);

      res.status(201).json(column);
    } catch (error) {
      next(error);
    }
  }
);

router.put('/columns/:columnId',
  [body('name').optional().trim().notEmpty()], async (req, res, next) => {
    try {
      const column = db.prepare(`
        SELECT c.*, b.project_id 
        FROM columns c
        JOIN boards b ON c.board_id = b.id
        WHERE c.id = ?
      `).get(req.params.columnId);

      if (!column) {
        return res.status(404).json({ error: 'Column not found' });
      }

      const hasAccess = await db.prepare(`
        SELECT role FROM project_members 
        WHERE project_id = ? AND user_id = ?
      `).get(column.project_id, req.user.id);

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (req.body.name) {
        await db.prepare('UPDATE columns SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(req.body.name, req.params.columnId);
      }

      const updatedColumn = db.prepare('SELECT * FROM columns WHERE id = ?')
        .get(req.params.columnId);

      res.json(updatedColumn);
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/columns/:columnId', async (req, res, next) => {
  try {
    const column = db.prepare(`
      SELECT c.*, b.project_id 
      FROM columns c
      JOIN boards b ON c.board_id = b.id
      WHERE c.id = ?
    `).get(req.params.columnId);

    if (!column) {
      return res.status(404).json({ error: 'Column not found' });
    }

    const hasAccess = await db.prepare(`
      SELECT role FROM project_members 
      WHERE project_id = ? AND user_id = ? AND role IN ('owner', 'admin')
    `).get(column.project_id, req.user.id);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await db.prepare('DELETE FROM columns WHERE id = ?').run(req.params.columnId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;