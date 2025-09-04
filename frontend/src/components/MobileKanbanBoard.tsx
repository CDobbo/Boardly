import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { TaskCard } from './TaskCard';
import { TaskCreateDialog } from './TaskCreateDialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { tasksAPI } from '../lib/api';

interface Task {
  id: number;
  title: string;
  description?: string;
  priority: string;
  assignee_name?: string;
  assignee_id?: number;
  due_date?: string;
  columnId: number;
  projectId?: number;
  position: number;
}

interface Column {
  id: number;
  name: string;
  board_id: number;
  position: number;
  tasks: Task[];
}

interface Board {
  id: number;
  name: string;
  project_id: string;
  columns: Array<{
    id: number;
    name: string;
    position: number;
    tasks: Task[];
  }>;
}

interface MobileKanbanBoardProps {
  board: Board;
  onRefresh?: () => void;
}

export const MobileKanbanBoard: React.FC<MobileKanbanBoardProps> = ({ board, onRefresh }) => {
  const [activeColumnIndex, setActiveColumnIndex] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const columns: Column[] = (board.columns || []).map(column => ({
    ...column,
    board_id: board.id,
    tasks: (column.tasks || []).map(task => ({
      ...task,
      projectId: parseInt(board.project_id) || undefined
    }))
  }));

  const activeColumn = columns[activeColumnIndex];

  const handleTaskUpdate = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await tasksAPI.delete(String(taskId));
      handleTaskUpdate();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handlePreviousColumn = () => {
    setActiveColumnIndex(prev => prev > 0 ? prev - 1 : columns.length - 1);
  };

  const handleNextColumn = () => {
    setActiveColumnIndex(prev => prev < columns.length - 1 ? prev + 1 : 0);
  };

  if (!activeColumn) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">No columns found</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Column Navigation Header */}
      <div className="bg-white border-b px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <Button variant="ghost" size="icon" onClick={handlePreviousColumn}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <div className="text-center flex-1">
            <h2 className="font-semibold text-lg">{activeColumn.name}</h2>
            <Badge variant="secondary" className="mt-1">
              {activeColumn.tasks.length} tasks
            </Badge>
          </div>

          <Button variant="ghost" size="icon" onClick={handleNextColumn}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Column Tabs */}
        <div className="flex justify-center gap-2 overflow-x-auto pb-2">
          {columns.map((column, index) => (
            <button
              key={column.id}
              onClick={() => setActiveColumnIndex(index)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                index === activeColumnIndex
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {column.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-3">
          {activeColumn.tasks.map((task) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <TaskCard
                task={task}
                onDelete={() => handleDeleteTask(task.id)}
                onUpdate={handleTaskUpdate}
                columnName={activeColumn.name}
              />
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {activeColumn.tasks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No tasks in {activeColumn.name}</p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>
        )}
      </div>

      {/* Add Task Button */}
      {activeColumn.tasks.length > 0 && (
        <div className="flex-shrink-0 p-4 bg-white border-t">
          <Button 
            onClick={() => setCreateDialogOpen(true)}
            className="w-full"
            size="lg"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Task to {activeColumn.name}
          </Button>
        </div>
      )}

      <TaskCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onTaskCreated={handleTaskUpdate}
        columnId={activeColumn.id}
      />
    </div>
  );
};