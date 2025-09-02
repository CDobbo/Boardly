import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, X, ExternalLink, Calendar, User, Flag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { tasksAPI } from '../lib/api';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

interface Task {
  id: number;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  created_at: string;
  updated_at: string;
  assignee_name?: string;
  assignee_email?: string;
  column_name: string;
  board_name: string;
  project_name: string;
  project_id: number;
}

interface TaskSearchProps {
  className?: string;
}

const PRIORITY_COLORS = {
  low: 'bg-blue-100 text-blue-800 border-blue-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  urgent: 'bg-red-100 text-red-800 border-red-200',
};


export const TaskSearch: React.FC<TaskSearchProps> = ({ className }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const navigate = useNavigate();

  const performSearch = useCallback(async () => {
    if (!searchQuery.trim() && !priority && !status) {
      setTasks([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const params: any = {};
      if (searchQuery.trim()) params.q = searchQuery;
      if (priority) params.priority = priority;
      if (status) params.status = status;

      const response = await tasksAPI.searchGlobal(params);
      setTasks(response.data);
    } catch (error) {
      console.error('Search failed:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, priority, status]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [performSearch]);

  const clearSearch = () => {
    setSearchQuery('');
    setPriority('');
    setStatus('');
    setTasks([]);
    setHasSearched(false);
  };

  const navigateToTask = (task: Task) => {
    navigate(`/projects/${task.project_id}?taskId=${task.id}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const isOverdue = (dueDateString?: string) => {
    if (!dueDateString) return false;
    return new Date(dueDateString) < new Date() && true;
  };

  return (
    <div className={cn('w-full', className)}>
      <div className="space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-12"
          />
          {(searchQuery || priority || status) && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
              onClick={clearSearch}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          {hasSearched && (
            <span className="text-sm text-muted-foreground">
              {loading ? 'Searching...' : `${tasks.length} task${tasks.length !== 1 ? 's' : ''} found`}
            </span>
          )}
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">All priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              
              <Input
                type="text"
                placeholder="Filter by status (e.g., To Do, In Progress, Done)"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Search Results */}
      <AnimatePresence>
        {(hasSearched && tasks.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 space-y-2 max-h-96 overflow-y-auto"
          >
            {tasks.map((task) => (
              <Card
                key={task.id}
                className="p-3 hover:bg-accent cursor-pointer transition-colors group"
                onClick={() => navigateToTask(task)}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-medium truncate group-hover:text-primary">
                      {task.title}
                    </h4>
                    <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </div>
                  
                  {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {task.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{task.project_name}</span>
                      <span>•</span>
                      <span className="truncate">{task.column_name}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs',
                          PRIORITY_COLORS[task.priority]
                        )}
                      >
                        <Flag className="h-3 w-3 mr-1" />
                        {task.priority}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      {task.assignee_name && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span className="truncate">{task.assignee_name}</span>
                        </div>
                      )}
                    </div>
                    
                    {task.due_date && (
                      <div className={cn(
                        'flex items-center gap-1',
                        isOverdue(task.due_date) ? 'text-red-600' : ''
                      )}>
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(task.due_date)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {hasSearched && !loading && tasks.length === 0 && (
        <div className="mt-4 text-center text-sm text-muted-foreground">
          <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No tasks found</p>
          <p className="text-xs">Try adjusting your search criteria</p>
        </div>
      )}
    </div>
  );
};