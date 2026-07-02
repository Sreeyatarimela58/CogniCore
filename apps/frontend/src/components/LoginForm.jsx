import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';

export function LoginForm({ onToggleForm }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errorMsg, setErrorMsg] = useState('');

  const loginMutation = useMutation({
    mutationFn: async (data) => {
      const res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Login failed');
      }
      return res.json();
    },
    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.data.accessToken);
      navigate('/');
    },
    onError: (error) => {
      setErrorMsg(error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    loginMutation.mutate(formData);
  };

  return (
    <div className="transition-content">
      {errorMsg && (
        <div className="bg-surface-warm border-l-4 border-status-error p-stack-md flex items-start space-x-3 rounded shadow-sm mb-stack-md">
          <span className="material-symbols-outlined text-status-error">error</span>
          <div>
            <h4 className="font-label-md text-label-md text-on-surface">Authentication Error</h4>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{errorMsg}</p>
          </div>
        </div>
      )}

      <form className="space-y-stack-md" onSubmit={handleSubmit}>
        <div className="space-y-unit">
          <label className="font-label-md text-label-md text-on-surface-variant">Work Email</label>
          <div className="input-focus relative border border-outline-variant/30 bg-surface-container-low rounded-lg transition-colors flex items-center">
            <span className="material-symbols-outlined text-slate-muted ml-3">mail</span>
            <input 
              className="bg-transparent border-none outline-none focus:ring-0 text-body-md w-full px-3 py-stack-sm placeholder:text-slate-muted/50" 
              placeholder="name@company.com" 
              required 
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-unit">
          <div className="flex justify-between items-end">
            <label className="font-label-md text-label-md text-on-surface-variant">Password</label>
            <a className="text-primary font-label-md text-[11px] hover:underline" href="#">Forgot?</a>
          </div>
          <div className="input-focus relative border border-outline-variant/30 bg-surface-container-low rounded-lg transition-colors flex items-center">
            <span className="material-symbols-outlined text-slate-muted ml-3">lock</span>
            <input 
              className="bg-transparent border-none outline-none focus:ring-0 text-body-md w-full px-3 py-stack-sm placeholder:text-slate-muted/50" 
              placeholder="••••••••" 
              required 
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>
        </div>
        <div className="flex items-center space-x-2 py-unit">
          <input className="w-4 h-4 rounded-sm border-outline-variant bg-surface-container-low text-primary focus:ring-primary focus:ring-offset-surface-elevated" id="remember" type="checkbox" />
          <label className="font-body-sm text-body-sm text-on-surface-variant cursor-pointer" htmlFor="remember">Remember this session</label>
        </div>
        <button 
          className="w-full bg-primary py-stack-sm rounded-lg text-on-primary font-label-md text-label-md flex items-center justify-center space-x-2 hover:bg-surface-tint active:scale-[0.98] transition-all group disabled:opacity-70" 
          type="submit"
          disabled={loginMutation.isPending}
        >
          <span className="btn-text">{loginMutation.isPending ? 'Signing In...' : 'Sign In'}</span>
          {loginMutation.isPending && <span className="loading-spinner animate-spin material-symbols-outlined text-lg">progress_activity</span>}
        </button>
        <p className="text-center mt-stack-md font-body-sm text-body-sm text-on-surface-variant">
          Don't have an account? 
          <button className="text-primary hover:underline ml-1" onClick={onToggleForm} type="button">Create one</button>
        </p>
      </form>
    </div>
  );
}
