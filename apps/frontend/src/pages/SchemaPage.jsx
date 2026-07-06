import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchWithAuth } from '../utils/api';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import clsx from 'clsx';
import { useActiveConnection } from '../hooks/useActiveConnection';
import { OnboardingProgressBar } from '../components/OnboardingProgressBar';

export function SchemaPage() {
  const [searchParams] = useSearchParams();
  const connectionIdParam = searchParams.get('connectionId');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTableName, setSelectedTableName] = useState(null);

  const { activeDb, hasMultipleCompleted } = useActiveConnection(connectionIdParam);
  const connectionId = activeDb?.id;

  // Clear the URL param once the hook has absorbed it into the active connection state
  React.useEffect(() => {
    if (connectionIdParam && activeDb && connectionIdParam === activeDb.id) {
      navigate('/schema', { replace: true });
    }
  }, [connectionIdParam, activeDb, navigate]);

  const { data: schemaData, isLoading: schemaLoading, error: schemaError, refetch: refetchSchema } = useQuery({
    queryKey: ['schema', connectionId],
    queryFn: () => fetchWithAuth(`/api/schema/tables?connectionId=${connectionId}`),
    enabled: !!connectionId
  });

  const { data: statusData } = useQuery({
    queryKey: ['connectionStatus', connectionId],
    queryFn: () => fetchWithAuth(`/api/databases/${connectionId}/status`),
    enabled: !!connectionId,
    refetchInterval: (data) => {
      // Poll every 2 seconds if still syncing
      return data?.data?.status?.syncStatus === 'SYNCING' ? 2000 : false;
    }
  });

  const currentStatus = statusData?.data?.status;

  // If status changes from SYNCING to COMPLETED, refetch the schema list to get updated tables/AI metadata
  useEffect(() => {
    if (currentStatus?.syncStatus === 'COMPLETED') {
      refetchSchema();
      // Also invalidate connections list so sidebar updates
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    }
  }, [currentStatus?.syncStatus, refetchSchema, queryClient]);

  const tables = schemaData?.data?.tables || [];

  const filteredTables = useMemo(() => {
    if (!searchQuery) return tables;
    const lowerQuery = searchQuery.toLowerCase();
    return tables.map(table => {
      const tableMatch = table.tableName.toLowerCase().includes(lowerQuery);
      if (tableMatch) return table;
      const matchingColumns = table.columns.filter(col => col.name.toLowerCase().includes(lowerQuery));
      if (matchingColumns.length > 0) {
        return table;
      }
      return null;
    }).filter(Boolean);
  }, [tables, searchQuery]);

  const selectedTable = useMemo(() => {
    return tables.find(t => t.tableName === selectedTableName) || null;
  }, [tables, selectedTableName]);

  if (!connectionId) {
    return (
      <div className="flex flex-col h-full bg-surface min-w-0 overflow-hidden items-center justify-center text-center">
        <span className="material-symbols-outlined text-4xl text-slate-muted mb-4">database</span>
        <h2 className="font-headline-sm text-on-surface mb-2">
          {hasMultipleCompleted ? 'Select an Active Database' : 'No Database Selected'}
        </h2>
        <p className="text-body-md text-slate-muted mb-6">
          {hasMultipleCompleted 
            ? 'Multiple connections exist. Please select a database to view its schema.'
            : 'Connect a database to view its schema.'}
        </p>
        <button onClick={() => navigate('/databases')} className="text-primary hover:underline">
          Go to Databases
        </button>
      </div>
    );
  }

  if (schemaLoading) {
    return (
      <div className="flex flex-col h-full bg-surface min-w-0 overflow-hidden items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">sync</span>
      </div>
    );
  }

  if (schemaError) {
    return (
      <div className="flex flex-col h-full bg-surface min-w-0 overflow-hidden p-6 text-error">
        Error loading schema: {schemaError.message}
      </div>
    );
  }

  return (
    <div className="flex w-full h-full overflow-hidden">
      {/* Main Content Area (Left Pane) */}
      <div className="flex flex-col h-full bg-surface min-w-0 flex-1 overflow-hidden">
        <header className="h-14 flex justify-between items-center w-full px-6 bg-surface/80 backdrop-blur-md border-b border-outline-variant/10 sticky top-0 z-40">
          <div className="flex items-center gap-6">
            <h2 className="font-headline-md text-[18px] font-semibold text-on-surface tracking-tight">Schema Explorer</h2>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-muted text-[16px]">search</span>
              <input 
                className="bg-surface-container-low border border-outline-variant/20 rounded py-1.5 pl-9 pr-4 w-96 text-[13px] font-label-md focus:ring-1 focus:ring-copper-accent/50 focus:border-copper-accent/50 text-on-surface placeholder:text-slate-muted transition-all" 
                placeholder="Quick find table or column..." 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/databases" className="flex items-center gap-2 px-5 py-2 border border-outline-variant/20 text-on-surface-variant hover:text-on-surface font-label-md rounded text-[14px] hover:bg-surface-container-low transition-all">
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Back to Databases
            </Link>
          </div>
        </header>

        {currentStatus?.syncStatus === 'SYNCING' && (
          <OnboardingProgressBar connection={currentStatus} />
        )}

        {/* Stale Metadata Banner */}
        {currentStatus?.syncStatus === 'COMPLETED' && tables.some(t => t.isStale) && (
          <div className="bg-surface-warm/20 border-b border-copper-accent/30 p-3 flex justify-between items-center">
            <span className="text-sm font-label-md text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-copper-accent text-[18px]">warning</span>
              Some tables have stale AI metadata due to recent schema changes.
            </span>
            <button 
              onClick={async () => {
                await fetchWithAuth(`/api/databases/${connectionId}/refresh`, { method: 'POST' });
                queryClient.invalidateQueries({ queryKey: ['connectionStatus', connectionId] });
              }}
              className="px-3 py-1 bg-copper-accent text-surface-container-lowest text-xs font-label-md rounded hover:bg-copper-accent/90"
            >
              Regenerate Metadata
            </button>
          </div>
        )}

        <section className="flex-1 overflow-y-auto p-6 grid-bg">
          <div className="flex items-baseline justify-between mb-4">
            <div className="flex items-baseline gap-2">
              <h3 className="font-headline-md text-[16px] font-medium text-primary">
                {activeDb ? activeDb.name : 'Connected Database'}
              </h3>
              <span className="text-slate-muted text-[12px] font-label-md">{tables.length} TOTAL TABLES</span>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-tech-code text-slate-muted uppercase">
              <span>Sort: Alphabetical</span>
              <span className="material-symbols-outlined text-[14px]">filter_list</span>
            </div>
          </div>

          <div className="border border-outline-variant/10 rounded-sm bg-surface-container-lowest overflow-hidden">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-surface-container border-b border-outline-variant/10">
                  <th className="px-4 py-2 w-12"></th>
                  <th className="px-4 py-2 font-tech-code text-[11px] text-slate-muted uppercase">Table Name</th>
                  <th className="px-4 py-2 font-tech-code text-[11px] text-slate-muted uppercase w-20">Cols</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {filteredTables.map(table => {
                  const isSelected = selectedTableName === table.tableName;
                  return (
                    <tr 
                      key={table.tableName}
                      onClick={() => setSelectedTableName(table.tableName)}
                      className={clsx(
                        "cursor-pointer transition-colors group",
                        isSelected ? "bg-surface-warm/20 hover:bg-surface-warm/30" : "hover:bg-surface-container-low"
                      )}
                    >
                      <td className={clsx("px-4 py-2.5", isSelected ? "text-copper-accent" : "text-slate-muted/30")}>
                        <span className="material-symbols-outlined text-[16px]" style={isSelected ? { fontVariationSettings: "'FILL' 1" } : {}}>star</span>
                      </td>
                      <td className="px-4 py-2.5 overflow-hidden">
                        <div className="flex flex-col truncate">
                          <span className={clsx("font-tech-code text-[13px] truncate", isSelected ? "text-on-surface font-semibold" : "text-on-surface font-medium")}>
                            {table.tableName}
                          </span>
                          <span className={clsx("text-[11px] truncate", table.businessDescription ? "text-slate-muted" : "text-slate-muted italic")}>
                            {table.businessDescription || 'AI description pending'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-label-md text-[12px] text-on-surface-variant">
                        {table.columns.length}
                      </td>
                    </tr>
                  );
                })}
                {filteredTables.length === 0 && (
                  <tr>
                    <td colSpan="3" className="px-4 py-8 text-center text-slate-muted text-sm">
                      No tables found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Technical Sidebar (Right Pane) */}
      <aside className="w-[380px] h-full bg-surface-container-lowest border-l border-outline-variant/20 flex flex-col overflow-y-auto flex-shrink-0">
        {!selectedTable ? (
          <div className="p-5 flex items-center justify-center h-full text-slate-muted text-sm text-center">
            Select a table to view its technical details, columns, and relationships.
          </div>
        ) : (
          <>
            <div className="p-5 border-b border-outline-variant/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">table_rows</span>
                  <h3 className="font-tech-code text-[15px] font-bold text-on-surface">{selectedTable.tableName}</h3>
                </div>
                {/* Backend does not generate table-level warnings in Phase 2. Do not fabricate warnings. */}
                <span className="font-tech-code text-[10px] bg-status-success/10 text-status-success px-1.5 py-0.5 rounded border border-status-success/20">VALIDATED</span>
              </div>
              <p className="text-[12px] text-slate-muted/80 leading-relaxed mt-3">
                {selectedTable.businessDescription ? selectedTable.businessDescription : <span className="italic opacity-50">AI description pending... (Generating in background)</span>}
              </p>
              {selectedTable.businessPurpose && (
                <p className="text-[12px] text-slate-muted/80 leading-relaxed mt-2">
                  <span className="font-semibold text-on-surface">Purpose:</span> {selectedTable.businessPurpose}
                </p>
              )}
              {selectedTable.synonyms && selectedTable.synonyms.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedTable.synonyms.map(syn => (
                    <span key={syn} className="text-[10px] bg-surface-container-high border border-outline-variant/10 text-on-surface px-1.5 py-0.5 rounded">{syn}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-label-md text-[11px] text-slate-muted uppercase tracking-wider">Column Definition</h4>
                <span className="text-[10px] font-tech-code text-primary">{selectedTable.columns.length} TOTAL</span>
              </div>
              <div className="grid grid-cols-1 gap-px bg-outline-variant/10 rounded-sm overflow-hidden border border-outline-variant/10">
                {selectedTable.columns.map(col => {
                  const isPK = col.isPrimaryKey;
                  const fkInfo = selectedTable.relationships?.find(r => r.source_table === selectedTable.tableName && r.source_column === col.name);
                  const isFK = !!fkInfo;
                  
                  return (
                    <div key={col.name} className="grid grid-cols-[1fr_auto_40px] gap-2 p-2 bg-surface-container items-center group relative">
                      <div className="flex flex-col overflow-hidden">
                        <span className="font-tech-code text-[12px] text-on-surface font-medium truncate" title={col.name}>{col.name}</span>
                        {selectedTable.columnDescriptions?.[col.name] && (
                          <span className="text-[10px] text-slate-muted truncate mt-0.5" title={selectedTable.columnDescriptions[col.name]}>
                            {selectedTable.columnDescriptions[col.name]}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-tech-code text-[10px] text-slate-muted uppercase">{col.type}</span>
                        {(col.nullable || col.default) && (
                          <span className="text-[9px] text-slate-muted/70 flex gap-1">
                            {col.nullable && <span>NULL</span>}
                            {col.default && <span className="truncate max-w-[60px]" title={col.default}>DEF: {col.default}</span>}
                          </span>
                        )}
                      </div>
                      <div className="text-right flex items-center justify-end">
                        {isPK && <span className="material-symbols-outlined text-copper-accent text-[14px]" title="Primary Key">key</span>}
                        {isFK && <span className="material-symbols-outlined text-slate-muted/60 text-[14px]" title={`Foreign Key to ${fkInfo.target_table}.${fkInfo.target_column}`}>link</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedTable.relationships && selectedTable.relationships.length > 0 && (
              <div className="px-5 py-4 border-t border-outline-variant/10">
                <h4 className="font-label-md text-[11px] text-slate-muted uppercase tracking-wider mb-3">Relationships</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedTable.relationships.map((rel, idx) => {
                    const isSource = rel.source_table === selectedTable.tableName;
                    const relatedTable = isSource ? rel.target_table : rel.source_table;
                    const relType = isSource ? "M:1" : "1:M";
                    const colorClass = isSource ? "bg-copper-accent" : "bg-status-success";
                    
                    return (
                      <div key={idx} className="flex items-center gap-2 px-2 py-1 bg-surface-container rounded-sm border border-outline-variant/10" title={isSource ? `FK: ${rel.source_column} -> ${rel.target_table}.${rel.target_column}` : `Referenced by: ${rel.source_table}.${rel.source_column} -> ${rel.target_column}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${colorClass}`}></span>
                        <span className="font-tech-code text-[11px] text-on-surface-variant">{relatedTable}</span>
                        <span className="text-[9px] text-slate-muted">{relType}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-auto bg-surface-warm/5 p-5 border-t border-outline-variant/20">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-copper-accent text-[18px]">psychology</span>
                <h4 className="font-label-md text-[11px] text-on-surface font-semibold uppercase tracking-widest">Analysis Quick Start</h4>
              </div>
              <div className="space-y-2">
                <button className="w-full text-left p-3 rounded bg-surface-container-low border border-outline-variant/10 hover:border-copper-accent/30 hover:bg-surface-container transition-all group">
                  <p className="text-[12px] text-slate-muted italic group-hover:text-primary transition-colors leading-tight">AI query suggestions will be available in Phase 3.</p>
                </button>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
