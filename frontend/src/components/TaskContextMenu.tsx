import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle2, Edit, Trash2, Copy, Flag } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';

interface TaskContextMenuProps {
  children: React.ReactNode;
  onMarkComplete?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onChangePriority?: (priority: string) => void;
  isDone?: boolean;
}

export const TaskContextMenu: React.FC<TaskContextMenuProps> = ({
  children,
  onMarkComplete,
  onEdit,
  onDelete,
  onDuplicate,
  onChangePriority,
  isDone = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setPosition({ x: e.clientX, y: e.clientY });
    setIsOpen(true);
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  const handleDeleteClick = () => {
    setIsOpen(false);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    if (onDelete) {
      onDelete();
    }
  };

  return (
    <div onContextMenu={handleContextMenu} className="relative">
      {children}
      
      {isOpen && (
        <div
          ref={menuRef}
          className="fixed z-50 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1"
          style={{
            left: position.x,
            top: position.y,
          }}
        >
          {!isDone && onMarkComplete && (
            <>
              <button
                onClick={() => handleAction(onMarkComplete)}
                className="flex items-center w-full px-3 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Mark as Complete
              </button>
              <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
            </>
          )}
          
          {onEdit && (
            <button
              onClick={() => handleAction(onEdit)}
              className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Task
            </button>
          )}
          
          {onDuplicate && (
            <button
              onClick={() => handleAction(onDuplicate)}
              className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </button>
          )}
          
          {onChangePriority && (
            <>
              <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
              <button
                onClick={() => handleAction(() => onChangePriority('urgent'))}
                className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Flag className="mr-2 h-4 w-4 text-red-500" />
                Set as Urgent
              </button>
              <button
                onClick={() => handleAction(() => onChangePriority('high'))}
                className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Flag className="mr-2 h-4 w-4 text-orange-500" />
                Set as High
              </button>
              <button
                onClick={() => handleAction(() => onChangePriority('medium'))}
                className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Flag className="mr-2 h-4 w-4 text-yellow-500" />
                Set as Medium
              </button>
              <button
                onClick={() => handleAction(() => onChangePriority('low'))}
                className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Flag className="mr-2 h-4 w-4 text-blue-500" />
                Set as Low
              </button>
            </>
          )}
          
          {onDelete && (
            <>
              <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
              <button
                onClick={handleDeleteClick}
                className="flex items-center w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Task
              </button>
            </>
          )}
        </div>
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
    </div>
  );
};