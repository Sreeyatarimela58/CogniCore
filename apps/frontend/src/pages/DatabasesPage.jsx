import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWithAuth } from '../utils/api';
import { AddEditDatabaseModal } from '../components/AddEditDatabaseModal';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';

function DatabaseRow({ db, onRetrySync, onDelete, onEdit }) {
  const navigate = useNavigate();
  const isSyncing = db.syncStatus === 'SYNCING' || db.syncStatus === 'CONNECTING';
  
  useQuery({
    queryKey: ['databaseStatus', db.id],
    queryFn: () => fetchWithAuth(`/api/databases/${db.id}/status`),
    refetchInterval: isSyncing ? 3000 : false,
  });

  const getStatusConfig = (status) => {
    switch (status) {
      case 'COMPLETED': return { label: 'CONNECTED', icon: 'check_circle', colorClass: 'bg-status-success/10 text-status-success border-status-success/20' };
      case 'FAILED': return { label: 'FAILED', icon: 'error', colorClass: 'bg-status-error/10 text-status-error border-status-error/20' };
      case 'SYNCING': return { label: 'SYNCING', icon: 'sync', colorClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20', spin: true };
      case 'CONNECTING': return { label: 'SYNCING', icon: 'electrical_services', colorClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20', spin: true };
      default: return { label: 'DISCONNECTED', icon: 'help', colorClass: 'bg-surface-variant text-slate-muted border-outline-variant/20' };
    }
  };

  const config = getStatusConfig(db.syncStatus);
  const isCompleted = db.syncStatus === 'COMPLETED';

  return (
    <tr className={clsx("connection-row transition-colors", isSyncing && "bg-blue-500/5 border-y border-blue-500/10")}>
      <td className="px-6 py-5">
        <div className="flex items-center gap-4">
          <div className={clsx("w-10 h-10 rounded flex items-center justify-center", isCompleted ? "bg-surface-container-high text-primary-fixed-dim" : isSyncing ? "bg-blue-500/10 text-blue-500" : "bg-status-error/10 text-status-error")}>
            <span className={clsx("material-symbols-outlined", isSyncing && "animate-spin")}>
              {isCompleted ? 'storage' : isSyncing ? 'sync' : 'error'}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-headline-md text-body-md font-semibold text-on-surface">{db.name}</span>
            </div>
            <p className="text-[12px] text-on-surface-variant">PostgreSQL • {db.schemaVersion || 'Unknown'}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="flex flex-col">
          <span className="font-tech-code text-body-sm text-on-surface">{db.database || 'default'}</span>
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="flex flex-col">
          <span className="font-tech-code text-body-sm text-on-surface">{db.host}</span>
          <span className="text-[11px] text-outline">Port: {db.port}</span>
        </div>
      </td>
      <td className="px-6 py-5">
        <span className={clsx("px-2 py-1 text-[10px] font-tech-code rounded border", config.colorClass)}>
          {config.label}
        </span>
      </td>
      <td className="px-6 py-5">
        <div className="flex flex-col">
          <span className="text-body-sm text-on-surface">
            {db.lastSyncAt ? new Date(db.lastSyncAt).toLocaleString() : 'Never'}
          </span>
        </div>
      </td>
      <td className="px-6 py-5 text-right">
        <div className="flex items-center justify-end gap-2">
          <button 
            onClick={() => navigate(`/schema?connectionId=${db.id}`)}
            disabled={!isCompleted}
            className="p-2 text-outline hover:text-primary transition-colors disabled:opacity-50"
            title="Open Schema"
          >
            <span className="material-symbols-outlined">schema</span>
          </button>
          
          {db.syncStatus === 'FAILED' && (
            <button 
              onClick={() => onRetrySync(db.id)}
              disabled={isSyncing}
              className="p-2 text-outline hover:text-warning transition-colors disabled:opacity-50"
              title="Retry Sync"
            >
              <span className="material-symbols-outlined">sync</span>
            </button>
          )}
          
          <button 
            onClick={() => onEdit(db)}
            className="p-2 text-outline hover:text-primary transition-colors"
            title="Edit Connection"
          >
            <span className="material-symbols-outlined">edit</span>
          </button>
          
          <button 
            onClick={() => onDelete(db.id)}
            className="p-2 text-outline hover:text-error transition-colors"
            title="Delete Connection"
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
      </td>
    </tr>
  );
}

export function DatabasesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDb, setEditingDb] = useState(null);
  
  const { data, isLoading } = useQuery({
    queryKey: ['databases'],
    queryFn: () => fetchWithAuth('/api/databases'),
    refetchInterval: (data) => {
      const isAnySyncing = data?.data?.connections?.some(db => db.syncStatus === 'SYNCING' || db.syncStatus === 'CONNECTING');
      return isAnySyncing ? 3000 : false;
    }
  });

  const syncMutation = useMutation({
    mutationFn: (id) => fetchWithAuth(`/api/databases/${id}/sync`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries(['databases'])
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => fetchWithAuth(`/api/databases/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries(['databases'])
  });

  const databases = data?.data?.connections || [];
  
  const total = databases.length;
  const connected = databases.filter(db => db.syncStatus === 'COMPLETED').length;
  const syncing = databases.filter(db => db.syncStatus === 'SYNCING' || db.syncStatus === 'CONNECTING').length;
  const failed = databases.filter(db => db.syncStatus === 'FAILED').length;

  const getDonutSegment = (value, offsetValue, color) => {
    if (total === 0 || value === 0) return null;
    const percentage = value / total;
    const offsetPercentage = offsetValue / total;
    const strokeDasharray = 364.4;
    const strokeDashoffset = strokeDasharray - (percentage * strokeDasharray);
    const rotation = offsetPercentage * 360;
    return (
      <circle 
        className={`${color} transition-all duration-500`} 
        cx="64" cy="64" fill="transparent" r="58" 
        stroke="currentColor" 
        strokeDasharray={strokeDasharray} 
        strokeDashoffset={strokeDashoffset} 
        strokeWidth="8"
        style={{ transform: `rotate(${rotation}deg)`, transformOrigin: 'center' }}
      />
    );
  };

  return (
    <div className="p-margin mx-auto h-full w-full flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Database Connections</h1>
          <p className="text-body-md text-slate-muted mt-1">Manage and monitor all your database connections</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary font-label-md rounded-lg hover:opacity-90 transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          <span>New Connection</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-gutter">
        {/* Left Section: Main Content */}
        <div className="flex-1 flex flex-col gap-gutter">
          <div className="bg-surface-elevated border border-outline-variant/10 rounded-xl overflow-hidden w-full">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low/50 border-b border-outline-variant/10">
                  <th className="px-6 py-4 font-tech-code text-[10px] uppercase tracking-wider text-outline">Connection</th>
                  <th className="px-6 py-4 font-tech-code text-[10px] uppercase tracking-wider text-outline">Database</th>
                  <th className="px-6 py-4 font-tech-code text-[10px] uppercase tracking-wider text-outline">Host</th>
                  <th className="px-6 py-4 font-tech-code text-[10px] uppercase tracking-wider text-outline">Status</th>
                  <th className="px-6 py-4 font-tech-code text-[10px] uppercase tracking-wider text-outline">Last Synced</th>
                  <th className="px-6 py-4 font-tech-code text-[10px] uppercase tracking-wider text-outline text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <span className="material-symbols-outlined animate-spin text-primary text-4xl">sync</span>
                    </td>
                  </tr>
                ) : databases.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto gap-4">
                        <div className="w-16 h-16 bg-surface-variant rounded-2xl flex items-center justify-center border border-outline-variant/20">
                          <span className="material-symbols-outlined text-3xl text-on-surface-variant">database</span>
                        </div>
                        <h2 className="font-headline-sm text-on-surface">No databases connected</h2>
                        <p className="text-body-md text-slate-muted">Connect your first PostgreSQL database to begin exploring its schema and generating AI insights.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  databases.map(db => (
                    <DatabaseRow 
                      key={db.id} 
                      db={db} 
                      onRetrySync={(id) => syncMutation.mutate(id)}
                      onEdit={(dbToEdit) => {
                        setEditingDb(dbToEdit);
                        setIsModalOpen(true);
                      }}
                      onDelete={(id) => {
                        if (window.confirm('Are you sure you want to delete this connection?')) {
                          deleteMutation.mutate(id);
                        }
                      }}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Sidebar: Overview */}
        <aside className="w-full lg:w-80 flex flex-col gap-gutter self-start">
          {/* Connection Health Overview */}
          <div className="bg-surface-elevated border border-outline-variant/10 rounded-xl p-6">
            <h3 className="font-headline-md text-body-md font-semibold text-on-surface mb-6">Connection Overview</h3>
            <div className="relative flex items-center justify-center mb-8">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle className="text-surface-container-high" cx="64" cy="64" fill="transparent" r="58" stroke="currentColor" strokeWidth="8"></circle>
                {getDonutSegment(connected, 0, 'text-status-success')}
                {getDonutSegment(syncing, connected, 'text-blue-500')}
                {getDonutSegment(failed, connected + syncing, 'text-status-error')}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-on-surface">{total}</span>
                <span className="text-[10px] text-outline uppercase tracking-widest font-tech-code">Total</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-status-success"></span>
                  <span className="text-body-sm text-on-surface-variant">Connected</span>
                </div>
                <span className="font-tech-code text-on-surface text-body-sm">{connected}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span className="text-body-sm text-on-surface-variant">Syncing</span>
                </div>
                <span className="font-tech-code text-on-surface text-body-sm">{syncing}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-status-error"></span>
                  <span className="text-body-sm text-on-surface-variant">Failed</span>
                </div>
                <span className="font-tech-code text-on-surface text-body-sm">{failed}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-surface-elevated border border-outline-variant/10 rounded-xl p-6">
            <h3 className="font-headline-md text-body-md font-semibold text-on-surface mb-4">Quick Actions</h3>
            <div className="p-4 bg-surface-container-low border border-dashed border-outline-variant/30 rounded-lg text-center">
              <p className="text-body-sm text-slate-muted">Available in a later phase.</p>
            </div>
          </div>

          {/* Health Events Activity */}
          <div className="bg-surface-elevated border border-outline-variant/10 rounded-xl p-6">
            <h3 className="font-headline-md text-body-md font-semibold text-on-surface mb-4">Health Events</h3>
            <div className="p-4 bg-surface-container-low border border-dashed border-outline-variant/30 rounded-lg text-center">
              <p className="text-body-sm text-slate-muted">Available in a later phase.</p>
            </div>
          </div>
        </aside>
      </div>

      <AddEditDatabaseModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingDb(null);
        }}
        editingDb={editingDb}
      />
    </div>
  );
}

