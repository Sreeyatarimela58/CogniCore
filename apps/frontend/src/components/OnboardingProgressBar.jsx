import React from 'react';

export function OnboardingProgressBar({ connection }) {
  if (connection?.syncStatus !== 'SYNCING') return null;

  const job = connection.currentJob;
  let statusText = 'Discovering schema structure...';
  let progress = connection.progress || 0;

  if (job) {
    if (job.type === 'metadata_generation') {
      statusText = `Generating AI metadata for: ${job.tableName || 'tables'}...`;
    } else if (job.type === 'embedding_generation') {
      statusText = `Generating embeddings for: ${job.tableName || 'tables'}...`;
    }
  }

  return (
    <div className="bg-surface-warm/20 border-b border-copper-accent/30 p-3 flex flex-col gap-2">
      <div className="flex justify-between items-center text-[12px] font-label-md text-on-surface">
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined text-copper-accent animate-spin text-[16px]">sync</span>
          {statusText}
        </span>
        <span className="text-copper-accent font-tech-code">{progress}%</span>
      </div>
      <div className="w-full bg-outline-variant/20 h-1 rounded overflow-hidden">
        <div 
          className="bg-copper-accent h-full transition-all duration-500 ease-in-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
