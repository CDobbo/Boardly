import React, { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { Calendar, User, AlertCircle, MoreVertical, Trash2, Edit, UserCheck, Link2, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { tasksAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { TaskEditDialog } from './TaskEditDialog';
import { ConfirmDialog } from './ConfirmDialog';
import { useNavigate } from 'react-router-dom';

interface Task {
  id: number;
  title: string;
  description?: string;
  priority: string;
  assignee_name?: string;
  due_date?: string;
  columnId: number; // Changed from column_id to columnId to match API
  position: number;
  diary_entry_id?: number;
  diary_entry_title?: string;
  diary_entry_date?: string;
}

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
  onDelete?: () => void;
  onUpdate?: () => void;
  columnName?: string;
  refreshKey?: number; // Add a refresh key to force re-rendering
}

const priorityColors = {
  low: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-200',
  medium: 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-200',
  high: 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border border-orange-200',
  urgent: 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-200 shadow-sm',
};

const priorityIcons = {
  low: null,
  medium: null,
  high: <AlertCircle className="h-3 w-3" />,
  urgent: <AlertCircle className="h-3 w-3" />,
};

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  isDragging = false,
  onDelete,
  onUpdate,
  columnName,
  refreshKey,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dependencies, setDependencies] = useState<{
    blockedBy: any[];
    blocking: any[];
  }>({ blockedBy: [], blocking: [] });

  useEffect(() => {
    loadDependencies();
  }, [task.id, refreshKey]);

  const loadDependencies = async () => {
    try {
      const response = await tasksAPI.getDependencies(String(task.id));
      setDependencies(response.data);
    } catch (error: any) {
      // Silently handle 404 errors for missing tasks - this can happen with stale data
      if (error.response?.status === 404) {
        console.warn(`Task ${task.id} dependencies not found - task may not exist or access denied`);
      } else {
        console.error('Failed to load dependencies:', error);
      }
    }
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: String(task.id) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleAssignToMe = async () => {
    if (!user || isAssigning) return;
    
    setIsAssigning(true);
    try {
      await tasksAPI.update(String(task.id), {
        assigneeId: user.id
      });
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Failed to assign task:', error);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleDeleteConfirm = () => {
    // Make sure edit dialog is closed before deleting
    setEditDialogOpen(false);
    if (onDelete) {
      onDelete();
    }
  };

  const now = new Date();
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const isCompleted = columnName === 'Done' || columnName === 'Completed' || columnName === 'Finished';
  const isOverdue = dueDate && dueDate < now && !isCompleted;
  const isDueSoon = dueDate && !isOverdue && !isCompleted && dueDate <= new Date(now.getTime() + 24 * 60 * 60 * 1000); // Due within 24 hours
  const isDueToday = dueDate && !isOverdue && !isCompleted && dueDate.toDateString() === now.toDateString();
  
  const isBlocked = dependencies.blockedBy.some(dep => 
    dep.status !== 'Done' && dep.status !== 'Completed'
  );
  const isBlocking = dependencies.blocking.length > 0;
  
  const handleNavigateToDiary = () => {
    if (task.diary_entry_id) {
      navigate(`/diary?highlightEntry=${task.diary_entry_id}`);
    }
  };

  return (
    <>
      <motion.div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        whileHover={{ 
          scale: 1.02,
          y: -2,
          transition: { duration: 0.2, ease: "easeOut" }
        }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-lg p-3 md:p-4 shadow-sm hover:shadow-md transition-shadow min-h-[110px] md:min-h-[120px] flex flex-col relative touch-manipulation",
          isSortableDragging && "opacity-50 cursor-grabbing",
          !isSortableDragging && "cursor-grab",
          isDragging && "shadow-lg",
          isOverdue && "border-red-500 bg-red-50 dark:bg-red-950",
          isDueToday && "border-orange-500 bg-orange-50 dark:bg-orange-950",
          isDueSoon && "border-yellow-500 bg-yellow-50 dark:bg-yellow-950",
          isBlocked && "border-l-4 border-l-orange-500 bg-orange-50/30 dark:bg-orange-950/30",
          task.diary_entry_id && "border-t-2 border-t-purple-500"
        )}
        onClick={(e) => {
          if (onUpdate && !isSortableDragging) {
            e.preventDefault();
            e.stopPropagation();
            setEditDialogOpen(true);
          }
        }}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 pr-2">
            <div className="flex items-start gap-1">
              {task.diary_entry_id && (
                <div title="Created from diary entry">
                  <BookOpen className="h-3 w-3 mt-1 text-purple-500 flex-shrink-0" />
                </div>
              )}
              <h4 className="text-sm font-medium text-foreground line-clamp-2 flex-1">
                {task.title}
              </h4>
              {(isOverdue || isDueToday) && (
                <AlertCircle className={cn("h-4 w-4 mt-0.5 flex-shrink-0", 
                  isOverdue ? "text-red-500" : "text-orange-500"
                )} />
              )}
            </div>
          </div>
          {(onDelete || onUpdate) && (
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 -mr-1"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onUpdate && (
                  <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                )}
                {user && onUpdate && (
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAssignToMe();
                    }}
                    disabled={isAssigning}
                  >
                    <UserCheck className="mr-2 h-4 w-4" />
                    Assign to me
                  </DropdownMenuItem>
                )}
                {task.diary_entry_id && (
                  <DropdownMenuItem onClick={handleNavigateToDiary}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    View Diary Entry
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setDropdownOpen(false);
                      setEditDialogOpen(false); // Ensure edit dialog stays closed
                      setShowDeleteConfirm(true);
                    }}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex-1 mb-2">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {task.description || ''}
          </p>
          {task.diary_entry_id && task.diary_entry_title && (
            <div className="mt-1 text-xs text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              From: {task.diary_entry_title}
              {task.diary_entry_date && (
                <span className="text-muted-foreground ml-1">
                  ({format(new Date(task.diary_entry_date), 'MMM d, yyyy')})
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap mt-auto">
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
              priorityColors[task.priority as keyof typeof priorityColors]
            )}
          >
            {priorityIcons[task.priority as keyof typeof priorityIcons]}
            {task.priority}
          </span>

          {isBlocked && (
            <Badge variant="destructive" className="text-xs px-2 py-0.5">
              <AlertCircle className="h-3 w-3 mr-1" />
              Blocked
            </Badge>
          )}

          {isBlocking && (
            <Badge variant="outline" className="text-xs px-2 py-0.5 border-blue-500 text-blue-700">
              <Link2 className="h-3 w-3 mr-1" />
              Blocking {dependencies.blocking.length}
            </Badge>
          )}

          {task.assignee_name && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              {task.assignee_name}
            </span>
          )}

          {task.due_date && (
            <div className="flex items-center gap-1">
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded",
                  isOverdue && "bg-red-100 text-red-700 border border-red-200",
                  isDueToday && "bg-orange-100 text-orange-700 border border-orange-200", 
                  isDueSoon && "bg-yellow-100 text-yellow-700 border border-yellow-200",
                  !isOverdue && !isDueToday && !isDueSoon && "text-muted-foreground"
                )}
              >
                <Calendar className="h-3 w-3" />
                {format(new Date(task.due_date), 'MMM d')}
                {isOverdue && " (Overdue)"}
                {isDueToday && " (Today)"}
                {isDueSoon && " (Soon)"}
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {onUpdate && (
        <TaskEditDialog
          task={task}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onUpdate={onUpdate}
        />
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );
};