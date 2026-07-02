import React, { useState } from 'react';
import { AuthLayout } from '../components/AuthLayout';
import { LoginForm } from '../components/LoginForm';
import { SignupForm } from '../components/SignupForm';
import clsx from 'clsx';

export function AuthPage() {
  const [activeTab, setActiveTab] = useState('login');

  const toggleTab = (tab) => {
    setActiveTab(tab);
  };

  return (
    <AuthLayout>
      <div className="flex border-b border-outline-variant/10 mb-stack-lg">
        <button 
          className={clsx(
            "flex-1 pb-stack-sm font-label-md text-label-md transition-all",
            activeTab === 'login' 
              ? "tab-active text-surface-tint border-b-2 border-surface-tint" 
              : "text-on-surface-variant opacity-60 hover:opacity-100"
          )}
          onClick={() => toggleTab('login')}
        >
          Login
        </button>
        <button 
          className={clsx(
            "flex-1 pb-stack-sm font-label-md text-label-md transition-all",
            activeTab === 'signup' 
              ? "tab-active text-surface-tint border-b-2 border-surface-tint" 
              : "text-on-surface-variant opacity-60 hover:opacity-100"
          )}
          onClick={() => toggleTab('signup')}
        >
          Sign Up
        </button>
      </div>
      
      {activeTab === 'login' ? (
        <LoginForm onToggleForm={() => toggleTab('signup')} />
      ) : (
        <SignupForm onToggleForm={() => toggleTab('login')} />
      )}
    </AuthLayout>
  );
}
