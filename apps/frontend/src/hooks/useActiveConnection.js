import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchWithAuth } from '../utils/api';

export function useActiveConnection(urlParamId = null) {
  const [activeConnectionIdState, setActiveConnectionIdState] = useState(() => localStorage.getItem('activeConnectionId'));

  // Sync state if localStorage changes
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'activeConnectionId') {
        setActiveConnectionIdState(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Fetch all databases
  const { data: dbsData } = useQuery({
    queryKey: ['connections'],
    queryFn: () => fetchWithAuth('/api/databases'),
  });

  // Find the active database
  const activeDb = useMemo(() => {
    if (!dbsData?.data?.connections) return null;
    const connections = dbsData.data.connections;
    const completedConnections = connections.filter(c => c.syncStatus === 'COMPLETED' || c.syncStatus === 'SYNCING');
    
    // 1. If we have a URL param, prioritize it
    if (urlParamId) {
      const specified = completedConnections.find(c => c.id === urlParamId);
      if (specified) return specified;
    }
    
    // 2. If we have a valid active connection saved, use it
    if (activeConnectionIdState) {
      const specified = completedConnections.find(c => c.id === activeConnectionIdState);
      if (specified) return specified;
    }
    
    // 3. If exactly one connected database exists, auto-select it
    if (completedConnections.length === 1) {
      return completedConnections[0];
    }
    
    // 4. Otherwise, do not arbitrarily pick one
    return null;
  }, [dbsData, activeConnectionIdState, urlParamId]);

  // Update localStorage if we found a valid activeDb and it differs from state
  useEffect(() => {
    if (activeDb && activeDb.id !== activeConnectionIdState) {
      localStorage.setItem('activeConnectionId', activeDb.id);
      setActiveConnectionIdState(activeDb.id);
      window.dispatchEvent(new Event('activeConnectionChanged'));
    }
  }, [activeDb, activeConnectionIdState]);
  
  // Custom event listener for same-window updates without full storage event
  useEffect(() => {
    const handleCustomChange = () => {
      setActiveConnectionIdState(localStorage.getItem('activeConnectionId'));
    };
    window.addEventListener('activeConnectionChanged', handleCustomChange);
    return () => window.removeEventListener('activeConnectionChanged', handleCustomChange);
  }, []);

  return { activeDb, hasMultipleCompleted: dbsData?.data?.connections?.filter(c => c.syncStatus === 'COMPLETED' || c.syncStatus === 'SYNCING').length > 1 };
}
