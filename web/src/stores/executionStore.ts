import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Execution } from '@/types';

interface ExecutionState {
  executions: Execution[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setExecutions: (executions: Execution[]) => void;
  addExecution: (execution: Execution) => void;
  updateExecution: (id: string, updates: Partial<Execution>) => void;
  removeExecution: (id: string) => void;
  clearExecutions: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Selectors
  getExecutionById: (id: string) => Execution | undefined;
  getExecutionsByToolId: (toolId: string) => Execution[];
  getExecutionsByServerId: (serverId: string) => Execution[];
  getExecutionsByStatus: (status: Execution['status']) => Execution[];
  getExecutionsToday: () => Execution[];
  getExecutionStats: () => {
    total: number;
    completed: number;
    failed: number;
    running: number;
    pending: number;
    successRate: number;
    averageDuration: number;
  };
}

export const useExecutionStore = create<ExecutionState>()(
  devtools(
    persist(
      (set, get) => ({
        executions: [],
        isLoading: false,
        error: null,

        setExecutions: (executions) => set({ executions }),
        
        addExecution: (execution) =>
          set((state) => ({
            executions: [execution, ...state.executions].slice(0, 1000), // Keep last 1000 executions
          })),
        
        updateExecution: (id, updates) =>
          set((state) => ({
            executions: state.executions.map((execution) =>
              execution.id === id ? { ...execution, ...updates } : execution
            ),
          })),
        
        removeExecution: (id) =>
          set((state) => ({
            executions: state.executions.filter((execution) => execution.id !== id),
          })),
        
        clearExecutions: () => set({ executions: [] }),
        
        setLoading: (isLoading) => set({ isLoading }),
        
        setError: (error) => set({ error }),
        
        getExecutionById: (id) => {
          const state = get();
          return state.executions.find((execution) => execution.id === id);
        },
        
        getExecutionsByToolId: (toolId) => {
          const state = get();
          return state.executions.filter((execution) => execution.toolId === toolId);
        },
        
        getExecutionsByServerId: (serverId) => {
          const state = get();
          return state.executions.filter((execution) => execution.serverId === serverId);
        },
        
        getExecutionsByStatus: (status) => {
          const state = get();
          return state.executions.filter((execution) => execution.status === status);
        },
        
        getExecutionsToday: () => {
          const state = get();
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          return state.executions.filter(
            (execution) => new Date(execution.startedAt) >= today
          );
        },
        
        getExecutionStats: () => {
          const state = get();
          const total = state.executions.length;
          const completed = state.executions.filter(
            (e) => e.status === 'completed'
          ).length;
          const failed = state.executions.filter(
            (e) => e.status === 'failed'
          ).length;
          const running = state.executions.filter(
            (e) => e.status === 'running'
          ).length;
          const pending = state.executions.filter(
            (e) => e.status === 'pending'
          ).length;
          
          const successRate = total > 0 ? (completed / (completed + failed)) * 100 : 0;
          
          const completedExecutions = state.executions.filter(
            (e) => e.status === 'completed' && e.duration
          );
          const averageDuration =
            completedExecutions.length > 0
              ? completedExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) /
                completedExecutions.length
              : 0;
          
          return {
            total,
            completed,
            failed,
            running,
            pending,
            successRate,
            averageDuration,
          };
        },
      }),
      {
        name: 'execution-storage',
        partialize: (state) => ({ 
          executions: state.executions.slice(0, 100) // Only persist last 100 executions
        }),
      }
    )
  )
);
