import React from 'react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';

export function Sidebar() {
  const navItems = [
    { label: 'Workspace', icon: 'dashboard', path: '/', exact: true },
    { label: 'Schema', icon: 'schema', path: '/schema' },
    { label: 'Investigations', icon: 'search_insights', path: '/investigations' },
    { label: 'Databases', icon: 'database', path: '/databases' },
  ];

  return (
    <nav className="h-screen w-20 lg:w-64 flex flex-col fixed left-0 top-0 bg-surface-container-lowest border-r border-outline-variant/10 z-50">
      <div className="flex flex-col h-full py-stack-lg">
        <div className="px-6 mb-10 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>grid_view</span>
          </div>
          <div className="hidden lg:block">
            <h1 className="font-headline-md text-headline-md font-bold text-primary tracking-tight">CogniCore</h1>
          </div>
        </div>
        
        <div className="flex-1 px-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              className={({ isActive }) => clsx(
                "flex items-center gap-4 px-4 py-3 rounded transition-all duration-200 ease-in-out active:scale-95 group",
                isActive 
                  ? "text-primary font-bold border-r-2 border-primary bg-surface-container-high/50" 
                  : "text-on-surface-variant opacity-70 hover:bg-surface-container-high hover:text-on-surface"
              )}
            >
              {({ isActive }) => (
                <>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive ? "'FILL' 1" : undefined }}>
                    {item.icon}
                  </span>
                  <span className="hidden lg:block font-label-md text-label-md">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
        
        {/* Bottom Pinned Profile Block */}
        <div className="px-4 mt-auto mb-4">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer group">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-variant border border-outline-variant/20 flex-shrink-0">
              <img 
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" 
                alt="Admin Root" 
                className="w-full h-full object-cover" 
              />
            </div>
            <div className="hidden lg:flex flex-col overflow-hidden">
              <span className="font-label-md text-sm text-on-surface truncate group-hover:text-primary transition-colors">Admin Root</span>
              <span className="font-body-sm text-[12px] text-slate-muted truncate">admin@cognicore.io</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
