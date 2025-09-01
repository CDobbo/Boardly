import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';

export const DebugAuth: React.FC = () => {
  const { user, loading } = useAuth();
  const localStorageUser = localStorage.getItem('user');
  
  let parsedLocalStorage: any = null;
  try {
    if (localStorageUser) {
      parsedLocalStorage = JSON.parse(localStorageUser);
    }
  } catch (e) {
    console.error('Failed to parse localStorage user');
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Auth Debug Page</h1>
      
      <div className="space-y-4">
        <div className="bg-white border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Auth Context</h2>
          <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
          <p><strong>User exists:</strong> {user ? 'Yes' : 'No'}</p>
          {user && (
            <div className="mt-2 p-2 bg-gray-100 rounded">
              <pre>{JSON.stringify(user, null, 2)}</pre>
            </div>
          )}
        </div>

        <div className="bg-white border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">User Role Check</h2>
          <p><strong>user?.role:</strong> {user?.role}</p>
          <p><strong>Type of role:</strong> {typeof user?.role}</p>
          <p><strong>Role === 'admin':</strong> {String(user?.role === 'admin')}</p>
          <p><strong>Role == 'admin':</strong> {String(user?.role == 'admin')}</p>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">LocalStorage (Raw)</h2>
          <div className="p-2 bg-gray-100 rounded">
            <pre className="whitespace-pre-wrap break-all">{localStorageUser || 'null'}</pre>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">LocalStorage (Parsed)</h2>
          {parsedLocalStorage && (
            <div className="mt-2 p-2 bg-gray-100 rounded">
              <pre>{JSON.stringify(parsedLocalStorage, null, 2)}</pre>
            </div>
          )}
          <p className="mt-2"><strong>LocalStorage role:</strong> {parsedLocalStorage?.role}</p>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Actions</h2>
          <div className="space-x-2">
            <Button 
              onClick={() => {
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                window.location.reload();
              }}
            >
              Clear LocalStorage & Reload
            </Button>
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
            >
              Reload Page
            </Button>
            <Button 
              onClick={() => window.location.href = '/admin'}
              variant="outline"
            >
              Go to Admin (window.location)
            </Button>
            <a href="/admin">
              <Button variant="outline">
                Go to Admin (href)
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};