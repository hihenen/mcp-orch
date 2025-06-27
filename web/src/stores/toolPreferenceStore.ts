/**
 * 도구 사용 설정 관리 Zustand 스토어
 */

import { create } from 'zustand';
import { ToolPreference, ToolPreferenceUpdate, BulkToolPreferenceUpdate } from '@/types';

interface ToolPreferenceStore {
  // 상태
  toolPreferences: Record<string, ToolPreference[]>; // projectId를 키로 하는 설정 목록
  isLoading: boolean;
  error: string | null;

  // 도구 설정 조회
  loadToolPreferences: (projectId: string, serverId?: string) => Promise<void>;
  
  // 개별 도구 설정 업데이트
  updateToolPreference: (
    projectId: string, 
    serverId: string, 
    toolName: string, 
    isEnabled: boolean
  ) => Promise<void>;
  
  // 일괄 도구 설정 업데이트
  updateToolPreferencesBulk: (
    projectId: string,
    preferences: ToolPreferenceUpdate[]
  ) => Promise<void>;
  
  // 도구 설정 삭제 (기본값으로 복원)
  deleteToolPreference: (
    projectId: string, 
    serverId: string, 
    toolName: string
  ) => Promise<void>;
  
  // 특정 도구의 활성화 상태 확인
  isToolEnabled: (projectId: string, serverId: string, toolName: string) => boolean;
  
  // 서버별 도구 설정 확인
  getServerToolPreferences: (projectId: string, serverId: string) => ToolPreference[];
  
  // 유틸리티
  clearError: () => void;
  reset: () => void;
}

export const useToolPreferenceStore = create<ToolPreferenceStore>((set, get) => ({
  // 초기 상태
  toolPreferences: {},
  isLoading: false,
  error: null,

  // 도구 설정 조회
  loadToolPreferences: async (projectId: string, serverId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const url = new URL(`/api/projects/${projectId}/tool-preferences`, window.location.origin);
      if (serverId) {
        url.searchParams.set('server_id', serverId);
      }

      const response = await fetch(url.toString(), {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to load tool preferences: ${response.statusText}`);
      }

      const preferences = await response.json();
      
      set(state => ({
        toolPreferences: {
          ...state.toolPreferences,
          [projectId]: preferences
        },
        isLoading: false
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load tool preferences',
        isLoading: false
      });
    }
  },

  // 개별 도구 설정 업데이트
  updateToolPreference: async (
    projectId: string, 
    serverId: string, 
    toolName: string, 
    isEnabled: boolean
  ) => {
    const currentState = get();
    
    // 낙관적 업데이트 먼저 실행 (즉시 UI 반영)
    const projectPreferences = currentState.toolPreferences[projectId] || [];
    const existingIndex = projectPreferences.findIndex(
      p => p.server_id === serverId && p.tool_name === toolName
    );

    let updatedPreferences;
    if (existingIndex >= 0) {
      // 기존 설정 업데이트
      updatedPreferences = projectPreferences.map((pref, index) =>
        index === existingIndex ? { ...pref, is_enabled: isEnabled, updated_at: new Date().toISOString() } : pref
      );
    } else {
      // 새 설정 추가
      const newPreference: ToolPreference = {
        server_id: serverId,
        server_name: '', // 서버 이름은 나중에 채움
        tool_name: toolName,
        is_enabled: isEnabled,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      updatedPreferences = [...projectPreferences, newPreference];
    }

    // 즉시 상태 업데이트 (낙관적 업데이트)
    set(state => ({
      toolPreferences: {
        ...state.toolPreferences,
        [projectId]: updatedPreferences
      },
      error: null
    }));

    // 백엔드 API 호출
    try {
      const response = await fetch(
        `/api/projects/${projectId}/tool-preferences/${serverId}/${encodeURIComponent(toolName)}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ is_enabled: isEnabled }),
        }
      );

      if (!response.ok) {
        // API 실패 시 상태 되돌리기
        set(state => ({
          toolPreferences: {
            ...state.toolPreferences,
            [projectId]: projectPreferences // 원래 상태로 복원
          },
          error: `Failed to update tool preference: ${response.statusText}`
        }));
        throw new Error(`Failed to update tool preference: ${response.statusText}`);
      }

      console.log(`✅ Tool preference updated: ${toolName} = ${isEnabled}`);
    } catch (error) {
      // 네트워크 오류 시 상태 되돌리기
      set(state => ({
        toolPreferences: {
          ...state.toolPreferences,
          [projectId]: projectPreferences // 원래 상태로 복원
        },
        error: error instanceof Error ? error.message : 'Failed to update tool preference'
      }));
      throw error;
    }
  },

  // 일괄 도구 설정 업데이트
  updateToolPreferencesBulk: async (
    projectId: string,
    preferences: ToolPreferenceUpdate[]
  ) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/projects/${projectId}/tool-preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ preferences }),
      });

      if (!response.ok) {
        throw new Error(`Failed to bulk update tool preferences: ${response.statusText}`);
      }

      const result = await response.json();
      
      // 설정 다시 로드
      await get().loadToolPreferences(projectId);
      
      set({ isLoading: false });
      return result;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to bulk update tool preferences',
        isLoading: false
      });
      throw error;
    }
  },

  // 도구 설정 삭제 (기본값으로 복원)
  deleteToolPreference: async (
    projectId: string, 
    serverId: string, 
    toolName: string
  ) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(
        `/api/projects/${projectId}/tool-preferences/${serverId}/${encodeURIComponent(toolName)}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete tool preference: ${response.statusText}`);
      }

      // 로컬 상태에서 해당 설정 제거
      set(state => {
        const projectPreferences = state.toolPreferences[projectId] || [];
        const updatedPreferences = projectPreferences.filter(
          p => !(p.server_id === serverId && p.tool_name === toolName)
        );

        return {
          toolPreferences: {
            ...state.toolPreferences,
            [projectId]: updatedPreferences
          },
          isLoading: false
        };
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete tool preference',
        isLoading: false
      });
      throw error;
    }
  },

  // 특정 도구의 활성화 상태 확인
  isToolEnabled: (projectId: string, serverId: string, toolName: string) => {
    const state = get();
    const projectPreferences = state.toolPreferences[projectId] || [];
    const preference = projectPreferences.find(
      p => p.server_id === serverId && p.tool_name === toolName
    );
    
    // 설정이 없으면 기본값은 true (활성화)
    return preference ? preference.is_enabled : true;
  },

  // 서버별 도구 설정 확인
  getServerToolPreferences: (projectId: string, serverId: string) => {
    const state = get();
    const projectPreferences = state.toolPreferences[projectId] || [];
    return projectPreferences.filter(p => p.server_id === serverId);
  },

  // 유틸리티
  clearError: () => set({ error: null }),
  
  reset: () => set({
    toolPreferences: {},
    isLoading: false,
    error: null,
  }),
}));