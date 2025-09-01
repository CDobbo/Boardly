import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { ProjectBoard } from './pages/ProjectBoard';
import { MyTasks } from './pages/MyTasks';
import { Calendar } from './pages/Calendar';
import { Goals } from './pages/Goals';
import { Diary } from './pages/Diary';
import { Layout } from './components/Layout';
import { AdminScreen } from './pages/AdminScreen';
import { DebugAuth } from './pages/DebugAuth';
import { DemoGuide } from './components/DemoGuide';
import { TaskUpdateDebugger } from './debug/TaskUpdateDebugger';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  // Checking authentication status

  if (loading) {
    // Authentication loading
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    // Redirecting to login
    return <Navigate to="/login" />;
  }

  // User authenticated
  return <>{children}</>;
};

// Removed AdminRoute - not using it anymore

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
                <DemoGuide />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="goals" element={<Goals />} />
            <Route path="my-tasks" element={<MyTasks />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="diary" element={<Diary />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:id" element={<ProjectBoard />} />
            <Route path="admin" element={<AdminScreen />} />
            <Route path="debug-auth" element={<DebugAuth />} />
            <Route path="debug-task-update" element={<TaskUpdateDebugger />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
