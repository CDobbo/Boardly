import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { motion } from 'framer-motion';
import { Plus, MoreVertical, Trash2, Edit2 } from 'lucide-react';
import { TaskCard } from './TaskCard';
import { TaskContextMenu } from './TaskContextMenu';
import { TaskCreateDialog } from './TaskCreateDialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { tasksAPI, boardsAPI, projectsAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface Task {
  id: number;
  title: string;
  description?: string;
  priority: string;
  assignee_name?: string;
  due_date?: string;
  columnId: number; // Changed from column_id to columnId to match API
  position: number;
}

interface Column {
  id: number;
  name: string;
  board_id: number;
  position: number;
  tasks: Task[];
}

interface KanbanColumnProps {
  column: Column;
  onDeleteTask: (taskId: number) => void;
  onReload: () => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  onDeleteTask,
  onReload,
}) => {
  const { user } = useAuth();
  const [addingTask, setAddingTask] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [columnName, setColumnName] = useState(column.name);
  const [refreshKey, setRefreshKey] = useState(0);

  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
  });

  const handleTaskUpdate = () => {
    setRefreshKey(prev => prev + 1); // Force TaskCard dependency refresh
    onReload(); // Trigger board reload
  };
  

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      await tasksAPI.create({
        title: newTaskTitle,
        columnId: column.id,
        priority: 'medium',
        assigneeId: user?.id ? String(user.id) : undefined,
      });
      setNewTaskTitle('');
      setAddingTask(false);
      onReload();
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  const handleUpdateColumnName = async () => {
    if (!columnName.trim() || columnName === column.name) {
      setEditingName(false);
      setColumnName(column.name);
      return;
    }

    try {
      await boardsAPI.updateColumn(String(column.id), columnName);
      setEditingName(false);
      onReload();
    } catch (error) {
      console.error('Failed to update column:', error);
      setColumnName(column.name);
    }
  };

  const handleDeleteColumn = async () => {
    if (column.tasks.length > 0) {
      if (!window.confirm('This column has tasks. Are you sure you want to delete it?')) {
        return;
      }
    }

    try {
      await boardsAPI.deleteColumn(String(column.id));
      onReload();
    } catch (error) {
      console.error('Failed to delete column:', error);
    }
  };

  const taskIds = column.tasks.map(task => String(task.id));

  return (
    <motion.div
      ref={setNodeRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={`bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 min-w-[300px] max-w-[300px] group flex flex-col h-full shadow-sm ${
        isOver ? 'ring-2 ring-blue-500 ring-offset-2 bg-blue-50 dark:bg-blue-900/20' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        {editingName ? (
          <Input
            value={columnName}
            onChange={(e) => setColumnName(e.target.value)}
            onBlur={handleUpdateColumnName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleUpdateColumnName();
              if (e.key === 'Escape') {
                setEditingName(false);
                setColumnName(column.name);
              }
            }}
            className="h-8 font-medium"
            autoFocus
          />
        ) : (
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            {column.name}
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2.5 py-0.5 rounded-full">
              {column.tasks.length}
            </span>
          </h3>
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditingName(true)}>
              <Edit2 className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDeleteColumn}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Column
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col flex-1 min-h-0">
          <div className="space-y-2 flex-1 overflow-y-auto min-h-[100px] pr-1">
            {column.tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onDelete={() => onDeleteTask(task.id)}
                onUpdate={handleTaskUpdate}
                columnName={column.name}
                refreshKey={refreshKey}
              />
            ))}
          </div>
        </div>
      </SortableContext>

      <div className="flex-shrink-0 mt-2">
          {addingTask ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <Input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Task title"
                className="mb-2"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTask();
                  if (e.key === 'Escape') {
                    setAddingTask(false);
                    setNewTaskTitle('');
                  }
                }}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddTask}>Add</Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setAddingTask(false);
                    setNewTaskTitle('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className={`w-full justify-start transition-opacity duration-200 ${
                column.name.toLowerCase() === 'to do' 
                  ? 'opacity-100' 
                  : 'opacity-0 group-hover:opacity-100'
              }`}
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          )}
        </div>

      <TaskCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onTaskCreated={handleTaskUpdate}
        columnId={column.id}
      />
    </motion.div>
  );
};