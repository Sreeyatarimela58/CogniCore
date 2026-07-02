import React from 'react';
import { Sidebar } from './Sidebar';
import { Outlet, useNavigate } from 'react-router-dom';

export function AppShell() {
  const navigate = useNavigate();
  
  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    navigate('/auth');
  };

  return (
    <div className="flex overflow-hidden bg-surface-base text-on-surface">
      <Sidebar />
      <main className="flex-1 ml-20 lg:ml-64 h-screen overflow-y-auto custom-scrollbar relative flex flex-col">
        {/* Global TopAppBar */}
        <header className="h-16 sticky top-0 z-40 bg-surface-dim/80 backdrop-blur-md border-b border-outline-variant/10 flex justify-between items-center w-full px-margin">
          <div className="flex items-center gap-6">
            {/* The page title can be dynamic or set by children, but for now we'll leave it as Workspace for the dashboard */}
            <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">Workspace</h2>
            <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1 rounded-full border border-outline-variant/20">
              <span className="w-2 h-2 rounded-full bg-status-success animate-pulse"></span>
              <span className="font-tech-code text-tech-code text-slate-muted">Production_DB_West</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleLogout}
              className="text-on-surface-variant hover:text-primary transition-colors flex items-center"
              title="Logout"
            >
              <span className="material-symbols-outlined">logout</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-surface-variant overflow-hidden border border-outline-variant/20">
              <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-sm">person</span>
              </div>
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
