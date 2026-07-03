import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWithAuth } from '../utils/api';
import clsx from 'clsx';

export function AddEditDatabaseModal({ isOpen, onClose, editingDb }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '', host: '', port: 5432, database: '', username: '', password: '', ssl: true
  });
  const [testStatus, setTestStatus] = useState(null); // 'testing' | 'success' | 'failed'
  const [testError, setTestError] = useState(null);

  React.useEffect(() => {
    if (isOpen) {
      if (editingDb) {
        setFormData({
          name: editingDb.name || '',
          host: editingDb.host || '',
          port: editingDb.port || 5432,
          database: editingDb.database || '',
          username: editingDb.username || '',
          password: '', // always write-only
          ssl: editingDb.ssl ?? true
        });
      } else {
        setFormData({ name: '', host: '', port: 5432, database: '', username: '', password: '', ssl: true });
      }
      setTestStatus(null);
      setTestError(null);
    }
  }, [editingDb, isOpen]);

  const testMutation = useMutation({
    mutationFn: (data) => fetchWithAuth('/api/databases/test', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onMutate: () => {
      setTestStatus('testing');
      setTestError(null);
    },
    onSuccess: () => setTestStatus('success'),
    onError: (error) => {
      setTestStatus('failed');
      setTestError(error.message);
    }
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingDb) {
        return fetchWithAuth(`/api/databases/${editingDb.id}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
      } else {
        return fetchWithAuth('/api/databases', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['databases']);
      handleClose();
    }
  });

  if (!isOpen) return null;

  const handleTest = () => {
    testMutation.mutate(formData);
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handleClose = () => {
    setFormData({ name: '', host: '', port: 5432, database: '', username: '', password: '', ssl: true });
    setTestStatus(null);
    setTestError(null);
    onClose();
  };

  const inputClass = "w-full bg-surface-container-low border border-outline-variant/20 rounded-lg px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors";
  const labelClass = "block text-[12px] font-label-md text-on-surface-variant mb-1.5 uppercase tracking-wider";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-elevated rounded-xl border border-outline-variant/20 w-full max-w-lg shadow-elevation-5 overflow-hidden">
        <div className="p-6 border-b border-outline-variant/10">
          <h2 className="font-headline-sm text-on-surface">{editingDb ? 'Edit Database Connection' : 'Add Database Connection'}</h2>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className={labelClass}>Connection Name</label>
            <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={inputClass} placeholder="e.g. Production Replica" />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className={labelClass}>Host</label>
              <input type="text" value={formData.host} onChange={e => setFormData({...formData, host: e.target.value})} className={inputClass} placeholder="localhost" />
            </div>
            <div>
              <label className={labelClass}>Port</label>
              <input type="number" value={formData.port} onChange={e => setFormData({...formData, port: parseInt(e.target.value)})} className={inputClass} />
            </div>
          </div>
          
          <div>
            <label className={labelClass}>Database Name</label>
            <input type="text" value={formData.database} onChange={e => setFormData({...formData, database: e.target.value})} className={inputClass} placeholder="postgres" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Username</label>
              <input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Password</label>
              <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className={inputClass} placeholder={editingDb ? 'Leave blank to keep existing' : ''} />
            </div>
          </div>
          
          <div className="flex items-center gap-2 pt-2">
            <input type="checkbox" id="ssl" checked={formData.ssl} onChange={e => setFormData({...formData, ssl: e.target.checked})} className="rounded text-primary focus:ring-primary bg-surface-container-low border-outline-variant/20" />
            <label htmlFor="ssl" className="text-body-sm text-on-surface">Enable SSL (Required for managed databases)</label>
          </div>

          {testStatus === 'failed' && (
            <div className="p-3 bg-status-error/10 border border-status-error/20 rounded-lg text-status-error text-body-sm flex gap-2 items-start mt-2">
              <span className="material-symbols-outlined text-sm">error</span>
              <span>{testError}</span>
            </div>
          )}
          
          {testStatus === 'success' && (
            <div className="p-3 bg-status-success/10 border border-status-success/20 rounded-lg text-status-success text-body-sm flex gap-2 items-center mt-2">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              <span>Connection successful!</span>
            </div>
          )}
        </div>
        
        <div className="p-6 border-t border-outline-variant/10 flex items-center justify-between bg-surface-container-low/30">
          <button 
            onClick={handleTest}
            disabled={testStatus === 'testing' || saveMutation.isPending}
            className="px-4 py-2 text-label-md font-label-md text-on-surface border border-outline-variant/30 rounded-lg hover:bg-surface-container transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {testStatus === 'testing' && <span className="material-symbols-outlined animate-spin text-sm">sync</span>}
            Test Connection
          </button>
          
          <div className="flex gap-3">
            <button onClick={handleClose} className="px-4 py-2 text-label-md font-label-md text-on-surface hover:bg-surface-container rounded-lg transition-colors">
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={testStatus !== 'success' || saveMutation.isPending}
              className={clsx(
                "px-5 py-2 text-label-md font-label-md rounded-lg flex items-center gap-2 transition-all",
                testStatus === 'success' && !saveMutation.isPending ? "bg-primary text-on-primary hover:brightness-110" : "bg-surface-variant text-on-surface-variant opacity-50 cursor-not-allowed"
              )}
            >
              {saveMutation.isPending && <span className="material-symbols-outlined animate-spin text-sm">sync</span>}
              Save Connection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
