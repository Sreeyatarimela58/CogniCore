import React, { useState } from 'react';

export function AuthLayout({ children }) {
  return (
    <div className="flex items-center justify-center min-h-screen p-stack-lg relative overflow-hidden bg-surface-base text-on-surface">
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #718096 1px, transparent 0)', backgroundSize: '40px 40px' }}
      ></div>
      <div className="w-full z-10 max-w-[640px]">
        <div className="text-center mb-stack-lg flex flex-col items-center">
          <div className="flex items-center gap-stack-md mb-unit">
            <div className="w-12 h-12 bg-surface-warm border border-outline-variant/20 flex items-center justify-center rounded-lg">
              <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>database</span>
            </div>
            <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight">CogniCore</h1>
          </div>
          <p className="font-tech-code text-tech-code text-slate-muted uppercase tracking-[0.2em]">Think Beyond SQL</p>
        </div>
        <div className="auth-card bg-surface-elevated p-stack-lg rounded-xl flex flex-col">
          {children}
        </div>
        <div className="mt-stack-lg flex items-center justify-center space-x-gutter">
          <div className="flex items-center space-x-2 text-slate-muted opacity-50">
            <span className="material-symbols-outlined text-sm">lock_person</span>
            <span className="font-tech-code text-[10px] tracking-widest uppercase">AES-256 Encrypted</span>
          </div>
          <div className="flex items-center space-x-2 text-slate-muted opacity-50">
            <span className="material-symbols-outlined text-sm">verified_user</span>
            <span className="font-tech-code text-[10px] tracking-widest uppercase">SOC2 Certified</span>
          </div>
        </div>
      </div>
    </div>
  );
}
