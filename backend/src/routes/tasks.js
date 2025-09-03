import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { db } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

const checkTaskAccess = (req, res, next) => {
  const taskId = req.params.id;
  
  const task = db.prepare(`
    SELECT t.*, c.board_id, b.project_id
    FROM tasks t
    JOIN columns c ON t.column_id = c.id
    JOIN boards b ON c.board_id = b.id
    WHERE t.id = ?
  `).get(taskId);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const hasAccess = db.prepare(`
    SELECT 1 FROM project_members 
    WHERE project_id = ? AND user_id = ?
  `).get(task.project_id, req.user.id);

  if (!hasAccess) {
    return res.status(403).json({ error: 'Access denied' });
  }

  req.task = task;
  next();
};

async router.get('/search/global', (req, res, next) => {
  try {
    const { q, status, priority, assigneeId } = req.query;

    let query = `
      SELECT t.*, u.name as assignee_name, u.email as assignee_email,
        c.name as column_name, b.name as board_name, p.name as project_name,
        p.id as project_id
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      JOIN columns c ON t.column_id = c.id
      JOIN boards b ON c.board_id = b.id
      JOIN projects p ON b.project_id = p.id
      JOIN project_members pm ON p.id = pm.project_id
      WHERE pm.user_id = ?
    `;

    const params = [req.user.id];

    if (q && q.trim()) {
      query += ` AND (t.title LIKE ? OR t.description LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`);
    }

    if (status) {
      query += ` AND c.name = ?`;
      params.push(status);
    }

    if (priority) {
      query += ` AND t.priority = ?`;
      params.push(priority);
    }

    if (assigneeId) {
      query += ` AND t.assignee_id = ?`;
      params.push(assigneeId);
    }

    query += ` ORDER BY t.updated_at DESC LIMIT 100`;

    const tasks = db.prepare(query).all(...params);
    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

async router.get('/search', (req, res, next) => {
  try {
    const { q, projectId, status, priority, assigneeId } = req.query;

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID required' });
    }

    const hasAccess = db.prepare(`
      SELECT 1 FROM project_members 
      WHERE project_id = ? AND user_id = ?
    `).get(projectId, req.user.id);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let query = `
      SELECT t.*, u.name as assignee_name, u.email as assignee_email,
        c.name as column_name, b.name as board_name
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      JOIN columns c ON t.column_id = c.id
      JOIN boards b ON c.board_id = b.id
      WHERE b.project_id = ?
    `;

    const params = [projectId];

    if (q) {
      query += ` AND (t.title LIKE ? OR t.description LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`);
    }

    if (status) {
      query += ` AND t.status = ?`;
      params.push(status);
    }

    if (priority) {
      query += ` AND t.priority = ?`;
      params.push(priority);
    }

    if (assigneeId) {
      query += ` AND t.assignee_id = ?`;
      params.push(assigneeId);
    }

    query += ` ORDER BY t.created_at DESC`;

    const tasks = db.prepare(query).all(...params);
    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

async router.get('/my-tasks', (req, res, next) => {
  try {
    const tasks = db.prepare(`
      SELECT t.*, p.name as project_name, c.name as column_name, b.name as board_name
      FROM tasks t
      JOIN columns c ON t.column_id = c.id
      JOIN boards b ON c.board_id = b.id
      JOIN projects p ON b.project_id = p.id
      JOIN project_members pm ON p.id = pm.project_id
      WHERE t.assignee_id = ? AND pm.user_id = ?
      ORDER BY 
        CASE 
          WHEN t.due_date < datetime('now') AND c.name != 'Done' THEN 1
          WHEN t.due_date < datetime('now', '+1 day') AND c.name != 'Done' THEN 2
          ELSE 3
        END,
        t.due_date ASC,
        t.priority DESC,
        t.updated_at DESC
    `).all(req.user.id, req.user.id);

    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

async router.get('/my-stats', (req, res, next) => {
  try {
    const totalTasks = db.prepare(`
      SELECT COUNT(*) as count
      FROM tasks t
      JOIN columns c ON t.column_id = c.id
      JOIN boards b ON c.board_id = b.id
      JOIN project_members pm ON b.project_id = pm.project_id
      WHERE t.assignee_id = ? AND pm.user_id = ?
    `).get(req.user.id, req.user.id);

    const tasksByStatus = db.prepare(`
      SELECT c.name as status, COUNT(t.id) as count
      FROM tasks t
      JOIN columns c ON t.column_id = c.id
      JOIN boards b ON c.board_id = b.id
      JOIN project_members pm ON b.project_id = pm.project_id
      WHERE t.assignee_id = ? AND pm.user_id = ?
      GROUP BY c.name
      ORDER BY 
        CASE c.name
          WHEN 'To Do' THEN 1
          WHEN 'In Progress' THEN 2
          WHEN 'Done' THEN 3
          ELSE 4
        END
    `).all(req.user.id, req.user.id);

    const tasksByPriority = db.prepare(`
      SELECT t.priority, COUNT(*) as count
      FROM tasks t
      JOIN columns c ON t.column_id = c.id
      JOIN boards b ON c.board_id = b.id
      JOIN project_members pm ON b.project_id = pm.project_id
      WHERE t.assignee_id = ? AND pm.user_id = ?
      GROUP BY t.priority
    `).all(req.user.id, req.user.id);

    const overdueTasks = db.prepare(`
      SELECT COUNT(*) as count
      FROM tasks t
      JOIN columns c ON t.column_id = c.id
      JOIN boards b ON c.board_id = b.id
      JOIN project_members pm ON b.project_id = pm.project_id
      WHERE t.assignee_id = ? AND pm.user_id = ?
        AND t.due_date < datetime('now')
        AND c.name != 'Done'
    `).get(req.user.id, req.user.id);

    const upcomingTasks = db.prepare(`
      SELECT COUNT(*) as count
      FROM tasks t
      JOIN columns c ON t.column_id = c.id
      JOIN boards b ON c.board_id = b.id
      JOIN project_members pm ON b.project_id = pm.project_id
      WHERE t.assignee_id = ? AND pm.user_id = ?
        AND t.due_date BETWEEN datetime('now') AND datetime('now', '+7 days')
        AND c.name != 'Done'
    `).get(req.user.id, req.user.id);

    const completedThisWeek = db.prepare(`
      SELECT COUNT(*) as count
      FROM tasks t
      JOIN columns c ON t.column_id = c.id
      JOIN boards b ON c.board_id = b.id
      JOIN project_members pm ON b.project_id = pm.project_id
      WHERE t.assignee_id = ? AND pm.user_id = ?
        AND c.name = 'Done'
        AND t.updated_at >= datetime('now', '-7 days')
    `).get(req.user.id, req.user.id);

    res.json({
      total: totalTasks.count,
      byStatus: tasksByStatus,
      byPriority: tasksByPriority,
      overdue: overdueTasks.count,
      upcoming: upcomingTasks.count,
      completedThisWeek: completedThisWeek.count
    });
  } catch (error) {
    next(error);
  }
});

async router.get('/stats/:projectId', (req, res, next) => {
  try {
    const hasAccess = db.prepare(`
      SELECT 1 FROM project_members 
      WHERE project_id = ? AND user_id = ?
    `).get(req.params.projectId, req.user.id);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const totalTasks = db.prepare(`
      SELECT COUNT(*) as count
      FROM tasks t
      JOIN columns c ON t.column_id = c.id
      JOIN boards b ON c.board_id = b.id
      WHERE b.project_id = ?
    `).get(req.params.projectId);

    const tasksByStatus = db.prepare(`
      SELECT c.name as status, COUNT(t.id) as count
      FROM columns c
      JOIN boards b ON c.board_id = b.id
      LEFT JOIN tasks t ON c.id = t.column_id
      WHERE b.project_id = ?
      GROUP BY c.id, c.name
      ORDER BY c.position
    `).all(req.params.projectId);

    const tasksByPriority = db.prepare(`
      SELECT t.priority, COUNT(*) as count
      FROM tasks t
      JOIN columns c ON t.column_id = c.id
      JOIN boards b ON c.board_id = b.id
      WHERE b.project_id = ?
      GROUP BY t.priority
    `).all(req.params.projectId);

    const tasksByAssignee = db.prepare(`
      SELECT u.name as assignee, COUNT(t.id) as count
      FROM tasks t
      JOIN columns c ON t.column_id = c.id
      JOIN boards b ON c.board_id = b.id
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE b.project_id = ?
      GROUP BY t.assignee_id, u.name
    `).all(req.params.projectId);

    const overdueTasks = db.prepare(`
      SELECT COUNT(*) as count
      FROM tasks t
      JOIN columns c ON t.column_id = c.id
      JOIN boards b ON c.board_id = b.id
      WHERE b.project_id = ? 
        AND t.due_date < datetime('now')
        AND c.name != 'Done'
    `).get(req.params.projectId);

    res.json({
      total: totalTasks.count,
      byStatus: tasksByStatus,
      byPriority: tasksByPriority,
      byAssignee: tasksByAssignee,
      overdue: overdueTasks.count
    });
  } catch (error) {
    next(error);
  }
});

async router.post('/',
  [
    body('title').trim().notEmpty(),
    body('description').optional().trim(),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    body('columnId').isInt(),
    body('assigneeId').optional().isInt(),
    body('dueDate').optional().isISO8601(),
    body('diaryEntryId').optional().isInt()
  ],
  (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const column = db.prepare(`
        SELECT c.*, b.project_id 
        FROM columns c
        JOIN boards b ON c.board_id = b.id
        WHERE c.id = ?
      `).get(req.body.columnId);

      if (!column) {
        return res.status(404).json({ error: 'Column not found' });
      }

      const hasAccess = db.prepare(`
        SELECT 1 FROM project_members 
        WHERE project_id = ? AND user_id = ?
      `).get(column.project_id, req.user.id);

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const maxPosition = db.prepare(
        'SELECT MAX(position) as max FROM tasks WHERE column_id = ?'
      ).get(req.body.columnId);

      const position = (maxPosition.max || 0) + 1;

      // Creating task

      const result = db.prepare(`
        INSERT INTO tasks (title, description, priority, column_id, assignee_id, due_date, position, diary_entry_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.body.title,
        req.body.description || null,
        req.body.priority || 'medium',
        req.body.columnId,
        req.body.assigneeId || req.user.id,
        req.body.dueDate || null,
        position,
        req.body.diaryEntryId || null
      );
      
      // Task created successfully

      const task = db.prepare(`
        SELECT t.*, u.name as assignee_name, u.email as assignee_email,
          de.title as diary_entry_title, de.date as diary_entry_date
        FROM tasks t
        LEFT JOIN users u ON t.assignee_id = u.id
        LEFT JOIN diary_entries de ON t.diary_entry_id = de.id
        WHERE t.id = ?
      `).get(result.lastInsertRowid);

      res.status(201).json(task);
    } catch (error) {
      next(error);
    }
  }
);

async router.put('/:id',
  [
    body('title').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    body('assigneeId').optional().isInt().toInt(),
    body('dueDate').optional().isISO8601(),
    body('projectId').optional().isInt().toInt()
  ],
  checkTaskAccess,
  (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Handle project change if requested
      if (req.body.projectId !== undefined) {
        // Check if user has access to the new project
        const newProjectAccess = db.prepare(`
          SELECT 1 FROM project_members 
          WHERE project_id = ? AND user_id = ?
        `).get(req.body.projectId, req.user.id);

        if (!newProjectAccess) {
          return res.status(403).json({ error: 'Access denied to target project' });
        }

        // Find the default board and first column in the new project
        const newProjectBoard = db.prepare(`
          SELECT b.id as board_id, c.id as column_id
          FROM boards b
          JOIN columns c ON c.board_id = b.id
          WHERE b.project_id = ?
          ORDER BY b.position ASC, c.position ASC
          LIMIT 1
        `).get(req.body.projectId);

        if (!newProjectBoard) {
          return res.status(400).json({ error: 'No columns found in target project' });
        }

        // Move task to the first column of the new project
        const maxPosition = db.prepare(
          'SELECT MAX(position) as max FROM tasks WHERE column_id = ?'
        ).get(newProjectBoard.column_id);

        const newPosition = (maxPosition.max || 0) + 1;

        db.prepare(`
          UPDATE tasks 
          SET column_id = ?, position = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(newProjectBoard.column_id, newPosition, req.params.id);
      }

      const updates = [];
      const values = [];

      const allowedFields = ['title', 'description', 'priority', 'assigneeId', 'dueDate'];
      
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates.push(`${field === 'assigneeId' ? 'assignee_id' : field === 'dueDate' ? 'due_date' : field} = ?`);
          values.push(req.body[field]);
        }
      }

      if (updates.length > 0) {
        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(req.params.id);

        db.prepare(
          `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`
        ).run(...values);
      } else if (req.body.projectId === undefined) {
        return res.status(400).json({ error: 'No valid updates provided' });
      }

      const task = db.prepare(`
        SELECT t.*, u.name as assignee_name, u.email as assignee_email
        FROM tasks t
        LEFT JOIN users u ON t.assignee_id = u.id
        WHERE t.id = ?
      `).get(req.params.id);

      res.json(task);
    } catch (error) {
      next(error);
    }
  }
);

async router.put('/:id/move',
  [
    body('columnId').isInt(),
    body('position').optional().isInt()
  ],
  checkTaskAccess,
  (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const newColumn = db.prepare(`
        SELECT c.*, b.project_id 
        FROM columns c
        JOIN boards b ON c.board_id = b.id
        WHERE c.id = ?
      `).get(req.body.columnId);

      if (!newColumn) {
        return res.status(404).json({ error: 'Column not found' });
      }

      if (newColumn.project_id !== req.task.project_id) {
        return res.status(400).json({ error: 'Cannot move task to different project' });
      }

      db.exec('BEGIN TRANSACTION');

      try {
        const oldColumnId = req.task.column_id;
        const oldPosition = req.task.position;

        if (oldColumnId === req.body.columnId) {
          const newPosition = req.body.position ?? 0;
          
          if (newPosition > oldPosition) {
            db.prepare(`
              UPDATE tasks 
              SET position = position - 1 
              WHERE column_id = ? AND position > ? AND position <= ?
            `).run(oldColumnId, oldPosition, newPosition);
          } else if (newPosition < oldPosition) {
            db.prepare(`
              UPDATE tasks 
              SET position = position + 1 
              WHERE column_id = ? AND position >= ? AND position < ?
            `).run(oldColumnId, newPosition, oldPosition);
          }

          db.prepare('UPDATE tasks SET position = ? WHERE id = ?')
            .run(newPosition, req.params.id);
        } else {
          db.prepare(`
            UPDATE tasks 
            SET position = position - 1 
            WHERE column_id = ? AND position > ?
          `).run(oldColumnId, oldPosition);

          const newPosition = req.body.position ?? 0;
          
          db.prepare(`
            UPDATE tasks 
            SET position = position + 1 
            WHERE column_id = ? AND position >= ?
          `).run(req.body.columnId, newPosition);

          db.prepare('UPDATE tasks SET column_id = ?, position = ? WHERE id = ?')
            .run(req.body.columnId, newPosition, req.params.id);
        }

        db.exec('COMMIT');

        const task = db.prepare(`
          SELECT t.*, u.name as assignee_name, u.email as assignee_email
          FROM tasks t
          LEFT JOIN users u ON t.assignee_id = u.id
          WHERE t.id = ?
        `).get(req.params.id);

        res.json(task);
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }
);

async router.delete('/:id', checkTaskAccess, (req, res, next) => {
  try {
    db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Task relationships endpoints
async router.get('/:id/dependencies', checkTaskAccess, (req, res, next) => {
  try {
    // Get tasks that this task depends on (blockers)
    const blockedBy = db.prepare(`
      SELECT t.id, t.title, t.status, c.name as column_name, u.name as assignee_name
      FROM task_dependencies td
      JOIN tasks t ON td.depends_on_task_id = t.id
      LEFT JOIN columns c ON t.column_id = c.id
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE td.task_id = ?
    `).all(req.params.id);

    // Get tasks that depend on this task (blocking)
    const blocking = db.prepare(`
      SELECT t.id, t.title, t.status, c.name as column_name, u.name as assignee_name
      FROM task_dependencies td
      JOIN tasks t ON td.task_id = t.id
      LEFT JOIN columns c ON t.column_id = c.id
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE td.depends_on_task_id = ?
    `).all(req.params.id);

    res.json({ blockedBy, blocking });
  } catch (error) {
    next(error);
  }
});

async router.post('/:id/dependencies', 
  [
    body('dependsOnTaskId').isInt().toInt()
  ],
  checkTaskAccess, 
  (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const taskId = parseInt(req.params.id);
      const dependsOnTaskId = req.body.dependsOnTaskId;

      // Prevent self-dependency
      if (taskId === dependsOnTaskId) {
        return res.status(400).json({ error: 'A task cannot depend on itself' });
      }

      // Check if the dependency target task exists and user has access
      const targetTask = db.prepare(`
        SELECT t.*, c.board_id, b.project_id
        FROM tasks t
        JOIN columns c ON t.column_id = c.id
        JOIN boards b ON c.board_id = b.id
        WHERE t.id = ?
      `).get(dependsOnTaskId);

      if (!targetTask) {
        return res.status(404).json({ error: 'Target task not found' });
      }

      const hasAccessToTarget = db.prepare(`
        SELECT 1 FROM project_members 
        WHERE project_id = ? AND user_id = ?
      `).get(targetTask.project_id, req.user.id);

      if (!hasAccessToTarget) {
        return res.status(403).json({ error: 'Access denied to target task' });
      }

      // Check for circular dependencies
      const wouldCreateCycle = checkForCircularDependency(dependsOnTaskId, taskId);
      if (wouldCreateCycle) {
        return res.status(400).json({ error: 'This would create a circular dependency' });
      }

      // Create the dependency
      try {
        db.prepare(`
          INSERT INTO task_dependencies (task_id, depends_on_task_id)
          VALUES (?, ?)
        `).run(taskId, dependsOnTaskId);

        res.status(201).json({ message: 'Dependency created successfully' });
      } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          return res.status(409).json({ error: 'Dependency already exists' });
        }
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }
);

async router.delete('/:id/dependencies/:dependencyId', checkTaskAccess, (req, res, next) => {
  try {
    const result = db.prepare(`
      DELETE FROM task_dependencies 
      WHERE task_id = ? AND depends_on_task_id = ?
    `).run(req.params.id, req.params.dependencyId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Dependency not found' });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Helper function to check for circular dependencies
function checkForCircularDependency(startTaskId, targetTaskId, visited = new Set()) {
  if (startTaskId === targetTaskId) {
    return true;
  }
  
  if (visited.has(startTaskId)) {
    return false;
  }
  
  visited.add(startTaskId);
  
  const dependencies = db.prepare(`
    SELECT depends_on_task_id FROM task_dependencies WHERE task_id = ?
  `).all(startTaskId);
  
  for (const dep of dependencies) {
    if (checkForCircularDependency(dep.depends_on_task_id, targetTaskId, visited)) {
      return true;
    }
  }
  
  return false;
}

export default router;