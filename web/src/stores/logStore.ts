import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { LogEntry } from '@/types';
import { getApiClient } from '@/lib/api';

interface LogState {
  logs: LogEntry[];
  isLoading: boolean;
  error: string | null;
  filter: {
    level: 'all' | 'info' | 'warning' | 'error' | 'debug';
    source: string;
    searchQuery: string;
  };
  
  // Actions
  setLogs: (logs: LogEntry[]) => void;
  addLog: (log: LogEntry) => void;
  clearLogs: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setFilter: (filter: Partial<LogState['filter']>) => void;
  fetchLogs: (serverId?: string, limit?: number) => Promise<void>;
  
  // Selectors
  getFilteredLogs: () => LogEntry[];
  getLogsByLevel: (level: LogEntry['level']) => LogEntry[];
  getLogsBySource: (source: string) => LogEntry[];
}

export const useLogStore = create<LogState>()(
  devtools(
    (set, get) => ({
      logs: [],
      isLoading: false,
      error: null,
      filter: {
        level: 'all',
        source: '',
        searchQuery: '',
      },

      setLogs: (logs) => set({ logs }),
      
      addLog: (log) =>
        set((state) => ({
          logs: [log, ...state.logs].slice(0, 10000), // Keep last 10000 logs
        })),
      
      clearLogs: () => set({ logs: [] }),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error }),
      
      setFilter: (filter) =>
        set((state) => ({
          filter: { ...state.filter, ...filter },
        })),
      
      fetchLogs: async (serverId?: string, limit: number = 1000) => {
        set({ isLoading: true, error: null });
        try {
          const apiClient = getApiClient();
          // TODO: Implement getLogs method in API client
          // const response = await apiClient.getLogs(serverId, limit);
          // if (response.success && response.data) {
          //   set({ logs: response.data, isLoading: false });
          // } else {
          //   throw new Error(response.error || 'Failed to fetch logs');
          // }
          
          // For now, generate mock data
          const mockLogs: LogEntry[] = Array.from({ length: 100 }, (_, i) => ({
            id: `log-${Date.now()}-${i}`,
            timestamp: new Date(Date.now() - i * 60000), // 1 minute apart
            level: ['info', 'warning', 'error', 'debug'][Math.floor(Math.random() * 4)] as LogEntry['level'],
            source: serverId || ['server1', 'server2', 'system'][Math.floor(Math.random() * 3)],
            message: `Sample log message ${i}: ${['Operation completed successfully', 'Warning: High memory usage detected', 'Error connecting to server', 'Debug: Processing request'][Math.floor(Math.random() * 4)]}`,
            metadata: {
              serverId,
              requestId: `req-${i}`,
              duration: Math.floor(Math.random() * 1000),
            },
          }));
          
          set({ logs: mockLogs, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch logs',
            isLoading: false 
          });
        }
      },
      
      getFilteredLogs: () => {
        const state = get();
        let filtered = state.logs;
        
        // Filter by level
        if (state.filter.level !== 'all') {
          filtered = filtered.filter((log) => log.level === state.filter.level);
        }
        
        // Filter by source
        if (state.filter.source) {
          filtered = filtered.filter((log) => log.source === state.filter.source);
        }
        
        // Filter by search query
        if (state.filter.searchQuery) {
          const query = state.filter.searchQuery.toLowerCase();
          filtered = filtered.filter(
            (log) =>
              log.message.toLowerCase().includes(query) ||
              log.source.toLowerCase().includes(query) ||
              JSON.stringify(log.metadata).toLowerCase().includes(query)
          );
        }
        
        return filtered;
      },
      
      getLogsByLevel: (level) => {
        const state = get();
        return state.logs.filter((log) => log.level === level);
      },
      
      getLogsBySource: (source) => {
        const state = get();
        return state.logs.filter((log) => log.source === source);
      },
    })
  )
);
