import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Settings, OperationMode } from '@/types';

interface AppState {
  // Settings
  settings: Settings;
  
  // Operation mode
  operationMode: OperationMode;
  
  // UI state
  sidebarOpen: boolean;
  
  // Actions
  updateSettings: (updates: Partial<Settings>) => void;
  setOperationMode: (mode: OperationMode) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

const defaultSettings: Settings = {
  language: 'en',
  theme: 'system',
  apiEndpoint: 'http://localhost:8000',
  requestTimeout: 30000,
  maxRetries: 3,
};

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        settings: defaultSettings,
        operationMode: 'proxy',
        sidebarOpen: true,

        updateSettings: (updates) =>
          set((state) => ({
            settings: { ...state.settings, ...updates },
          })),
        
        setOperationMode: (operationMode) => set({ operationMode }),
        
        toggleSidebar: () =>
          set((state) => ({ sidebarOpen: !state.sidebarOpen })),
        
        setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      }),
      {
        name: 'app-storage',
        partialize: (state) => ({ 
          settings: state.settings,
          operationMode: state.operationMode,
        }),
      }
    )
  )
);
