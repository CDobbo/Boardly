import React, { useCallback } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Folder, LogOut, User, Menu, X, Plus, ChevronDown, ChevronRight, CheckSquare, Shield, Calendar, Target, BookOpen, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { projectsAPI } from '../lib/api';
import { Button } from './ui/button';
import { ThemeToggle } from './ThemeToggle';
import { TaskSearch } from './TaskSearch';
import { cn } from '../lib/utils';
import version from '../version.json';

interface Project {
  id: number;
  name: string;
  description?: string;
  due_date?: string;
  created_at: string;
  role: string;
  owner_name?: string;
  owner_email?: string;
}

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [projectsExpanded, setProjectsExpanded] = React.useState(true);
  const [searchExpanded, setSearchExpanded] = React.useState(false);
  const [loadingProjects, setLoadingProjects] = React.useState(false);

  const loadProjects = useCallback(async () => {
    if (!user) return;
    
    setLoadingProjects(true);
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
      setLoadingProjects(false);
    }
  }, [user]);

  React.useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user, loadProjects]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  console.log('Layout - Current user:', user, 'Role:', user?.role);
  
  const navItems = [
    { path: '/goals', icon: Target, label: 'Goals' },
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/my-tasks', icon: CheckSquare, label: 'My Tasks' },
    { path: '/calendar', icon: Calendar, label: 'Calendar' },
    { path: '/diary', icon: BookOpen, label: 'Diary' },
    { path: '/projects', icon: Folder, label: 'Projects' },
    ...(user?.role === 'admin' ? [{ path: '/admin', icon: Shield, label: 'Admin Panel' }] : []),
  ];

  return (
    <div className="flex h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between px-6 border-b">
            <h1 className="text-xl font-bold text-primary">Boardly</h1>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {/* Search Section */}
            <div className="mb-4">
              <div className="flex items-center w-full">
                <button
                  onClick={() => setSearchExpanded(!searchExpanded)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors flex-1",
                    searchExpanded
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Search className="h-5 w-5" />
                  Search Tasks
                </button>
                <button
                  onClick={() => setSearchExpanded(!searchExpanded)}
                  className="p-2 rounded-lg transition-colors text-foreground hover:bg-accent"
                >
                  {searchExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              </div>
              
              {searchExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 px-3"
                >
                  <TaskSearch />
                </motion.div>
              )}
            </div>

            {navItems.map((item) => (
              <div key={item.path}>
                {item.path === '/projects' ? (
                  <div>
                    <div className="flex items-center w-full">
                      <Link
                        to={item.path}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors flex-1",
                          location.pathname === item.path
                            ? "bg-primary text-primary-foreground"
                            : "text-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <item.icon className="h-5 w-5" />
                        {item.label}
                      </Link>
                      <button
                        onClick={() => setProjectsExpanded(!projectsExpanded)}
                        className="p-2 rounded-lg transition-colors text-foreground hover:bg-accent"
                      >
                        {projectsExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    
                    {projectsExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="ml-8 mt-1 space-y-1"
                      >
                        {loadingProjects ? (
                          <div className="px-3 py-2 text-xs text-muted-foreground">
                            Loading projects...
                          </div>
                        ) : Array.isArray(projects) && projects.length > 0 ? (
                          projects.map((project) => (
                            <Link
                              key={project.id}
                              to={`/projects/${project.id}`}
                              className={cn(
                                "block rounded-lg px-3 py-2 text-sm transition-colors truncate",
                                location.pathname === `/projects/${project.id}`
                                  ? "bg-primary/10 text-primary font-medium"
                                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                              )}
                              onClick={() => setSidebarOpen(false)}
                              title={project.name}
                            >
                              {project.name}
                            </Link>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-xs text-muted-foreground">
                            No projects yet
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <Link
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      location.pathname === item.path
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                )}
              </div>
            ))}
          </nav>

          <div className="border-t p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
            <div className="mt-2 px-3 py-2 text-xs text-muted-foreground border-t">
              Build #{version.build}
              <br />
              {new Date(version.timestamp).toLocaleString()}
            </div>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-card border-b flex items-center justify-between px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              onClick={() => navigate('/projects/new')}
              size="sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};