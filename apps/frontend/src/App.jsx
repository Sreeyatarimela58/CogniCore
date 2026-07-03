import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from './components/AppShell';
import { AuthPage } from './pages/AuthPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { DatabasesPage } from './pages/DatabasesPage';
import { SchemaPage } from './pages/SchemaPage';

const queryClient = new QueryClient();

function PrivateRoute({ children }) {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    return <Navigate to="/auth" replace />;
  }
  return children;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route 
            path="/" 
            element={
              <PrivateRoute>
                <AppShell />
              </PrivateRoute>
            }
          >
            <Route index element={<WorkspacePage />} />
            <Route path="schema" element={<SchemaPage />} />
            <Route path="investigations" element={<div className="p-margin text-on-surface">Investigations Page (Coming Soon)</div>} />
            <Route path="databases" element={<DatabasesPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
