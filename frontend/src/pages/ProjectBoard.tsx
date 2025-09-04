import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Settings, Users, Search } from 'lucide-react';
import { projectsAPI, boardsAPI, tasksAPI } from '../lib/api';
import { KanbanBoard } from '../components/KanbanBoard';
import { TaskEditDialog } from '../components/TaskEditDialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

interface Project {
  id: number;
  name: string;
  description?: string;
  role: string;
}

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
  diary_entry_id?: number;
  diary_entry_title?: string;
  diary_entry_date?: string;
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

export const ProjectBoard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [project, setProject] = useState<Project | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadProject(id);
      loadBoards(id);
    }
  }, [id]);

  const handleTaskClick = useCallback(async (taskId: number) => {
    try {
      // Find task in current board data (now nested in columns)
      let task: Task | undefined;
      if (selectedBoard) {
        for (const column of selectedBoard.columns) {
          task = column.tasks.find(t => t.id === taskId);
          if (task) break;
        }
      }
      
      if (!task) {
        // If not found in current board, fetch from API
        const response = await tasksAPI.getOne(String(taskId));
        task = response.data;
      }
      
      if (task) {
        setSelectedTask(task);
        setTaskDialogOpen(true);
        // Update URL without taskId to prevent reopening
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('taskId');
        setSearchParams(newSearchParams);
      }
    } catch (error) {
      console.error('Failed to load task:', error);
    }
  }, [selectedBoard, searchParams, setSearchParams]);

  const handleTaskUpdate = () => {
    handleRefresh();
  };

  // Handle taskId URL parameter
  useEffect(() => {
    const taskId = searchParams.get('taskId');
    if (taskId && selectedBoard) {
      handleTaskClick(parseInt(taskId));
    }
  }, [searchParams, selectedBoard, handleTaskClick]);

  const loadProject = async (projectId: string) => {
    try {
      const response = await projectsAPI.getOne(projectId);
      setProject(response.data);
    } catch (error) {
      console.error('Failed to load project:', error);
      navigate('/projects');
    }
  };

  const loadBoards = async (projectId: string) => {
    try {
      const response = await boardsAPI.getByProject(projectId);
      // Our API returns a single board object, not an array
      const boardData = response.data;
      setBoards([boardData]); // Wrap in array for consistency
      setSelectedBoard(boardData);
    } catch (error) {
      console.error('Failed to load boards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (id) {
      loadProject(id);
      loadBoards(id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!project || !selectedBoard) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Project not found</h2>
          <Button onClick={() => navigate('/projects')} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border-b px-6 py-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/projects')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-gray-600 mt-1">{project.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            {project.role === 'owner' && (
              <>
                <Button variant="outline" size="icon">
                  <Users className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {boards.length > 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            {boards.map((board) => (
              <div
                key={board.id}
                className={`p-3 rounded-lg border cursor-pointer transition-all h-20 flex items-center justify-center ${
                  selectedBoard.id === board.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-white hover:bg-gray-50 border-gray-200'
                }`}
                onClick={() => setSelectedBoard(board)}
              >
                <span className="text-sm font-medium text-center">{board.name}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <KanbanBoard board={selectedBoard} onRefresh={handleRefresh} />
      </div>

      {selectedTask && (
        <TaskEditDialog
          task={selectedTask}
          open={taskDialogOpen}
          onOpenChange={(open) => {
            setTaskDialogOpen(open);
            if (!open) {
              setSelectedTask(null);
            }
          }}
          onUpdate={handleTaskUpdate}
        />
      )}
    </div>
  );
};