import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Filter, Calendar, Clock, FileText, 
  Users, CheckCircle, AlertCircle, MessageSquare,
  Edit, Trash2, X, ChevronDown, ChevronUp
} from 'lucide-react';
import { diaryAPI, projectsAPI, boardsAPI, tasksAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Checkbox } from '../components/ui/checkbox';

interface DiaryEntry {
  id: number;
  title: string;
  content: string;
  category: 'meeting' | 'action' | 'note' | 'decision' | 'follow-up';
  date: string;
  created_at: string;
  updated_at: string;
  linkedTasks?: LinkedTask[];
}

interface LinkedTask {
  id: number;
  title: string;
  priority: string;
  column_name: string;
  project_name: string;
}

interface DateGroup {
  date: string;
  entries: DiaryEntry[];
}

interface Project {
  id: number;
  name: string;
  description?: string;
}

interface Board {
  id: number;
  name: string;
  columns: Column[];
}

interface Column {
  id: number;
  name: string;
}

const categoryIcons = {
  meeting: Users,
  action: CheckCircle,
  note: FileText,
  decision: AlertCircle,
  'follow-up': MessageSquare,
};

const categoryColors = {
  meeting: 'bg-blue-100 text-blue-800 border-blue-200',
  action: 'bg-green-100 text-green-800 border-green-200',
  note: 'bg-gray-100 text-gray-800 border-gray-200',
  decision: 'bg-orange-100 text-orange-800 border-orange-200',
  'follow-up': 'bg-purple-100 text-purple-800 border-purple-200',
};

export const Diary: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [groupedEntries, setGroupedEntries] = useState<DateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightEntryId, setHighlightEntryId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedColumnId, setSelectedColumnId] = useState<string>('');
  const [createTask, setCreateTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [expandedEntryId, setExpandedEntryId] = useState<number | null>(null);

  const [newEntry, setNewEntry] = useState({
    title: '',
    content: '',
    category: 'note' as const,
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadEntries();
    loadProjects();
    
    // Check if we need to highlight a specific entry
    const entryIdToHighlight = searchParams.get('highlightEntry');
    if (entryIdToHighlight) {
      setHighlightEntryId(parseInt(entryIdToHighlight));
      // Remove the highlight parameter after a short delay
      setTimeout(() => {
        setHighlightEntryId(null);
        setSearchParams(prev => {
          const newParams = new URLSearchParams(prev);
          newParams.delete('highlightEntry');
          return newParams;
        });
      }, 3000);
    }
  }, [searchTerm, selectedCategory, selectedDate, searchParams, setSearchParams]);

  useEffect(() => {
    if (selectedProjectId) {
      loadBoardsForProject(selectedProjectId);
    } else {
      setBoards([]); // Reset boards when no project is selected
      setSelectedColumnId('');
    }
  }, [selectedProjectId]);

  const loadProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const loadBoardsForProject = async (projectId: string) => {
    try {
      const response = await boardsAPI.getByProject(projectId);
      // Ensure boards is always an array
      const boardsData = response.data;
      const boardsArray = Array.isArray(boardsData) ? boardsData : (boardsData ? [boardsData] : []);
      setBoards(boardsArray);
      
      // Auto-select first column if available
      if (boardsArray.length > 0 && boardsArray[0].columns?.length > 0) {
        setSelectedColumnId(boardsArray[0].columns[0].id.toString());
      } else {
        setSelectedColumnId('');
      }
    } catch (error) {
      console.error('Failed to load boards:', error);
      setBoards([]); // Ensure boards is always an array even on error
    }
  };

  const loadEntries = async () => {
    try {
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (selectedCategory) params.category = selectedCategory;
      if (selectedDate) params.date = selectedDate;
      // Add cache-busting parameter
      params._t = Date.now();

      console.log('🔵 About to call diaryAPI.getAll with params:', params);
      const response = await diaryAPI.getAll(params);
      console.log('📔 Diary entries response:', response.data);
      console.log('📔 Entry 611:', response.data.find((e: DiaryEntry) => e.id === 611));
      console.log('📔 Entry 613 (TEST):', response.data.find((e: DiaryEntry) => e.id === 613));
      groupEntriesByDate(response.data);
    } catch (error) {
      console.error('Failed to load diary entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupEntriesByDate = (entries: DiaryEntry[]) => {
    const groups = entries.reduce((acc, entry) => {
      const date = entry.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(entry);
      return acc;
    }, {} as Record<string, DiaryEntry[]>);

    const sortedGroups = Object.entries(groups)
      .map(([date, entries]) => ({ date, entries }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Debug check for entry 611 after grouping
    sortedGroups.forEach(group => {
      const entry611 = group.entries.find(e => e.id === 611);
      if (entry611) {
        console.log('After grouping - Entry 611 linkedTasks:', entry611.linkedTasks);
      }
    });

    setGroupedEntries(sortedGroups);
  };

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const createdEntry = await diaryAPI.create(newEntry);
      
      // Create task if requested
      if (createTask && taskTitle && createdEntry.data?.id) {
        let columnId = selectedColumnId;
        
        // If no column selected, find the 'To Do' column in the selected project
        if (!columnId && selectedProjectId) {
          const todoColumn = boards?.find(board => 
            board.columns?.some(col => col.name.toLowerCase() === 'to do')
          )?.columns?.find(col => col.name.toLowerCase() === 'to do');
          if (todoColumn) {
            columnId = todoColumn.id.toString();
          }
        }
        
        if (columnId) {
          await tasksAPI.create({
            title: taskTitle,
            description: taskDescription || `From diary entry: ${newEntry.title}\n\n${newEntry.content}`,
            priority: taskPriority,
            columnId: parseInt(columnId),
            diaryEntryId: createdEntry.data.id,
          });
        }
      }
      
      // Reset form
      setNewEntry({
        title: '',
        content: '',
        category: 'note',
        date: new Date().toISOString().split('T')[0],
      });
      setCreateTask(false);
      setTaskTitle('');
      setTaskDescription('');
      setTaskPriority('medium');
      setSelectedProjectId('');
      setSelectedColumnId('');
      setIsCreateDialogOpen(false);
      loadEntries();
    } catch (error) {
      console.error('Failed to create entry:', error);
    }
  };

  const handleUpdateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    try {
      await diaryAPI.update(editingEntry.id.toString(), {
        title: editingEntry.title,
        content: editingEntry.content,
        category: editingEntry.category,
        date: editingEntry.date,
      });
      setEditingEntry(null);
      loadEntries();
    } catch (error) {
      console.error('Failed to update entry:', error);
    }
  };

  const handleDeleteEntry = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;

    try {
      await diaryAPI.delete(id.toString());
      loadEntries();
    } catch (error) {
      console.error('Failed to delete entry:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === today.toISOString().split('T')[0]) {
      return 'Today';
    } else if (dateStr === yesterday.toISOString().split('T')[0]) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedDate('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Diary</h1>
              <p className="mt-2 text-gray-600">Track your meetings, actions, and daily notes</p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Entry
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Entry</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateEntry} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Title</label>
                    <Input
                      value={newEntry.title}
                      onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
                      placeholder="Entry title..."
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Category</label>
                      <Select 
                        value={newEntry.category} 
                        onValueChange={(value: any) => setNewEntry({ ...newEntry, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="meeting">Meeting</SelectItem>
                          <SelectItem value="action">Action</SelectItem>
                          <SelectItem value="note">Note</SelectItem>
                          <SelectItem value="decision">Decision</SelectItem>
                          <SelectItem value="follow-up">Follow-up</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Date</label>
                      <Input
                        type="date"
                        value={newEntry.date}
                        onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Content</label>
                    <Textarea
                      value={newEntry.content}
                      onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
                      placeholder="Write your entry content here..."
                      rows={6}
                      required
                    />
                  </div>
                  
                  {/* Task Creation Section */}
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Checkbox
                        id="create-task"
                        checked={createTask}
                        onCheckedChange={(checked) => setCreateTask(checked as boolean)}
                      />
                      <label 
                        htmlFor="create-task" 
                        className="text-sm font-medium cursor-pointer"
                      >
                        Create a task from this entry
                      </label>
                    </div>
                    
                    {createTask && (
                      <div className="space-y-4 pl-6">
                        <div>
                          <label className="block text-sm font-medium mb-1">Task Title</label>
                          <Input
                            value={taskTitle}
                            onChange={(e) => setTaskTitle(e.target.value)}
                            placeholder="Task title..."
                            required={createTask}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">Task Description (optional)</label>
                          <Textarea
                            value={taskDescription}
                            onChange={(e) => setTaskDescription(e.target.value)}
                            placeholder="Additional task details..."
                            rows={3}
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Project</label>
                            <Select 
                              value={selectedProjectId} 
                              onValueChange={setSelectedProjectId}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a project" />
                              </SelectTrigger>
                              <SelectContent>
                                {projects.map(project => (
                                  <SelectItem key={project.id} value={project.id.toString()}>
                                    {project.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-1">Column</label>
                            <Select 
                              value={selectedColumnId} 
                              onValueChange={setSelectedColumnId}
                              disabled={!selectedProjectId}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={selectedProjectId ? "Select a column" : "Select project first"} />
                              </SelectTrigger>
                              <SelectContent>
                                {boards?.flatMap(board => 
                                  board.columns?.map(column => (
                                    <SelectItem key={column.id} value={column.id.toString()}>
                                      {column.name}
                                    </SelectItem>
                                  )) || []
                                ) || []}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">Priority</label>
                          <Select 
                            value={taskPriority} 
                            onValueChange={(value: any) => setTaskPriority(value)}
                          >
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
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => {
                      setIsCreateDialogOpen(false);
                      setCreateTask(false);
                      setTaskTitle('');
                      setTaskDescription('');
                      setTaskPriority('medium');
                    }}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {createTask ? 'Create Entry & Task' : 'Create Entry'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
                {(searchTerm || selectedCategory || selectedDate) && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search entries..."
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <Select value={selectedCategory || 'all'} onValueChange={(value) => setSelectedCategory(value === 'all' ? '' : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="action">Action</SelectItem>
                      <SelectItem value="note">Note</SelectItem>
                      <SelectItem value="decision">Decision</SelectItem>
                      <SelectItem value="follow-up">Follow-up</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Entries */}
        <div className="diary-entries space-y-8">
          <AnimatePresence>
            {groupedEntries.map((group, groupIndex) => (
              <motion.div
                key={group.date}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: groupIndex * 0.1 }}
                className="space-y-4"
              >
                <div className="sticky top-4 z-10 bg-white rounded-lg border shadow-sm px-4 py-2">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {formatDate(group.date)}
                    <span className="text-sm font-normal text-gray-500">
                      ({group.entries.length} {group.entries.length === 1 ? 'entry' : 'entries'})
                    </span>
                  </h2>
                </div>

                <div className="space-y-3">
                  {group.entries.map((entry, entryIndex) => {
                    const CategoryIcon = categoryIcons[entry.category];
                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: (groupIndex * 0.1) + (entryIndex * 0.05) }}
                      >
                        <Card 
                          className={`hover:shadow-md transition-all duration-300 cursor-pointer ${
                            highlightEntryId === entry.id 
                              ? 'ring-2 ring-purple-500 shadow-lg bg-purple-50/50' 
                              : ''
                          } ${
                            expandedEntryId === entry.id ? 'shadow-lg' : ''
                          }`}
                          onClick={(e) => {
                            // Prevent expansion when clicking buttons
                            if ((e.target as HTMLElement).closest('button')) return;
                            setExpandedEntryId(expandedEntryId === entry.id ? null : entry.id);
                          }}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${categoryColors[entry.category]}`}>
                                  <CategoryIcon className="h-3 w-3" />
                                  {entry.category}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(entry.created_at)}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingEntry(entry)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteEntry(entry.id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <CardTitle className="text-lg">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {entry.title}
                                  {entry.linkedTasks && entry.linkedTasks.length > 0 && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                                      <CheckCircle className="h-3 w-3" />
                                      {entry.linkedTasks.length} task{entry.linkedTasks.length > 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>
                                {expandedEntryId === entry.id ? (
                                  <ChevronUp className="h-4 w-4 text-gray-400" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-gray-400" />
                                )}
                              </div>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="relative">
                              <p className={`text-gray-700 whitespace-pre-wrap transition-all duration-300 ${
                                expandedEntryId === entry.id ? '' : 'line-clamp-2'
                              }`}>
                                {entry.content}
                              </p>
                              
                              {/* Expanded content with linked tasks */}
                              {expandedEntryId === entry.id && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="mt-4"
                                >
                                  {/* Linked Tasks Section */}
                                  {entry.linkedTasks && entry.linkedTasks.length > 0 && (
                                    <div className="border-t pt-4">
                                      <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                        Linked Tasks ({entry.linkedTasks.length})
                                      </h4>
                                      <div className="space-y-2">
                                        {entry.linkedTasks.map(task => (
                                          <div
                                            key={task.id}
                                            className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 cursor-pointer transition-colors"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              navigate(`/projects?highlightTask=${task.id}`);
                                            }}
                                          >
                                            <div className="flex-1">
                                              <p className="text-sm font-medium text-gray-900">{task.title}</p>
                                              <p className="text-xs text-gray-500">
                                                {task.project_name} • {task.column_name}
                                              </p>
                                            </div>
                                            <div className={`px-2 py-1 rounded text-xs font-medium ${
                                              task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                              task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                              task.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                                              'bg-gray-100 text-gray-800'
                                            }`}>
                                              {task.priority}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Create Task Button */}
                                  {(!entry.linkedTasks || entry.linkedTasks.length === 0) && (
                                    <div className="border-t pt-4">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingEntry(entry);
                                          setCreateTask(true);
                                        }}
                                      >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Create Task from Entry
                                      </Button>
                                    </div>
                                  )}
                                  
                                  {/* Entry Metadata */}
                                  <div className="mt-4 pt-4 border-t text-xs text-gray-500">
                                    <div className="flex justify-between">
                                      <span>Created: {new Date(entry.created_at).toLocaleString()}</span>
                                      {entry.updated_at !== entry.created_at && (
                                        <span>Updated: {new Date(entry.updated_at).toLocaleString()}</span>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                              
                              {/* Click to expand hint */}
                              {expandedEntryId !== entry.id && entry.content.length > 150 && (
                                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent flex items-end justify-center pb-1">
                                  <span className="text-xs text-gray-400">Click to expand</span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {groupedEntries.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">No entries found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || selectedCategory || selectedDate 
                  ? 'Try adjusting your filters or search terms'
                  : 'Start documenting your daily activities'
                }
              </p>
            </motion.div>
          )}
        </div>

        {/* Edit Dialog */}
        {editingEntry && (
          <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Entry</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpdateEntry} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <Input
                    value={editingEntry.title}
                    onChange={(e) => setEditingEntry({ ...editingEntry, title: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <Select 
                      value={editingEntry.category} 
                      onValueChange={(value: any) => setEditingEntry({ ...editingEntry, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="action">Action</SelectItem>
                        <SelectItem value="note">Note</SelectItem>
                        <SelectItem value="decision">Decision</SelectItem>
                        <SelectItem value="follow-up">Follow-up</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Date</label>
                    <Input
                      type="date"
                      value={editingEntry.date}
                      onChange={(e) => setEditingEntry({ ...editingEntry, date: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Content</label>
                  <Textarea
                    value={editingEntry.content}
                    onChange={(e) => setEditingEntry({ ...editingEntry, content: e.target.value })}
                    rows={6}
                    required
                  />
                </div>
                
                {/* Linked Tasks Section */}
                {editingEntry.linkedTasks && editingEntry.linkedTasks.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Linked Tasks ({editingEntry.linkedTasks.length})
                    </h4>
                    <div className="space-y-2">
                      {editingEntry.linkedTasks.map(task => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 cursor-pointer transition-colors"
                          onClick={() => {
                            navigate(`/projects?highlightTask=${task.id}`);
                            setEditingEntry(null);
                          }}
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{task.title}</p>
                            <p className="text-xs text-gray-500">
                              {task.project_name} • {task.column_name}
                            </p>
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-medium ${
                            task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                            task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            task.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {task.priority}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setEditingEntry(null)}>
                    Cancel
                  </Button>
                  <Button type="submit">Update Entry</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};