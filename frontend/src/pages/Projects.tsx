import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Folder, Calendar, Users, Trash2, Edit, Settings } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { projectsAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

interface Member {
  id: number;
  email: string;
  name: string;
  role: string;
  joined_at: string;
}

interface Project {
  id: number;
  name: string;
  description?: string;
  due_date?: string;
  created_at: string;
  role: string;
  owner_name?: string;
  owner_email?: string;
  members?: Member[];
}

// Safe date formatting function
const formatSafeDate = (dateValue: any, defaultText: string = 'Invalid date'): string => {
  if (!dateValue) return defaultText;
  
  let date: Date;
  
  // Handle different date formats
  if (typeof dateValue === 'string') {
    date = new Date(dateValue);
  } else if (dateValue instanceof Date) {
    date = dateValue;
  } else if (dateValue && typeof dateValue === 'object' && dateValue.seconds) {
    // Firestore timestamp format
    date = new Date(dateValue.seconds * 1000);
  } else {
    return defaultText;
  }
  
  // Check if the date is valid
  if (!isValid(date)) {
    return defaultText;
  }
  
  return format(date, 'MMM d, yyyy');
};

export const Projects: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectDueDate, setNewProjectDueDate] = useState('');
  const [creating, setCreating] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDescription, setEditProjectDescription] = useState('');
  const [editProjectDueDate, setEditProjectDueDate] = useState('');
  const [projectMembers, setProjectMembers] = useState<Member[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [updating, setUpdating] = useState(false);
  const navigate = useNavigate();
  
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      console.log('📁 Projects API response:', response.data);
      
      // Ensure we always set an array
      if (Array.isArray(response.data)) {
        setProjects(response.data);
      } else {
        console.warn('Projects API returned non-array:', response.data);
        setProjects([]);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const response = await projectsAPI.create({
        name: newProjectName,
        description: newProjectDescription || undefined,
        due_date: newProjectDueDate || undefined,
      });
      setProjects([response.data, ...(Array.isArray(projects) ? projects : [])]);
      setCreateDialogOpen(false);
      setNewProjectName('');
      setNewProjectDescription('');
      setNewProjectDueDate('');
      navigate(`/projects/${response.data.id}`);
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleEditProject = async (project: Project) => {
    setEditingProject(project);
    setEditProjectName(project.name);
    setEditProjectDescription(project.description || '');
    setEditProjectDueDate(project.due_date ? project.due_date.split('T')[0] : '');
    
    // Load project members
    try {
      const response = await projectsAPI.getOne(String(project.id));
      setProjectMembers(response.data.members || []);
    } catch (error) {
      console.error('Failed to load project members:', error);
      setProjectMembers([]);
    }
    
    setEditDialogOpen(true);
  };

  const handleAddMember = async () => {
    if (!editingProject || !newMemberEmail.trim()) return;
    
    setAddingMember(true);
    try {
      await projectsAPI.addMember(String(editingProject.id), newMemberEmail);
      
      // Reload members
      const response = await projectsAPI.getOne(String(editingProject.id));
      setProjectMembers(response.data.members || []);
      setNewMemberEmail('');
    } catch (error) {
      console.error('Failed to add member:', error);
      alert('Failed to add member. Please check the email address.');
    } finally {
      setAddingMember(false);
    }
  };


  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    
    setUpdating(true);

    try {
      const response = await projectsAPI.update(String(editingProject.id), {
        name: editProjectName,
        description: editProjectDescription || undefined,
        due_date: editProjectDueDate || undefined,
      });
      
      setProjects((Array.isArray(projects) ? projects : []).map(p => 
        p.id === editingProject.id 
          ? { ...p, name: editProjectName, description: editProjectDescription, due_date: editProjectDueDate }
          : p
      ));
      
      setEditDialogOpen(false);
      setEditingProject(null);
      setEditProjectName('');
      setEditProjectDescription('');
      setEditProjectDueDate('');
      setProjectMembers([]);
      setNewMemberEmail('');
    } catch (error) {
      console.error('Failed to update project:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteProject = async (id: number) => {
    const project = projects.find(p => p.id === id);
    const warningMessage = isAdmin && project?.role !== 'owner' 
      ? `ADMIN ACTION: Are you sure you want to delete the project "${project?.name}"? This project belongs to ${project?.owner_email || 'another user'}. This action cannot be undone.`
      : 'Are you sure you want to delete this project? This action cannot be undone.';
      
    if (!window.confirm(warningMessage)) {
      return;
    }

    try {
      await projectsAPI.delete(String(id));
      setProjects((Array.isArray(projects) ? projects : []).filter(p => p.id !== id));
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project. Please try again.');
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
            <p className="mt-2 text-gray-600">Manage and organize your work</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
      </motion.div>

      {projects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <Folder className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No projects yet</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating your first project</p>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="mt-4"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Project
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {Array.isArray(projects) && projects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className="hover:shadow-xl transition-all duration-300 cursor-pointer min-h-[280px] flex flex-col border-l-4 border-l-blue-500"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <CardHeader className="flex-1 p-6">
                  <div className="flex items-start justify-between h-full">
                    <div className="flex-1 flex flex-col space-y-3">
                      <CardTitle className="text-2xl font-bold leading-tight">{project.name}</CardTitle>
                      <CardDescription className="text-base flex-1 line-clamp-4 leading-relaxed">
                        {project.description || 'No description provided'}
                      </CardDescription>
                    </div>
                    {(project.role === 'owner' || isAdmin) && (
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditProject(project);
                          }}
                          title="Edit project"
                          className="h-8 w-8"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(project.id);
                          }}
                          title={isAdmin ? "Delete project (Admin)" : "Delete project"}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="mt-auto p-6 pt-0">
                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {project.due_date ? (
                        <span className={
                          (() => {
                            const dueDate = new Date(project.due_date);
                            return isValid(dueDate) && dueDate < new Date() 
                              ? 'text-red-600 font-medium' 
                              : 'text-gray-600';
                          })()
                        }>
                          Due {formatSafeDate(project.due_date, 'No due date')}
                        </span>
                      ) : (
                        <span className="text-gray-600">
                          Created {formatSafeDate(project.created_at, 'Recently')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">{project.owner_name || 'Unknown Owner'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Add a new project to organize your tasks
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateProject}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="My Awesome Project"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  placeholder="Describe your project..."
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="due-date">Expected Completion Date (Optional)</Label>
                <Input
                  id="due-date"
                  type="date"
                  value={newProjectDueDate}
                  onChange={(e) => setNewProjectDueDate(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={creating}>
                {creating ? 'Creating...' : 'Create Project'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update your project details
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateProject}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Project Name</Label>
                <Input
                  id="edit-name"
                  value={editProjectName}
                  onChange={(e) => setEditProjectName(e.target.value)}
                  placeholder="My Awesome Project"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description (Optional)</Label>
                <Textarea
                  id="edit-description"
                  value={editProjectDescription}
                  onChange={(e) => setEditProjectDescription(e.target.value)}
                  placeholder="Describe your project..."
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-due-date">Expected Completion Date (Optional)</Label>
                <Input
                  id="edit-due-date"
                  type="date"
                  value={editProjectDueDate}
                  onChange={(e) => setEditProjectDueDate(e.target.value)}
                />
              </div>
              
              <div className="grid gap-2">
                <Label>Project Members</Label>
                <div className="space-y-2">
                  {projectMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-medium">
                            {member.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 bg-background rounded text-muted-foreground">
                          {member.role}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter email to add member"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddMember();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddMember}
                    disabled={addingMember || !newMemberEmail.trim()}
                  >
                    {addingMember ? 'Adding...' : 'Add'}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updating}>
                {updating ? 'Updating...' : 'Update Project'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};