import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

export function SignupForm({ onToggleForm }) {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '', organization: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const registerMutation = useMutation({
    mutationFn: async (data) => {
      const { confirmPassword, organization, ...submitData } = data;
      const res = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Registration failed');
      }
      return res.json();
    },
    onSuccess: () => {
      setSuccessMsg('Account created successfully. Please login.');
      setTimeout(() => {
        onToggleForm();
      }, 2000);
    },
    onError: (error) => {
      setErrorMsg(error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }
    registerMutation.mutate(formData);
  };

  return (
    <div className="transition-content">
      {errorMsg && (
        <div className="bg-surface-warm border-l-4 border-status-error p-stack-md flex items-start space-x-3 rounded shadow-sm mb-stack-md">
          <span className="material-symbols-outlined text-status-error">error</span>
          <div>
            <h4 className="font-label-md text-label-md text-on-surface">Registration Error</h4>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{errorMsg}</p>
          </div>
        </div>
      )}
      
      {successMsg && (
        <div className="bg-surface-warm border-l-4 border-status-success p-stack-md flex items-start space-x-3 rounded shadow-sm mb-stack-md">
          <span className="material-symbols-outlined text-status-success">check_circle</span>
          <div>
            <h4 className="font-label-md text-label-md text-on-surface">Success</h4>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{successMsg}</p>
          </div>
        </div>
      )}

      <form className="space-y-stack-md" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-stack-sm">
          <div className="space-y-unit">
            <label className="font-label-md text-label-md text-on-surface-variant">Full Name</label>
            <input 
              className="w-full bg-surface-container-low outline-none border border-outline-variant/30 rounded-lg px-3 py-stack-sm text-body-md focus:border-primary focus:ring-0 placeholder:text-slate-muted/50" 
              placeholder="Architect" 
              required 
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="space-y-unit">
            <label className="font-label-md text-label-md text-on-surface-variant">Organization</label>
            <input 
              className="w-full bg-surface-container-low outline-none border border-outline-variant/30 rounded-lg px-3 py-stack-sm text-body-md focus:border-primary focus:ring-0 placeholder:text-slate-muted/50" 
              placeholder="Corp Inc." 
              required 
              type="text"
              value={formData.organization}
              onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-unit">
          <label className="font-label-md text-label-md text-on-surface-variant">Work Email</label>
          <input 
            className="w-full bg-surface-container-low outline-none border border-outline-variant/30 rounded-lg px-3 py-stack-sm text-body-md focus:border-primary focus:ring-0 placeholder:text-slate-muted/50" 
            placeholder="name@company.com" 
            required 
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-stack-sm">
          <div className="space-y-unit">
            <label className="font-label-md text-label-md text-on-surface-variant">Password</label>
            <input 
              className="w-full bg-surface-container-low outline-none border border-outline-variant/30 rounded-lg px-3 py-stack-sm text-body-md focus:border-primary focus:ring-0 placeholder:text-slate-muted/50" 
              placeholder="••••••••" 
              required 
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>
          <div className="space-y-unit">
            <label className="font-label-md text-label-md text-on-surface-variant">Confirm</label>
            <input 
              className="w-full bg-surface-container-low outline-none border border-outline-variant/30 rounded-lg px-3 py-stack-sm text-body-md focus:border-primary focus:ring-0 placeholder:text-slate-muted/50" 
              placeholder="••••••••" 
              required 
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            />
          </div>
        </div>
        <button 
          className="w-full bg-primary py-stack-sm rounded-lg text-on-primary font-label-md text-label-md flex items-center justify-center space-x-2 hover:bg-surface-tint active:scale-[0.98] transition-all mt-unit disabled:opacity-70" 
          type="submit"
          disabled={registerMutation.isPending}
        >
          <span className="btn-text">{registerMutation.isPending ? 'Creating Account...' : 'Create Account'}</span>
          {registerMutation.isPending && <span className="loading-spinner animate-spin material-symbols-outlined text-lg">progress_activity</span>}
        </button>
        <p className="text-center mt-stack-md font-body-sm text-body-sm text-on-surface-variant">
          Already have an account? 
          <button className="text-primary hover:underline ml-1" onClick={onToggleForm} type="button">Sign In</button>
        </p>
      </form>
    </div>
  );
}
