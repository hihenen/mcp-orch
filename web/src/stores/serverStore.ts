import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { MCPServer } from '@/types';
import { getApiClient } from '@/lib/api';

interface ServerState {
  servers: MCPServer[];
  projectServers: Record<string, MCPServer[]>; // 프로젝트별 서버 캐시
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setServers: (servers: MCPServer[]) => void;
  setProjectServers: (projectId: string, servers: MCPServer[]) => void;
  addServer: (server: MCPServer) => void;
  updateServer: (id: string, updates: Partial<MCPServer>) => void;
  removeServer: (id: string) => void;
  setServerStatus: (id: string, status: MCPServer['status'], error?: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  fetchServers: () => Promise<void>;
  fetchProjectServers: (projectId: string) => Promise<void>;
  loadServers: () => Promise<void>; // 별칭 추가
  
  // Selectors
  getServerById: (id: string) => MCPServer | undefined;
  getProjectServers: (projectId: string) => MCPServer[];
  getActiveServers: () => MCPServer[];
  getServerCount: () => { total: number; active: number };
}

export const useServerStore = create<ServerState>()(
  devtools(
    persist(
      (set, get) => ({
        servers: [],
        projectServers: {},
        isLoading: false,
        error: null,

        setServers: (servers) => set({ servers }),
        
        setProjectServers: (projectId, servers) =>
          set((state) => ({
            projectServers: {
              ...state.projectServers,
              [projectId]: servers
            }
          })),
        
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
        
        fetchProjectServers: async (projectId: string) => {
          set({ isLoading: true, error: null });
          try {
            const response = await fetch(`/api/projects/${projectId}/servers`, {
              credentials: 'include'
            });
            
            if (response.ok) {
              const data = await response.json();
              // 백엔드 응답을 프론트엔드 타입으로 매핑
              const servers: MCPServer[] = data.map((server: any) => ({
                id: server.id || server.name,
                name: server.name,
                command: server.command || '',
                args: server.args || [],
                transportType: server.transportType || server.transport_type || 'stdio',
                transport_type: server.transport_type,
                is_enabled: server.is_enabled ?? true,
                status: server.status === 'online' ? 'online' : 'offline',
                connected: server.connected,
                lastError: server.lastError || server.error,
                error: server.error,
                availableTools: server.tools_count || server.availableTools || 0,
                tools_count: server.tools_count,
                last_connected: server.last_connected,
                description: server.description
              }));
              
              set((state) => ({
                projectServers: {
                  ...state.projectServers,
                  [projectId]: servers
                },
                isLoading: false
              }));
            } else {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : 'Failed to fetch project servers',
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
        
        getProjectServers: (projectId: string) => {
          const state = get();
          return state.projectServers[projectId] || [];
        },
        
        getActiveServers: () => {
          const state = get();
          return state.servers.filter(
            (server) => server.status === 'online' && server.is_enabled
          );
        },
        
        getServerCount: () => {
          const state = get();
          const total = state.servers.length;
          const active = state.servers.filter(
            (server) => server.status === 'online' && server.is_enabled
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
