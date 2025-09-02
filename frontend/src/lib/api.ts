import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5005/api';
// API configured

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (email: string, password: string, name: string) =>
    api.post('/auth/register', { email, password, name }),
  getMe: () => api.get('/auth/me'),
  getAllUsers: () => api.get('/auth/users'),
};

export const projectsAPI = {
  getAll: () => api.get('/projects'),
  getOne: (id: string) => api.get(`/projects/${id}`),
  create: (data: { name: string; description?: string; due_date?: string }) =>
    api.post('/projects', data),
  update: (id: string, data: { name?: string; description?: string; due_date?: string }) =>
    api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  getMembers: (id: string) => api.get(`/projects/${id}/members`),
  addMember: (id: string, email: string) =>
    api.post(`/projects/${id}/members`, { email }),
};

export const boardsAPI = {
  getByProject: (projectId: string) => api.get(`/boards/project/${projectId}`),
  getOne: (id: string) => api.get(`/boards/${id}`),
  create: (data: { name: string; projectId: number }) =>
    api.post('/boards', data),
  addColumn: (boardId: string, name: string) =>
    api.post(`/boards/${boardId}/columns`, { name }),
  updateColumn: (columnId: string, name: string) =>
    api.put(`/boards/columns/${columnId}`, { name }),
  deleteColumn: (columnId: string) =>
    api.delete(`/boards/columns/${columnId}`),
};

export const tasksAPI = {
  getOne: (id: string) => api.get(`/tasks/${id}`),
  create: (data: {
    title: string;
    description?: string;
    priority?: string;
    columnId: number;
    assigneeId?: string;
    dueDate?: string;
    diaryEntryId?: number;
  }) => api.post('/tasks', data),
  update: (
    id: string,
    data: {
      title?: string;
      description?: string;
      priority?: string;
      assigneeId?: string;
      dueDate?: string;
      projectId?: number;
    }
  ) => api.put(`/tasks/${id}`, data),
  move: (id: string, columnId: number, position?: number) =>
    api.put(`/tasks/${id}/move`, { columnId, position }),
  delete: (id: string) => api.delete(`/tasks/${id}`),
  search: (params: {
    projectId: string;
    q?: string;
    status?: string;
    priority?: string;
    assigneeId?: string;
  }) => api.get('/tasks/search', { params }),
  searchGlobal: (params: {
    q?: string;
    status?: string;
    priority?: string;
    assigneeId?: string;
  }) => api.get('/tasks/search/global', { params }),
  getStats: (projectId: string) => api.get(`/tasks/stats/${projectId}`),
  getMyTasks: () => api.get('/tasks/my-tasks'),
  getMyStats: () => api.get('/tasks/my-stats'),
  getDependencies: (id: string) => api.get(`/tasks/${id}/dependencies`),
  addDependency: (id: string, dependsOnTaskId: number) => 
    api.post(`/tasks/${id}/dependencies`, { dependsOnTaskId }),
  removeDependency: (id: string, dependencyId: string) => 
    api.delete(`/tasks/${id}/dependencies/${dependencyId}`),
};

export const adminAPI = {
  getUsers: () => api.get('/admin/users'),
  createUser: (data: { email: string; name: string; password: string; role?: string }) =>
    api.post('/admin/users', data),
  updateUser: (id: string, data: { email?: string; name?: string; role?: string; password?: string }) =>
    api.put(`/admin/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  getStats: () => api.get('/admin/stats'),
  createBackup: () => api.post('/admin/backup'),
  getBackups: () => api.get('/admin/backups'),
};

export const eventsAPI = {
  getAll: (params?: { start?: string; end?: string; project_id?: string }) => 
    api.get('/events', { params }),
  getOne: (id: string) => api.get(`/events/${id}`),
  create: (data: {
    title: string;
    description?: string;
    start_date: string;
    end_date?: string;
    all_day?: boolean;
    event_type?: 'event' | 'deadline' | 'meeting' | 'reminder';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    project_id?: number;
  }) => api.post('/events', data),
  update: (id: string, data: {
    title?: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    all_day?: boolean;
    event_type?: 'event' | 'deadline' | 'meeting' | 'reminder';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    project_id?: number;
  }) => api.put(`/events/${id}`, data),
  delete: (id: string) => api.delete(`/events/${id}`),
};

export const diaryAPI = {
  getAll: (params?: { 
    date?: string; 
    category?: 'meeting' | 'action' | 'note' | 'decision' | 'follow-up';
    search?: string;
  }) => {
    // Fetching diary entries
    return api.get('/diary', { params });
  },
  getByDate: () => api.get('/diary/by-date'),
  getOne: (id: string) => api.get(`/diary/${id}`),
  create: (data: {
    title: string;
    content: string;
    category: 'meeting' | 'action' | 'note' | 'decision' | 'follow-up';
    date: string;
  }) => api.post('/diary', data),
  update: (id: string, data: {
    title?: string;
    content?: string;
    category?: 'meeting' | 'action' | 'note' | 'decision' | 'follow-up';
    date?: string;
  }) => api.put(`/diary/${id}`, data),
  delete: (id: string) => api.delete(`/diary/${id}`),
};

export const goalsAPI = {
  getAll: () => api.get('/goals'),
  create: (data: {
    title: string;
    description?: string;
    category: string;
    completed?: boolean;
    target_date?: string;
  }) => api.post('/goals', data),
  update: (id: string, data: {
    title?: string;
    description?: string;
    category?: string;
    completed?: boolean;
    target_date?: string;
  }) => api.put(`/goals/${id}`, data),
  delete: (id: string) => api.delete(`/goals/${id}`),
};

export default api;