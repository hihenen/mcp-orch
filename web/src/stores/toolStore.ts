import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Tool } from '@/types';
import { getApiClient } from '@/lib/api';

interface ToolState {
  tools: Tool[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  selectedServerId: string | null;
  
  // Actions
  setTools: (tools: Tool[]) => void;
  addTool: (tool: Tool) => void;
  updateTool: (id: string, updates: Partial<Tool>) => void;
  removeTool: (id: string) => void;
  removeToolsByServerId: (serverId: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedServerId: (serverId: string | null) => void;
  fetchTools: () => Promise<void>;
  loadTools: () => Promise<void>; // 별칭 추가
  executeTool: (namespace: string, toolName: string, parameters: Record<string, any>) => Promise<any>;
  
  // Selectors
  getToolById: (id: string) => Tool | undefined;
  getToolsByServerId: (serverId: string) => Tool[];
  getFilteredTools: () => Tool[];
  getToolCount: () => number;
}

export const useToolStore = create<ToolState>()(
  devtools(
    (set, get) => ({
      tools: [],
      isLoading: false,
      error: null,
      searchQuery: '',
      selectedServerId: null,

      setTools: (tools) => set({ tools }),
      
      addTool: (tool) => 
        set((state) => ({ 
          tools: [...state.tools, tool] 
        })),
      
      updateTool: (id, updates) =>
        set((state) => ({
          tools: state.tools.map((tool) =>
            tool.id === id ? { ...tool, ...updates } : tool
          ),
        })),
      
      removeTool: (id) =>
        set((state) => ({
          tools: state.tools.filter((tool) => tool.id !== id),
        })),
      
      removeToolsByServerId: (serverId) =>
        set((state) => ({
          tools: state.tools.filter((tool) => tool.serverId !== serverId),
        })),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error }),
      
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      
      setSelectedServerId: (selectedServerId) => set({ selectedServerId }),
      
      fetchTools: async () => {
        set({ isLoading: true, error: null });
        try {
          const apiClient = getApiClient();
          const response = await apiClient.getTools();
          if (response.success && response.data) {
            set({ tools: response.data, isLoading: false });
          } else {
            throw new Error(response.error || 'Failed to fetch tools');
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch tools',
            isLoading: false 
          });
        }
      },
      
      // loadTools는 fetchTools의 별칭
      loadTools: async () => {
        return get().fetchTools();
      },
      
      executeTool: async (namespace: string, toolName: string, parameters: Record<string, any>) => {
        const apiClient = getApiClient();
        const response = await apiClient.executeTool(namespace, toolName, parameters);
        if (response.success) {
          return response.data;
        } else {
          throw new Error(response.error || 'Failed to execute tool');
        }
      },
      
      getToolById: (id) => {
        const state = get();
        return state.tools.find((tool) => tool.id === id);
      },
      
      getToolsByServerId: (serverId) => {
        const state = get();
        return state.tools.filter((tool) => tool.serverId === serverId);
      },
      
      getFilteredTools: () => {
        const state = get();
        let filtered = state.tools;
        
        // Filter by server if selected
        if (state.selectedServerId) {
          filtered = filtered.filter(
            (tool) => tool.serverId === state.selectedServerId
          );
        }
        
        // Filter by search query
        if (state.searchQuery) {
          const query = state.searchQuery.toLowerCase();
          filtered = filtered.filter(
            (tool) =>
              tool.name.toLowerCase().includes(query) ||
              tool.description.toLowerCase().includes(query) ||
              tool.serverName.toLowerCase().includes(query)
          );
        }
        
        return filtered;
      },
      
      getToolCount: () => {
        const state = get();
        return state.tools.length;
      },
    })
  )
);
