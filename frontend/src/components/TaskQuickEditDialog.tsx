import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CheckCircle2, Calendar, AlertCircle, Clock, User, Flag } from 'lucide-react';
import { tasksAPI, authAPI } from '../lib/api';
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
import { Badge } from './ui/badge';

interface Task {
  id: number;
  title: string;
  description?: string;
  priority: string;
  assignee_name?: string;
  assignee_id?: number;
  due_date?: string;
  column_name?: string;
  project_name?: string;
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface TaskQuickEditDialogProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const priorityColors = {
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
};

const statusColors = {
  'To Do': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  'In Progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  'Done': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
};

export const TaskQuickEditDialog: React.FC<TaskQuickEditDialogProps> = ({
  task,
  open,
  onOpenChange,
  onUpdate,
}) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState(task.priority);
  const [assigneeId, setAssigneeId] = useState<string>(task.assignee_id ? String(task.assignee_id) : 'unassigned');
  const [dueDate, setDueDate] = useState(
    task.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : ''
  );
  const [status, setStatus] = useState(task.column_name || 'To Do');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    setPriority(task.priority);
    setAssigneeId(task.assignee_id ? String(task.assignee_id) : 'unassigned');
    setDueDate(task.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : '');
    setStatus(task.column_name || 'To Do');
    setEditMode(false);
  }, [task]);

  useEffect(() => {
    if (open) {
      loadUsers();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update task details
      await tasksAPI.update(String(task.id), {
        title,
        description,
        priority,
        assigneeId: assigneeId && assigneeId !== 'unassigned' ? assigneeId : undefined,
        dueDate: dueDate || undefined,
      });
      
      // Note: Status changes would require moving to a different column
      // which needs column IDs. For now, we'll just update the other fields
      // and let the parent component handle status changes if needed
      
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickComplete = async () => {
    setLoading(true);
    try {
      // For marking as complete, we'll use a workaround
      // by updating the task with a special marker that the backend can recognize
      // Or we can just close the dialog and let the parent handle it
      
      // For now, we'll just update other fields and close
      // In a real implementation, you'd need to get the "Done" column ID
      // and use tasksAPI.move(taskId, doneColumnId)
      
      onUpdate();
      onOpenChange(false);
      
      // Show a message that the feature needs proper column mapping
      console.log('Note: Quick complete requires proper column ID mapping');
    } catch (error) {
      console.error('Failed to mark task as complete:', error);
    } finally {
      setLoading(false);
    }
  };

  const isOverdue = task.due_date && 
    new Date(task.due_date) < new Date() && 
    status !== 'Done' && 
    status !== 'Completed' && 
    status !== 'Finished';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {editMode ? 'Edit Task' : task.title}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Badge className={statusColors[status as keyof typeof statusColors]}>
                {status}
              </Badge>
              <Badge className={priorityColors[task.priority as keyof typeof priorityColors]}>
                {task.priority}
              </Badge>
            </div>
          </div>
          {!editMode && (
            <DialogDescription className="flex items-center gap-4 mt-2 text-sm">
              {task.project_name && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {task.project_name}
                </span>
              )}
              {task.due_date && (
                <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : ''}`}>
                  {isOverdue ? <AlertCircle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                  {format(new Date(task.due_date), 'MMM dd, yyyy')}
                </span>
              )}
            </DialogDescription>
          )}
        </DialogHeader>

        {editMode ? (
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
            <DialogFooter className="flex justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditMode(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <>
            <div className="py-4">
              {task.description && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">{task.description}</p>
                </div>
              )}
              
              <div className="grid gap-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Priority:</span>
                  <Badge className={priorityColors[task.priority as keyof typeof priorityColors]}>
                    <Flag className="h-3 w-3 mr-1" />
                    {task.priority}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge className={statusColors[status as keyof typeof statusColors]}>
                    {status === 'In Progress' && <Clock className="h-3 w-3 mr-1" />}
                    {status === 'Done' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                    {status}
                  </Badge>
                </div>
                {task.assignee_name && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Assignee:</span>
                    <span>{task.assignee_name}</span>
                  </div>
                )}
                {task.due_date && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Due Date:</span>
                    <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                      {format(new Date(task.due_date), 'MMM dd, yyyy')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="flex justify-end gap-2">
              <Button
                onClick={() => setEditMode(true)}
                variant="default"
              >
                Edit Details
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};