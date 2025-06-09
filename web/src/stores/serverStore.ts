import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { MCPServer } from '@/types';
import { getApiClient } from '@/lib/api';

interface ServerState {
  servers: MCPServer[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setServers: (servers: MCPServer[]) => void;
  addServer: (server: MCPServer) => void;
  updateServer: (id: string, updates: Partial<MCPServer>) => void;
  removeServer: (id: string) => void;
  setServerStatus: (id: string, status: MCPServer['status'], error?: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  fetchServers: () => Promise<void>;
  loadServers: () => Promise<void>; // 별칭 추가
  
  // Selectors
  getServerById: (id: string) => MCPServer | undefined;
  getActiveServers: () => MCPServer[];
  getServerCount: () => { total: number; active: number };
}

export const useServerStore = create<ServerState>()(
  devtools(
    persist(
      (set, get) => ({
        servers: [],
        isLoading: false,
        error: null,

        setServers: (servers) => set({ servers }),
        
        addServer: (server) => 
          set((state) => ({ 
            servers: [...state.servers, server] 
          })),
        
        updateServer: (id, updates) =>
          set((state) => ({
            servers: state.servers.map((server) =>
              server.id === id ? { ...server, ...updates } : server
            ),
          })),
        
        removeServer: (id) =>
          set((state) => ({
            servers: state.servers.filter((server) => server.id !== id),
          })),
        
        setServerStatus: (id, status, error) =>
          set((state) => ({
            servers: state.servers.map((server) =>
              server.id === id
                ? { ...server, status, lastError: error }
                : server
            ),
          })),
        
        setLoading: (isLoading) => set({ isLoading }),
        
        setError: (error) => set({ error }),
        
        fetchServers: async () => {
          set({ isLoading: true, error: null });
          try {
            const apiClient = getApiClient();
            const response = await apiClient.getServers();
            if (response.success && response.data) {
              set({ servers: response.data, isLoading: false });
            } else {
              throw new Error(response.error || 'Failed to fetch servers');
            }
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : 'Failed to fetch servers',
              isLoading: false 
            });
          }
        },
        
        // loadServers는 fetchServers의 별칭
        loadServers: async function() {
          return this.fetchServers();
        },
        
        getServerById: (id) => {
          const state = get();
          return state.servers.find((server) => server.id === id);
        },
        
        getActiveServers: () => {
          const state = get();
          return state.servers.filter(
            (server) => server.status === 'online' && !server.disabled
          );
        },
        
        getServerCount: () => {
          const state = get();
          const total = state.servers.length;
          const active = state.servers.filter(
            (server) => server.status === 'online' && !server.disabled
          ).length;
          return { total, active };
        },
      }),
      {
        name: 'server-storage',
        partialize: (state) => ({ servers: state.servers }),
      }
    )
  )
);
