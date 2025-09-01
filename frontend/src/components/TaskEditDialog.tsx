import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { tasksAPI, authAPI, projectsAPI } from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Textarea } from './ui/textarea';
import { TaskDependencies } from './TaskDependencies';
import { BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Task {
  id: number;
  title: string;
  description?: string;
  priority: string;
  assignee_name?: string;
  assignee_id?: number;
  due_date?: string;
  columnId: number; // Changed from column_id to columnId to match API
  projectId?: number;
  position: number;
  diary_entry_id?: number;
  diary_entry_title?: string;
  diary_entry_date?: string;
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface Project {
  id: number;
  name: string;
  description?: string;
}

interface TaskEditDialogProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export const TaskEditDialog: React.FC<TaskEditDialogProps> = ({
  task,
  open,
  onOpenChange,
  onUpdate,
}) => {
  const navigate = useNavigate();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState(task.priority);
  const [assigneeId, setAssigneeId] = useState<string>(task.assignee_id ? String(task.assignee_id) : 'unassigned');
  const [projectId, setProjectId] = useState<string>(task.projectId ? String(task.projectId) : 'unassigned');
  const [dueDate, setDueDate] = useState(
    task.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : ''
  );
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    setPriority(task.priority);
    setAssigneeId(task.assignee_id ? String(task.assignee_id) : 'unassigned');
    setProjectId(task.projectId ? String(task.projectId) : 'unassigned');
    setDueDate(task.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : '');
  }, [task]);

  useEffect(() => {
    if (open) {
      loadUsers();
      loadProjects();
    }
  }, [open]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await authAPI.getAllUsers();
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const response = await projectsAPI.getAll();
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);


    try {
      const updateData: any = {
        title,
        description,
        priority,
        dueDate: dueDate || undefined,
      };

      // Always include assignee in update (even if unchanged) to ensure it gets set properly
      if (assigneeId !== 'unassigned' && assigneeId !== '') {
        updateData.assigneeId = Number(assigneeId);
      } else {
        updateData.assigneeId = null;
      }

      // Always include project in update (even if unchanged) to ensure it gets set properly
      if (projectId !== 'unassigned' && projectId !== '') {
        updateData.projectId = Number(projectId);
        // When moving to a project, we need to reset the columnId so backend can assign to default column
        updateData.columnId = null;
      } else {
        // Setting to unassigned/no project
        if (task.columnId && task.columnId > 0 && task.projectId) {
          alert('Cannot remove project from tasks that are on project boards. Please move the task to a different project instead.');
          setLoading(false);
          return;
        }
        updateData.projectId = null;
        updateData.columnId = null;
      }

      await tasksAPI.update(String(task.id), updateData);
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update task:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Make changes to your task here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="priority">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="project">Project</Label>
            <Select value={projectId} onValueChange={setProjectId} disabled={loadingProjects}>
              <SelectTrigger>
                <SelectValue placeholder={loadingProjects ? "Loading projects..." : "Select project (optional)"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">No Project</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={String(project.id)}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="assignee">Assignee</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId} disabled={loadingUsers}>
              <SelectTrigger>
                <SelectValue placeholder={loadingUsers ? "Loading users..." : "Select assignee (optional)"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={String(user.id)}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          
          {/* Diary Entry Link */}
          {task.diary_entry_id && (
            <div className="mt-4 p-4 border rounded-lg bg-purple-50 dark:bg-purple-950/20">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-purple-900 dark:text-purple-100 flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Created from Diary Entry
                  </h4>
                  <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                    {task.diary_entry_title}
                    {task.diary_entry_date && (
                      <span className="text-purple-600 dark:text-purple-400 ml-2">
                        ({format(new Date(task.diary_entry_date), 'MMM d, yyyy')})
                      </span>
                    )}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigate(`/diary?highlightEntry=${task.diary_entry_id}`);
                    onOpenChange(false);
                  }}
                  className="border-purple-300 text-purple-700 hover:bg-purple-100"
                >
                  View Entry
                </Button>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
        
        {/* Dependencies Management */}
        <div className="mt-6 pt-4 border-t">
          <TaskDependencies taskId={task.id} projectId={task.projectId} onUpdate={onUpdate} />
        </div>
      </DialogContent>
    </Dialog>
  );
};