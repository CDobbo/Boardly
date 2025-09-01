import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  pointerWithin,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { motion } from 'framer-motion';
import { Plus, MoreVertical } from 'lucide-react';
import { boardsAPI, tasksAPI } from '../lib/api';
import { TaskCard } from './TaskCard';
import { KanbanColumn } from './KanbanColumn';
import { Button } from './ui/button';
import { Input } from './ui/input';

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
  }>;
  tasks: Task[];
}

interface KanbanBoardProps {
  board: Board;
  onRefresh?: () => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ board, onRefresh }) => {
  const [columns, setColumns] = useState<Column[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  useEffect(() => {
    if (board) {
      loadBoard();
    }
  }, [board]);

  const loadBoard = async () => {
    try {
      // Use the board data passed as props
      const columnsWithTasks = (board.columns || []).map(column => ({
        ...column,
        board_id: board.id,
        tasks: (board.tasks || [])
          .filter(task => task.columnId === column.id)
          .map(task => ({
            ...task,
            projectId: parseInt(board.project_id) || undefined
          }))
      }));
      
      setColumns(columnsWithTasks);
    } catch (error) {
      console.error('Failed to load board:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskUpdate = () => {
    // Call the parent refresh to reload project and board data
    if (onRefresh) {
      onRefresh();
    } else {
      // Fallback to local board reload if no parent refresh available
      loadBoard();
    }
  };

  const handleDragOver = (event: any) => {
    // Handle drag over logic here if needed
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = findTaskById(Number(event.active.id));
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) {
      setActiveTask(null);
      return;
    }

    const taskId = Number(active.id);
    const task = findTaskById(taskId);
    
    if (!task) {
      setActiveTask(null);
      return;
    }

    const overId = String(over.id);
    let newColumnId: number;
    let newPosition: number = 0;

    if (overId.startsWith('column-')) {
      newColumnId = Number(overId.replace('column-', ''));
      const targetColumn = columns.find(col => col.id === newColumnId);
      newPosition = targetColumn?.tasks.length || 0;
    } else {
      const overTask = findTaskById(Number(overId));
      if (!overTask) {
        setActiveTask(null);
        return;
      }
      newColumnId = overTask.columnId;
      newPosition = overTask.position;
    }

    if (task.columnId === newColumnId) {
      const column = columns.find(col => col.id === newColumnId);
      if (column) {
        const oldIndex = column.tasks.findIndex(t => t.id === taskId);
        const newIndex = newPosition;
        
        if (oldIndex !== newIndex) {
          const newTasks = arrayMove(column.tasks, oldIndex, newIndex);
          setColumns(columns.map(col => 
            col.id === newColumnId 
              ? { ...col, tasks: newTasks }
              : col
          ));
        }
      }
    } else {
      const sourceColumn = columns.find(col => col.id === task.columnId);
      const targetColumn = columns.find(col => col.id === newColumnId);
      
      if (sourceColumn && targetColumn) {
        const newSourceTasks = sourceColumn.tasks.filter(t => t.id !== taskId);
        const newTargetTasks = [...targetColumn.tasks];
        newTargetTasks.splice(newPosition, 0, { ...task, columnId: newColumnId });
        
        setColumns(columns.map(col => {
          if (col.id === task.columnId) {
            return { ...col, tasks: newSourceTasks };
          }
          if (col.id === newColumnId) {
            return { ...col, tasks: newTargetTasks };
          }
          return col;
        }));
      }
    }

    try {
      await tasksAPI.move(String(taskId), newColumnId, newPosition);
    } catch (error) {
      console.error('Failed to move task:', error);
      handleTaskUpdate();
    }

    setActiveTask(null);
  };

  const findTaskById = (id: number): Task | undefined => {
    for (const column of columns) {
      const task = column.tasks.find(t => t.id === id);
      if (task) return task;
    }
    return undefined;
  };

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) return;

    try {
      await boardsAPI.addColumn(String(board.id), newColumnName);
      setNewColumnName('');
      setAddingColumn(false);
      handleTaskUpdate();
    } catch (error) {
      console.error('Failed to add column:', error);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-x-auto overflow-y-hidden min-h-0">
          <div className="kanban-board flex gap-6 pb-6 px-6 min-w-max h-full">
            {columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                onDeleteTask={handleDeleteTask}
                onReload={handleTaskUpdate}
              />
            ))}
            
            <div className="min-w-[300px] flex-shrink-0 flex flex-col">
              {addingColumn ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gray-50 rounded-lg p-3"
                >
                  <Input
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    placeholder="Column name"
                    className="mb-2"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddColumn();
                      if (e.key === 'Escape') {
                        setAddingColumn(false);
                        setNewColumnName('');
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddColumn}>Add</Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setAddingColumn(false);
                        setNewColumnName('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => setAddingColumn(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Column
                </Button>
              )}
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeTask && (
            <motion.div 
              className="rotate-2 scale-105"
              initial={{ opacity: 0.9, rotate: 0, scale: 1 }}
              animate={{ opacity: 0.95, rotate: 2, scale: 1.05 }}
              style={{ 
                filter: 'drop-shadow(0 25px 25px rgb(0 0 0 / 0.15))',
              }}
            >
              <TaskCard task={activeTask} isDragging />
            </motion.div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
};