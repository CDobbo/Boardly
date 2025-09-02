import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, AlertCircle, Calendar, User, 
  AlertTriangle, TrendingUp, Target,
  EyeOff, Eye, ArrowUpDown, ChevronDown
} from 'lucide-react';
import { tasksAPI, boardsAPI, projectsAPI } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { TaskEditDialog } from '../components/TaskEditDialog';
import { TaskContextMenu } from '../components/TaskContextMenu';

interface Task {
  id: number;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  project_name: string;
  column_name: string;
  board_name: string;
  created_at: string;
  updated_at: string;
  assignee_id?: number;
  assignee_name?: string;
  columnId?: number;
  projectId?: number;
  position?: number;
}

interface MyStats {
  total: number;
  byStatus: { status: string; count: number }[];
  byPriority: { priority: string; count: number }[];
  overdue: number;
  upcoming: number;
  completedThisWeek: number;
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

export const MyTasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<MyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [hideDone, setHideDone] = useState(false);
  const [sortBy, setSortBy] = useState<'created_at' | 'priority' | 'due_date'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tasksResponse, statsResponse] = await Promise.all([
        tasksAPI.getMyTasks(),
        tasksAPI.getMyStats()
      ]);
      
      console.log('📋 My Tasks API response:', tasksResponse.data);
      console.log('📊 My Stats API response:', statsResponse.data);
      
      // Ensure we always set an array for tasks
      if (Array.isArray(tasksResponse.data)) {
        setTasks(tasksResponse.data);
      } else {
        console.warn('My Tasks API returned non-array:', tasksResponse.data);
        setTasks([]);
      }
      
      setStats(statsResponse.data);
    } catch (error) {
      console.error('Failed to load my tasks:', error);
      setTasks([]); // Ensure tasks is always an array even on error
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const isOverdue = (dueDate: string | undefined, columnName: string) => {
    if (!dueDate) return false;
    if (columnName === 'Done' || columnName === 'Completed' || columnName === 'Finished') return false;
    return new Date(dueDate) < new Date();
  };

  const isUpcoming = (dueDate: string | undefined, columnName: string) => {
    if (!dueDate) return false;
    if (columnName === 'Done' || columnName === 'Completed' || columnName === 'Finished') return false;
    const due = new Date(dueDate);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return due >= now && due <= tomorrow;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getPriorityWeight = (priority: string) => {
    const weights = { urgent: 4, high: 3, medium: 2, low: 1 };
    return weights[priority as keyof typeof weights] || 0;
  };

  const getFilteredAndSortedTasks = () => {
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    let filteredTasks = hideDone ? safeTasks.filter(task => task.column_name !== 'Done') : safeTasks;
    
    return filteredTasks.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'priority':
          comparison = getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
          break;
        case 'due_date':
          const aDate = a.due_date ? new Date(a.due_date).getTime() : Infinity;
          const bDate = b.due_date ? new Date(b.due_date).getTime() : Infinity;
          comparison = aDate - bDate;
          break;
        case 'created_at':
        default:
          comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          break;
      }
      
      return sortDirection === 'asc' ? -comparison : comparison;
    });
  };

  const handleSort = (newSortBy: 'created_at' | 'priority' | 'due_date') => {
    if (sortBy === newSortBy) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortDirection('desc');
    }
  };

  const handleTaskClick = (task: Task) => {
    // Map to the format expected by TaskEditDialog
    const mappedTask: Task = {
      ...task,
      columnId: task.columnId || 0,
      projectId: task.projectId,
      position: task.position || 0
    };
    setSelectedTask(mappedTask);
    setEditDialogOpen(true);
  };

  const handleMarkAsDone = async (task: Task) => {
    try {
      // First, we need to get the project and board information to find the Done column
      // We'll use a workaround to get the board information
      // This assumes each project has a single board with standard columns
      
      // Get all projects to find the one containing this task
      const projectsResponse = await projectsAPI.getAll();
      
      // Find the project for this task (assuming task.project_name matches)
      const project = projectsResponse.data.find((p: any) => p.name === task.project_name);
      
      if (!project) {
        console.error('Project not found for task:', task.project_name);
        return;
      }
      
      // Get the board for this project
      const boardsResponse = await boardsAPI.getByProject(String(project.id));
      
      if (!boardsResponse.data || boardsResponse.data.length === 0) {
        console.error('No boards found for project:', project.name);
        return;
      }
      
      const board = boardsResponse.data[0]; // Assume first board
      
      // Get the full board data with columns
      const boardDataResponse = await boardsAPI.getOne(String(board.id));
      const boardData = boardDataResponse.data;
      
      // Find the 'Done' column
      const doneColumn = boardData.columns.find((col: any) => 
        col.name.toLowerCase() === 'done' || 
        col.name.toLowerCase() === 'completed' ||
        col.name.toLowerCase() === 'finished'
      );
      
      if (!doneColumn) {
        console.error('Done column not found in board:', boardData.name);
        // Fallback: try to find any column that might indicate completion
        const completionColumn = boardData.columns.find((col: any) => 
          col.name.toLowerCase().includes('done') ||
          col.name.toLowerCase().includes('complete') ||
          col.name.toLowerCase().includes('finish')
        );
        
        if (!completionColumn) {
          alert('Could not find a "Done" column in this project board.');
          return;
        }
        
        // Use the found completion column
        await tasksAPI.move(String(task.id), completionColumn.id);
      } else {
        // Move task to Done column
        await tasksAPI.move(String(task.id), doneColumn.id);
      }
      
      // Refresh the task list
      await loadData();
      
      // Show feedback
      console.log('Task marked as done:', task.title);
      
    } catch (error) {
      console.error('Failed to mark task as done:', error);
      alert('Failed to mark task as complete. Please try again.');
    }
  };

  const handleChangePriority = async (task: Task, priority: string) => {
    try {
      await tasksAPI.update(String(task.id), {
        priority
      });
      await loadData();
    } catch (error) {
      console.error('Failed to update task priority:', error);
    }
  };

  const handleDeleteTask = async (task: Task) => {
    if (window.confirm(`Are you sure you want to delete "${task.title}"?`)) {
      try {
        await tasksAPI.delete(String(task.id));
        await loadData();
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Defensive programming - ensure tasks is always an array before filtering
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  
  const inProgressTasks = safeTasks.filter(task => task.column_name === 'In Progress');
  const overdueTasks = safeTasks.filter(task => isOverdue(task.due_date, task.column_name));
  const upcomingTasks = safeTasks.filter(task => isUpcoming(task.due_date, task.column_name));
  const orphanedTasks = safeTasks.filter(task => !task.projectId && (!task.project_name || task.project_name === 'undefined' || task.project_name === null));

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-foreground">My Tasks</h1>
          <p className="mt-2 text-muted-foreground">Your personal task dashboard and progress overview</p>
        </motion.div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.total || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Across all projects
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                  <Clock className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {stats?.byStatus?.find(s => s.status === 'In Progress')?.count || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Currently working on
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{stats?.overdue || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Needs immediate attention
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed This Week</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats?.completedThisWeek || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Great progress!
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}

        {/* Orphaned Tasks Warning */}
        {orphanedTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-300">
                  <AlertTriangle className="h-5 w-5" />
                  Tasks Without Projects ({orphanedTasks.length})
                </CardTitle>
                <CardDescription className="text-orange-700 dark:text-orange-400">
                  These tasks have been removed from their projects. Click on them to reassign to a project.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {orphanedTasks.map((task) => (
                    <TaskContextMenu
                      key={task.id}
                      onMarkComplete={() => handleMarkAsDone(task)}
                      onEdit={() => handleTaskClick(task)}
                      onChangePriority={(priority) => handleChangePriority(task, priority)}
                      onDelete={() => handleDeleteTask(task)}
                      isDone={task.column_name === 'Done'}
                    >
                      <div 
                        className="p-4 border rounded-lg bg-white dark:bg-gray-800 border-orange-300 dark:border-orange-700 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleTaskClick(task)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-sm">{task.title}</h4>
                          <Badge className={priorityColors[task.priority]}>{task.priority}</Badge>
                        </div>
                        <p className="text-xs text-orange-600 dark:text-orange-400 mb-2">
                          ⚠️ No project assigned - Click to fix
                        </p>
                        {task.due_date && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDate(task.due_date)}
                          </div>
                        )}
                      </div>
                    </TaskContextMenu>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Overdue Tasks */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Overdue Tasks ({overdueTasks.length})
                </CardTitle>
                <CardDescription>
                  Tasks that need immediate attention
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {overdueTasks.length > 0 ? (
                  overdueTasks.slice(0, 5).map((task) => (
                    <TaskContextMenu
                      key={task.id}
                      onMarkComplete={() => handleMarkAsDone(task)}
                      onEdit={() => handleTaskClick(task)}
                      onChangePriority={(priority) => handleChangePriority(task, priority)}
                      onDelete={() => handleDeleteTask(task)}
                      isDone={task.column_name === 'Done'}
                    >
                      <div 
                        className="p-4 border rounded-lg bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleTaskClick(task)}
                      >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm">{task.title}</h4>
                        <Badge className={priorityColors[task.priority]}>{task.priority}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {task.project_name}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {task.due_date && formatDate(task.due_date)}
                        </div>
                      </div>
                    </div>
                    </TaskContextMenu>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">No overdue tasks! 🎉</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* In Progress Tasks */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  In Progress ({inProgressTasks.length})
                </CardTitle>
                <CardDescription>
                  Tasks you're currently working on
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {inProgressTasks.length > 0 ? (
                  inProgressTasks.slice(0, 5).map((task) => (
                    <TaskContextMenu
                      key={task.id}
                      onMarkComplete={() => handleMarkAsDone(task)}
                      onEdit={() => handleTaskClick(task)}
                      onChangePriority={(priority) => handleChangePriority(task, priority)}
                      onDelete={() => handleDeleteTask(task)}
                      isDone={task.column_name === 'Done'}
                    >
                      <div 
                        className="p-4 border rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleTaskClick(task)}
                      >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm">{task.title}</h4>
                        <Badge className={priorityColors[task.priority]}>{task.priority}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {task.project_name}
                        </div>
                        {task.due_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(task.due_date)}
                          </div>
                        )}
                      </div>
                    </div>
                    </TaskContextMenu>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">No tasks in progress.</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Upcoming Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-8"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-yellow-500" />
                Upcoming Tasks ({upcomingTasks.length})
              </CardTitle>
              <CardDescription>
                Tasks due within the next 24 hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingTasks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcomingTasks.map((task) => (
                    <TaskContextMenu
                      key={task.id}
                      onMarkComplete={() => handleMarkAsDone(task)}
                      onEdit={() => handleTaskClick(task)}
                      onChangePriority={(priority) => handleChangePriority(task, priority)}
                      onDelete={() => handleDeleteTask(task)}
                      isDone={task.column_name === 'Done'}
                    >
                      <div 
                        className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleTaskClick(task)}
                      >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm">{task.title}</h4>
                        <Badge className={priorityColors[task.priority]}>{task.priority}</Badge>
                      </div>
                      <Badge className={statusColors[task.column_name as keyof typeof statusColors]} variant="outline" size="sm">
                        {task.column_name}
                      </Badge>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {task.project_name}
                        </div>
                        {task.due_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(task.due_date)}
                          </div>
                        )}
                      </div>
                    </div>
                    </TaskContextMenu>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No upcoming tasks in the next 24 hours.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* All Tasks Summary */}
        {Array.isArray(tasks) && tasks.length > 0 && (() => {
          const filteredAndSortedTasks = getFilteredAndSortedTasks();
          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mt-8"
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>All My Tasks ({filteredAndSortedTasks.length})</CardTitle>
                      <CardDescription>
                        Complete overview of all your assigned tasks
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Hide Done Button */}
                      <button
                        onClick={() => setHideDone(!hideDone)}
                        className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
                          hideDone
                            ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300'
                            : 'bg-background border-border text-muted-foreground hover:bg-accent'
                        }`}
                      >
                        {hideDone ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {hideDone ? 'Show Done' : 'Hide Done'}
                      </button>
                      
                      {/* Sort Dropdown */}
                      <div className="relative group">
                        <button className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-accent transition-colors">
                          <ArrowUpDown className="h-4 w-4" />
                          Sort: {sortBy === 'created_at' ? 'Date Created' : sortBy === 'priority' ? 'Priority' : 'Due Date'}
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        
                        <div className="absolute right-0 top-full mt-1 w-48 bg-background border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                          <div className="py-1">
                            <button
                              onClick={() => handleSort('priority')}
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center justify-between ${
                                sortBy === 'priority' ? 'text-blue-600 font-medium' : 'text-foreground'
                              }`}
                            >
                              Priority
                              {sortBy === 'priority' && (
                                <span className="text-xs text-muted-foreground">
                                  {sortDirection === 'desc' ? '↓' : '↑'}
                                </span>
                              )}
                            </button>
                            <button
                              onClick={() => handleSort('due_date')}
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center justify-between ${
                                sortBy === 'due_date' ? 'text-blue-600 font-medium' : 'text-foreground'
                              }`}
                            >
                              Due Date
                              {sortBy === 'due_date' && (
                                <span className="text-xs text-muted-foreground">
                                  {sortDirection === 'desc' ? '↓' : '↑'}
                                </span>
                              )}
                            </button>
                            <button
                              onClick={() => handleSort('created_at')}
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center justify-between ${
                                sortBy === 'created_at' ? 'text-blue-600 font-medium' : 'text-foreground'
                              }`}
                            >
                              Date Created
                              {sortBy === 'created_at' && (
                                <span className="text-xs text-muted-foreground">
                                  {sortDirection === 'desc' ? '↓' : '↑'}
                                </span>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="task-list space-y-3 max-h-96 overflow-y-auto">
                    {filteredAndSortedTasks.length > 0 ? (
                      filteredAndSortedTasks.map((task) => (
                        <TaskContextMenu
                          key={task.id}
                          onMarkComplete={() => handleMarkAsDone(task)}
                          onEdit={() => handleTaskClick(task)}
                          onChangePriority={(priority) => handleChangePriority(task, priority)}
                          onDelete={() => handleDeleteTask(task)}
                          isDone={task.column_name === 'Done'}
                        >
                          <div 
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                            onClick={() => handleTaskClick(task)}
                          >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm truncate">{task.title}</h4>
                              {isOverdue(task.due_date, task.column_name) && (
                                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                              )}
                              {isUpcoming(task.due_date, task.column_name) && (
                                <Clock className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>{task.project_name}</span>
                              {task.due_date && <span>{formatDate(task.due_date)}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge className={priorityColors[task.priority]} size="sm">{task.priority}</Badge>
                            <Badge className={statusColors[task.column_name as keyof typeof statusColors]} variant="outline" size="sm">
                              {task.column_name}
                            </Badge>
                          </div>
                        </div>
                        </TaskContextMenu>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-sm text-center py-4">
                        {hideDone ? 'No incomplete tasks found.' : 'No tasks found.'}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })()}
      </div>

      {/* Task Edit Dialog */}
      {selectedTask && (
        <TaskEditDialog
          task={selectedTask as any}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onUpdate={loadData}
        />
      )}
    </div>
  );
};