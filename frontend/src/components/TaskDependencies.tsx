import React, { useState, useEffect } from 'react';
import { tasksAPI } from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { X, AlertCircle, Link2, Users, Search } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface TaskDependency {
  id: number;
  title: string;
  status: string;
  column_name: string;
  assignee_name?: string;
}

interface AvailableTask {
  id: number;
  title: string;
  status: string;
  priority: string;
  assignee_name?: string;
}

interface TaskDependenciesProps {
  taskId: number;
  projectId?: number;
  onUpdate?: () => void;
}

export const TaskDependencies: React.FC<TaskDependenciesProps> = ({ taskId, projectId, onUpdate }) => {
  const [dependencies, setDependencies] = useState<{
    blockedBy: TaskDependency[];
    blocking: TaskDependency[];
  }>({ blockedBy: [], blocking: [] });
  const [newDependencyId, setNewDependencyId] = useState('');
  const [availableTasks, setAvailableTasks] = useState<AvailableTask[]>([]);
  const [taskSearch, setTaskSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [addingDependency, setAddingDependency] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      // Only load dependencies if taskId is valid
      if (Number.isInteger(Number(taskId)) && Number(taskId) > 0) {
        await loadDependencies();
        if (projectId) {
          await loadAvailableTasks();
        }
      } else {
        console.warn('Invalid taskId provided to TaskDependencies:', taskId);
      }
    };
    loadData();
  }, [taskId, projectId]);

  const loadAvailableTasks = async () => {
    if (!projectId) return;
    
    try {
      setLoadingTasks(true);
      const response = await tasksAPI.search({ 
        projectId: String(projectId)
      });
      // Filter out current task and completed tasks based on column name
      const filtered = response.data.filter((task: any) => 
        task.id !== taskId && 
        !['Done', 'Completed', 'Finished'].some(status => 
          task.column_name?.toLowerCase().includes(status.toLowerCase())
        ) &&
        !dependencies.blockedBy.some((dep: TaskDependency) => dep.id === task.id) &&
        !dependencies.blocking.some((dep: TaskDependency) => dep.id === task.id)
      );
      setAvailableTasks(filtered.map((task: any) => ({
        id: task.id,
        title: task.title,
        status: task.column_name || task.status,
        priority: task.priority,
        assignee_name: task.assignee_name
      })));
    } catch (error) {
      console.error('Failed to load available tasks:', error);
    } finally {
      setLoadingTasks(false);
    }
  };

  const loadDependencies = async () => {
    try {
      setLoading(true);
      const response = await tasksAPI.getDependencies(String(taskId));
      setDependencies(response.data);
    } catch (error: any) {
      console.error('Failed to load dependencies:', error);
      // Handle 404 errors more gracefully - task might not exist or user doesn't have access
      if (error.response?.status === 404) {
        setError('Task not found or access denied');
      } else {
        setError('Failed to load task dependencies');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddDependency = async (dependencyTaskId: string) => {
    if (!dependencyTaskId || dependencyTaskId === 'select') return;

    try {
      setAddingDependency(true);
      setError(null);
      await tasksAPI.addDependency(String(taskId), parseInt(dependencyTaskId));
      setNewDependencyId('');
      await loadDependencies();
      await loadAvailableTasks(); // Refresh available tasks
      if (onUpdate) onUpdate();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to add dependency';
      setError(errorMessage);
    } finally {
      setAddingDependency(false);
    }
  };

  const handleRemoveDependency = async (dependencyId: number) => {
    try {
      await tasksAPI.removeDependency(String(taskId), String(dependencyId));
      await loadDependencies();
      await loadAvailableTasks(); // Refresh available tasks
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to remove dependency:', error);
      setError('Failed to remove dependency');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'done':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in progress':
        return 'bg-blue-100 text-blue-800';
      case 'to do':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isBlocked = dependencies.blockedBy.some(dep => 
    dep.status !== 'Done' && dep.status !== 'Completed'
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Dependencies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Dependencies
          {isBlocked && (
            <Badge variant="destructive" className="ml-auto">
              <AlertCircle className="h-3 w-3 mr-1" />
              Blocked
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
            {error}
          </div>
        )}

        {/* Blocked By Section */}
        {dependencies.blockedBy.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <span className="font-medium text-sm">Blocked by {dependencies.blockedBy.length} task(s)</span>
            </div>
            <div className="space-y-2">
              {dependencies.blockedBy.map((dep) => (
                <div key={dep.id} className="flex items-center justify-between p-2 bg-orange-50 border border-orange-200 rounded-md">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{dep.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={getStatusColor(dep.status)}>
                        {dep.status}
                      </Badge>
                      {dep.assignee_name && (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Users className="h-3 w-3" />
                          {dep.assignee_name}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleRemoveDependency(dep.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Blocking Section */}
        {dependencies.blocking.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="h-4 w-4 text-blue-500" />
              <span className="font-medium text-sm">Blocking {dependencies.blocking.length} task(s)</span>
            </div>
            <div className="space-y-2">
              {dependencies.blocking.map((dep) => (
                <div key={dep.id} className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{dep.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={getStatusColor(dep.status)}>
                        {dep.status}
                      </Badge>
                      {dep.assignee_name && (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Users className="h-3 w-3" />
                          {dep.assignee_name}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Dependency Section */}
        <div>
          <Label className="text-sm font-medium">
            Add Dependency
          </Label>
          {projectId ? (
            <div className="space-y-2 mt-1">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Select value={newDependencyId} onValueChange={handleAddDependency} disabled={loadingTasks || addingDependency}>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingTasks ? "Loading tasks..." : "Select a task to depend on..."} />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Search tasks..."
                            value={taskSearch}
                            onChange={(e) => setTaskSearch(e.target.value)}
                            className="pl-8"
                          />
                        </div>
                      </div>
                      {availableTasks
                        .filter(task => 
                          taskSearch === '' || 
                          task.title.toLowerCase().includes(taskSearch.toLowerCase()) ||
                          task.status.toLowerCase().includes(taskSearch.toLowerCase())
                        )
                        .map((task) => (
                          <SelectItem key={task.id} value={String(task.id)}>
                            <div className="flex items-center justify-between w-full">
                              <div className="flex-1 truncate">
                                <div className="font-medium text-sm truncate">{task.title}</div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-gray-500">{task.status}</span>
                                  {task.assignee_name && (
                                    <span className="text-xs text-gray-500">• {task.assignee_name}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      {availableTasks.length === 0 && !loadingTasks && (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          No available tasks found
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                This task will be blocked until the selected task is completed
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500 mt-1">
              Task dependencies are only available for tasks within a project
            </div>
          )}
        </div>

        {/* Empty State */}
        {dependencies.blockedBy.length === 0 && dependencies.blocking.length === 0 && (
          <div className="text-center py-6 text-gray-500 text-sm">
            <Link2 className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            No dependencies yet
          </div>
        )}
      </CardContent>
    </Card>
  );
};