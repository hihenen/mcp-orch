/**
 * 프로젝트 관리 Zustand 스토어
 */

import { create } from 'zustand';
import { 
  Project, 
  ProjectDetail, 
  ProjectMember, 
  ProjectServer, 
  ProjectApiKey,
  CreateProjectRequest,
  UpdateProjectRequest,
  AddProjectMemberRequest,
  UpdateProjectMemberRequest,
  CreateProjectApiKeyRequest,
  ProjectClineConfig,
  ProjectRole,
  TeamForInvite,
  TeamInviteRequest,
  TeamInviteResponse
} from '@/types/project';
import { Tool } from '@/types';

// Project Activity 타입 정의
export interface ProjectActivity {
  id: string;
  project_id: string;
  user_id?: string;
  action: string;
  description: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  metadata?: Record<string, any>;
  context?: Record<string, any>;
  target_type?: string;
  target_id?: string;
  created_at: string;
  user_name?: string;
}

interface ProjectStore {
  // 상태
  projects: Project[];
  selectedProject: ProjectDetail | null;
  projectServers: ProjectServer[];
  projectMembers: ProjectMember[];
  projectApiKeys: ProjectApiKey[];
  projectTools: Tool[];
  projectActivities: ProjectActivity[];
  availableTeams: TeamForInvite[];
  isLoading: boolean;
  isLoadingAvailableTeams: boolean;
  error: string | null;

  // 프로젝트 컨텍스트 상태
  currentProject: Project | null;
  userProjects: Project[];
  currentUserRole: ProjectRole | null;
  lastSelectedProjectId: string | null;
  
  // 프로젝트 전환 로딩 상태
  isProjectSwitching: boolean;
  switchingFromProject: Project | null;
  switchingToProject: Project | null;

  // 프로젝트 관리
  loadProjects: () => Promise<void>;
  createProject: (data: CreateProjectRequest) => Promise<Project>;
  loadProject: (projectId: string) => Promise<ProjectDetail>;
  updateProject: (projectId: string, data: UpdateProjectRequest) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<void>;
  setSelectedProject: (project: ProjectDetail | null) => void;

  // 프로젝트 멤버 관리
  loadProjectMembers: (projectId: string) => Promise<void>;
  addProjectMember: (projectId: string, data: AddProjectMemberRequest) => Promise<ProjectMember>;
  updateProjectMember: (projectId: string, memberId: string, data: UpdateProjectMemberRequest) => Promise<ProjectMember>;
  removeProjectMember: (projectId: string, memberId: string) => Promise<void>;

  // 팀 관련 관리
  loadAvailableTeams: (projectId: string) => Promise<void>;
  inviteTeamToProject: (projectId: string, data: TeamInviteRequest) => Promise<TeamInviteResponse>;

  // 프로젝트 서버 관리
  loadProjectServers: (projectId: string, liveCheck?: boolean) => Promise<void>;
  refreshProjectServers: (projectId: string) => Promise<any>;
  refreshSingleProjectServer: (projectId: string, serverId: string) => Promise<any>;
  addProjectServer: (projectId: string, serverData: any) => Promise<ProjectServer>;
  toggleProjectServer: (projectId: string, serverId: string) => Promise<any>;
  restartProjectServer: (projectId: string, serverId: string) => Promise<any>;

  // 프로젝트 도구 관리
  loadProjectTools: (projectId: string) => Promise<void>;

  // 프로젝트 활동 관리
  loadProjectActivities: (projectId: string, limit?: number) => Promise<void>;
  loadRecentProjectActivities: (projectId: string) => Promise<ProjectActivity[]>;

  // 프로젝트 API 키 관리
  loadProjectApiKeys: (projectId: string) => Promise<void>;
  createProjectApiKey: (projectId: string, data: CreateProjectApiKeyRequest) => Promise<ProjectApiKey & { api_key: string }>;
  deleteProjectApiKey: (projectId: string, keyId: string) => Promise<void>;

  // Cline 설정
  getProjectClineConfig: (projectId: string, unified?: boolean) => Promise<ProjectClineConfig>;

  // 프로젝트 컨텍스트 관리
  getCurrentUserRole: (projectId: string) => ProjectRole | null;
  checkUserPermission: (projectId: string, requiredRole: ProjectRole) => boolean;
  setCurrentProject: (project: Project) => Promise<void>;
  loadUserProjects: () => Promise<void>;
  initializeFromLocalStorage: () => void;
  saveToLocalStorage: () => void;

  // 유틸리티
  clearError: () => void;
  reset: () => void;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  // 초기 상태
  projects: [],
  selectedProject: null,
  projectServers: [],
  projectMembers: [],
  projectApiKeys: [],
  projectTools: [],
  projectActivities: [],
  availableTeams: [],
  isLoading: false,
  isLoadingAvailableTeams: false,
  error: null,

  // 프로젝트 컨텍스트 초기 상태
  currentProject: null,
  userProjects: [],
  currentUserRole: null,
  lastSelectedProjectId: null,
  
  // 프로젝트 전환 로딩 초기 상태
  isProjectSwitching: false,
  switchingFromProject: null,
  switchingToProject: null,

  // 프로젝트 관리
  loadProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/projects', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load projects: ${response.statusText}`);
      }
      
      const projects = await response.json();
      set({ projects, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load projects',
        isLoading: false 
      });
    }
  },

  createProject: async (data: CreateProjectRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create project: ${response.statusText}`);
      }
      
      const project = await response.json();
      
      // 프로젝트 목록에 추가
      set(state => ({
        projects: [...state.projects, project],
        isLoading: false
      }));
      
      return project;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create project',
        isLoading: false 
      });
      throw error;
    }
  },

  loadProject: async (projectId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get project: ${response.statusText}`);
      }
      
      const project = await response.json();
      
      // 백엔드에서 직접 제공하는 user_role 사용
      const currentUserRole = project.user_role || null;
      
      // 디버깅을 위한 로그
      console.log('🔐 [ProjectStore] loadProject:', {
        projectId,
        user_role: project.user_role,
        currentUserRole,
        members: project.members?.length || 0
      });
      
      // 기존 방식 fallback (user_role이 없을 경우)
      if (!currentUserRole && project.members) {
        const currentUserMember = project.members?.find(
          (member: any) => member.is_current_user
        );
        if (currentUserMember) {
          console.log('🔐 [ProjectStore] Fallback to member search, found:', currentUserMember.role);
          set({ 
            selectedProject: project, 
            currentUserRole: currentUserMember.role, 
            isLoading: false 
          });
          return project;
        }
      }
      
      set({ 
        selectedProject: project, 
        currentUserRole, 
        isLoading: false 
      });
      return project;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to get project',
        isLoading: false 
      });
      throw error;
    }
  },

  updateProject: async (projectId: string, data: UpdateProjectRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update project: ${response.statusText}`);
      }
      
      const updatedProject = await response.json();
      
      // 프로젝트 목록 업데이트
      set(state => ({
        projects: state.projects.map(p => p.id === projectId ? updatedProject : p),
        selectedProject: state.selectedProject?.id === projectId 
          ? { ...state.selectedProject, ...updatedProject }
          : state.selectedProject,
        isLoading: false
      }));
      
      return updatedProject;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update project',
        isLoading: false 
      });
      throw error;
    }
  },

  deleteProject: async (projectId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete project: ${response.statusText}`);
      }
      
      // 프로젝트 목록에서 제거
      set(state => ({
        projects: state.projects.filter(p => p.id !== projectId),
        selectedProject: state.selectedProject?.id === projectId ? null : state.selectedProject,
        isLoading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete project',
        isLoading: false 
      });
      throw error;
    }
  },

  setSelectedProject: (project: ProjectDetail | null) => {
    set({ selectedProject: project });
  },

  // 프로젝트 멤버 관리
  loadProjectMembers: async (projectId: string) => {
    console.log('📞 API 호출: loadProjectMembers 시작', projectId);
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        credentials: 'include',
      });
      
      console.log('📞 API 응답: /api/projects/members', response.status, response.ok);
      
      if (!response.ok) {
        throw new Error(`Failed to load project members: ${response.statusText}`);
      }
      
      const members = await response.json();
      console.log('📞 API 데이터: loadProjectMembers 결과', members.length, '명');
      set({ projectMembers: members, isLoading: false });
    } catch (error) {
      console.error('📞 API 오류: loadProjectMembers', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load project members',
        isLoading: false 
      });
    }
  },

  addProjectMember: async (projectId: string, data: AddProjectMemberRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to add project member: ${response.statusText}`);
      }
      
      const member = await response.json();
      
      // 멤버 목록에 추가
      set(state => ({
        projectMembers: [...state.projectMembers, member],
        isLoading: false
      }));
      
      return member;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to add project member',
        isLoading: false 
      });
      throw error;
    }
  },

  updateProjectMember: async (projectId: string, memberId: string, data: UpdateProjectMemberRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update project member: ${response.statusText}`);
      }
      
      const updatedMember = await response.json();
      
      // 멤버 목록 업데이트
      set(state => ({
        projectMembers: state.projectMembers.map(m => m.id === memberId ? updatedMember : m),
        isLoading: false
      }));
      
      return updatedMember;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update project member',
        isLoading: false 
      });
      throw error;
    }
  },

  removeProjectMember: async (projectId: string, memberId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to remove project member: ${response.statusText}`);
      }
      
      // 멤버 목록에서 제거
      set(state => ({
        projectMembers: state.projectMembers.filter(m => m.id !== memberId),
        isLoading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to remove project member',
        isLoading: false 
      });
      throw error;
    }
  },

  // 프로젝트 서버 관리 (기본적으로 실시간 상태 확인 활성화)
  loadProjectServers: async (projectId: string, liveCheck: boolean = true) => {
    const mode = liveCheck ? '실시간' : '빠른 캐시';
    console.log(`📞 API 호출: loadProjectServers 시작 (${mode} 모드)`, projectId);
    set({ isLoading: true, error: null });
    try {
      const url = new URL(`/api/projects/${projectId}/servers`, window.location.origin);
      if (liveCheck) {
        url.searchParams.set('live_check', 'true');
      }
      
      const response = await fetch(url.toString(), {
        credentials: 'include',
      });
      
      console.log(`📞 API 응답: /api/projects/servers (${mode} 모드)`, response.status, response.ok);
      
      if (!response.ok) {
        throw new Error(`Failed to load project servers: ${response.statusText}`);
      }
      
      const servers = await response.json();
      console.log(`📞 API 데이터: loadProjectServers 결과 (${mode})`, servers.length, '개');
      
      // 🕐 DEBUG: 타임스탬프 디버깅 로그 추가
      console.log('🕐 [TIMESTAMP DEBUG] Raw API response for servers:', servers);
      if (servers.length > 0) {
        const firstServer = servers[0];
        console.log('🕐 [TIMESTAMP DEBUG] First server data:', {
          id: firstServer.id,
          name: firstServer.name,
          last_connected: firstServer.last_connected,
          created_at: firstServer.created_at,
          updated_at: firstServer.updated_at
        });
        
        // JavaScript Date 객체로 변환 테스트
        if (firstServer.last_connected) {
          const dateObj = new Date(firstServer.last_connected);
          console.log('🕐 [TIMESTAMP DEBUG] last_connected parsing test:', {
            raw: firstServer.last_connected,
            parsed: dateObj,
            toISOString: dateObj.toISOString(),
            toLocaleString: dateObj.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
            getTime: dateObj.getTime(),
            hasTimezone: firstServer.last_connected.includes('Z') || firstServer.last_connected.includes('+')
          });
        }
      }
      
      set({ projectServers: servers, isLoading: false });
    } catch (error) {
      console.error('📞 API 오류: loadProjectServers', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load project servers',
        isLoading: false 
      });
    }
  },

  // 서버 상태 새로고침 (실시간 확인)
  refreshProjectServers: async (projectId: string) => {
    console.log('🔄 서버 상태 새로고침 시작', projectId);
    try {
      const response = await fetch(`/api/projects/${projectId}/servers/refresh-status`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '서버 상태 새로고침 실패');
      }

      const data = await response.json();
      console.log('✅ 전체 서버 새로고침 완료:', data);
      
      // 새로고침 후 최신 데이터 다시 로드
      await get().loadProjectServers(projectId);
      
      return data;
    } catch (error) {
      console.error('❌ 서버 새로고침 오류:', error);
      throw error;
    }
  },

  // 개별 서버 새로고침
  refreshSingleProjectServer: async (projectId: string, serverId: string) => {
    console.log('🔄 개별 서버 새로고침 시작:', serverId);
    try {
      const response = await fetch(`/api/projects/${projectId}/servers/${serverId}/refresh-status`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '서버 새로고침 실패');
      }

      const data = await response.json();
      console.log('✅ 개별 서버 새로고침 완료:', data);
      
      // 새로고침 후 최신 데이터 다시 로드
      await get().loadProjectServers(projectId);
      
      return data;
    } catch (error) {
      console.error('❌ 개별 서버 새로고침 오류:', error);
      throw error;
    }
  },

  addProjectServer: async (projectId: string, serverData: any) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/projects/${projectId}/servers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(serverData),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to add project server: ${response.statusText}`);
      }
      
      const server = await response.json();
      
      // 서버 목록에 추가
      set(state => ({
        projectServers: [...state.projectServers, server],
        isLoading: false
      }));
      
      return server;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to add project server',
        isLoading: false 
      });
      throw error;
    }
  },

  // 프로젝트 서버 제어
  toggleProjectServer: async (projectId: string, serverId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/projects/${projectId}/servers/${serverId}/toggle`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to toggle project server: ${response.statusText}`);
      }
      
      const updatedServer = await response.json();
      
      // 서버 목록 업데이트
      set(state => ({
        projectServers: state.projectServers.map(s => 
          s.id === serverId ? updatedServer : s
        ),
        isLoading: false
      }));
      
      return updatedServer;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to toggle project server',
        isLoading: false 
      });
      throw error;
    }
  },

  restartProjectServer: async (projectId: string, serverId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/projects/${projectId}/servers/${serverId}/restart`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to restart project server: ${response.statusText}`);
      }
      
      const result = await response.json();
      set({ isLoading: false });
      return result;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to restart project server',
        isLoading: false 
      });
      throw error;
    }
  },

  // 프로젝트 도구 관리
  loadProjectTools: async (projectId: string) => {
    console.log('📞 API 호출: loadProjectTools 시작', projectId);
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/projects/${projectId}/servers`, {
        credentials: 'include',
      });
      
      console.log('📞 API 응답: /api/projects/servers (for tools)', response.status, response.ok);
      
      if (!response.ok) {
        throw new Error(`Failed to load project servers: ${response.statusText}`);
      }
      
      const servers = await response.json();
      console.log('📞 API 데이터: 서버 목록 (도구 로드용)', servers.length, '개');
      
      // 각 서버의 도구들을 로드
      const allTools: Tool[] = [];
      
      for (const server of servers) {
        if (!server.is_enabled) {
          console.log('⏭️ 비활성 서버 스킵:', server.id);
          continue; // 비활성화된 서버는 스킵
        }
        
        try {
          console.log('📞 서버별 도구 API 호출:', server.id);
          const toolsResponse = await fetch(`/api/projects/${projectId}/servers/${server.id}/tools`, {
            credentials: 'include',
          });
          
          console.log('📞 서버별 도구 API 응답:', server.id, toolsResponse.status, toolsResponse.ok);
          
          if (toolsResponse.ok) {
            const toolsData = await toolsResponse.json();
            // API가 { tools: [...] } 형태로 반환
            const tools = toolsData.tools || toolsData || [];
            console.log('📞 서버별 도구 데이터:', server.id, tools.length, '개');
            allTools.push(...tools);
          }
        } catch (error) {
          console.warn(`📞 서버별 도구 로드 실패 ${server.id}:`, error);
          // 개별 서버 도구 로드 실패는 전체 프로세스를 중단하지 않음
        }
      }
      
      console.log('📞 API 데이터: loadProjectTools 최종 결과', allTools.length, '개 도구');
      set({ projectTools: allTools, isLoading: false });
    } catch (error) {
      console.error('📞 API 오류: loadProjectTools', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load project tools',
        isLoading: false 
      });
    }
  },

  // 프로젝트 활동 관리
  loadProjectActivities: async (projectId: string, limit: number = 50) => {
    console.log('📞 API 호출: loadProjectActivities 시작', projectId, 'limit:', limit);
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/projects/${projectId}/activities?limit=${limit}`, {
        credentials: 'include',
      });
      
      console.log('📞 API 응답: /api/projects/activities', response.status, response.ok);
      
      if (!response.ok) {
        throw new Error(`Failed to load project activities: ${response.statusText}`);
      }
      
      const activities = await response.json();
      console.log('📞 API 데이터: loadProjectActivities 결과', activities.length, '개');
      set({ projectActivities: activities, isLoading: false });
    } catch (error) {
      console.error('📞 API 오류: loadProjectActivities', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load project activities',
        isLoading: false 
      });
    }
  },

  loadRecentProjectActivities: async (projectId: string): Promise<ProjectActivity[]> => {
    console.log('📞 API 호출: loadRecentProjectActivities 시작 (최근 5개)', projectId);
    try {
      const response = await fetch(`/api/projects/${projectId}/activities?limit=5`, {
        credentials: 'include',
      });
      
      console.log('📞 API 응답: /api/projects/activities (최근)', response.status, response.ok);
      
      if (!response.ok) {
        throw new Error(`Failed to load recent activities: ${response.statusText}`);
      }
      
      const activities = await response.json();
      console.log('📞 API 데이터: loadRecentProjectActivities 결과', activities.length, '개');
      return activities;
    } catch (error) {
      console.error('📞 API 오류: loadRecentProjectActivities', error);
      return [];
    }
  },

  // 프로젝트 API 키 관리
  loadProjectApiKeys: async (projectId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/projects/${projectId}/api-keys`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load project API keys: ${response.statusText}`);
      }
      
      const apiKeys = await response.json();
      set({ projectApiKeys: apiKeys, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load project API keys',
        isLoading: false 
      });
    }
  },

  createProjectApiKey: async (projectId: string, data: CreateProjectApiKeyRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/projects/${projectId}/api-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create project API key: ${response.statusText}`);
      }
      
      const apiKey = await response.json();
      
      // API 키 목록에 추가 (실제 키 값 제외)
      const { api_key, ...keyInfo } = apiKey;
      set(state => ({
        projectApiKeys: [...state.projectApiKeys, keyInfo],
        isLoading: false
      }));
      
      return apiKey; // 실제 키 값 포함하여 반환
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create project API key',
        isLoading: false 
      });
      throw error;
    }
  },

  deleteProjectApiKey: async (projectId: string, keyId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/projects/${projectId}/api-keys/${keyId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete project API key: ${response.statusText}`);
      }
      
      // API 키 목록에서 제거
      set(state => ({
        projectApiKeys: state.projectApiKeys.filter(k => k.id !== keyId),
        isLoading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete project API key',
        isLoading: false 
      });
      throw error;
    }
  },

  // MCP 설정 (Claude, Cursor 등)
  getProjectClineConfig: async (projectId: string, unified: boolean = false) => {
    set({ isLoading: true, error: null });
    try {
      const url = new URL(`/api/projects/${projectId}/cline-config`, window.location.origin);
      if (unified) {
        url.searchParams.set('unified', 'true');
      }
      
      const response = await fetch(url.toString(), {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get project MCP config: ${response.statusText}`);
      }
      
      const config = await response.json();
      set({ isLoading: false });
      return config;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to get project MCP config',
        isLoading: false 
      });
      throw error;
    }
  },

  // 프로젝트 컨텍스트 관리
  getCurrentUserRole: (projectId: string) => {
    const state = get();
    
    // selectedProject에서 user_role 직접 확인 (우선순위 1)
    if (state.selectedProject?.id === projectId && state.selectedProject.user_role) {
      console.log('🔐 [getCurrentUserRole] Using project.user_role:', state.selectedProject.user_role);
      return state.selectedProject.user_role;
    }
    
    // currentUserRole 사용 (우선순위 2)
    if (state.currentUserRole && state.selectedProject?.id === projectId) {
      console.log('🔐 [getCurrentUserRole] Using currentUserRole:', state.currentUserRole);
      return state.currentUserRole;
    }
    
    // selectedProject members에서 확인 (fallback)
    if (state.selectedProject?.id === projectId) {
      const currentUserMember = state.selectedProject.members?.find(
        member => member.is_current_user
      );
      if (currentUserMember?.role) {
        console.log('🔐 [getCurrentUserRole] Fallback to member search:', currentUserMember.role);
        return currentUserMember.role;
      }
    }
    
    // projectMembers에서 현재 사용자의 역할 확인 (last resort)
    const currentUserMember = state.projectMembers.find(
      member => member.is_current_user
    );
    if (currentUserMember?.role) {
      console.log('🔐 [getCurrentUserRole] Last resort member search:', currentUserMember.role);
      return currentUserMember.role;
    }
    
    console.log('🔐 [getCurrentUserRole] No role found for project:', projectId);
    return null;
  },

  checkUserPermission: (projectId: string, requiredRole: ProjectRole) => {
    const getCurrentUserRole = get().getCurrentUserRole;
    const userRole = getCurrentUserRole(projectId);
    
    if (!userRole) return false;
    
    const roleHierarchy = {
      [ProjectRole.REPORTER]: 0,
      [ProjectRole.DEVELOPER]: 1,
      [ProjectRole.OWNER]: 2,
    };
    
    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  },

  setCurrentProject: async (project: Project) => {
    const state = get();
    
    // 전환 로딩 시작
    set({
      isProjectSwitching: true,
      switchingFromProject: state.currentProject,
      switchingToProject: project,
    });
    
    try {
      // 짧은 지연으로 로딩 애니메이션 표시
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 현재 사용자의 역할 조회
      const userRole = state.getCurrentUserRole(project.id);
      
      set({
        currentProject: project,
        currentUserRole: userRole,
        lastSelectedProjectId: project.id,
        isProjectSwitching: false,
        switchingFromProject: null,
        switchingToProject: null,
      });
      
      // 로컬 스토리지에 저장
      get().saveToLocalStorage();
    } catch (error) {
      // 전환 실패 시 로딩 상태 해제
      set({
        isProjectSwitching: false,
        switchingFromProject: null,
        switchingToProject: null,
      });
      throw error;
    }
  },

  loadUserProjects: async () => {
    // 기존 loadProjects와 동일하지만 userProjects에 저장
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/projects', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load user projects: ${response.statusText}`);
      }
      
      const projects = await response.json();
      set({ 
        userProjects: projects,
        projects: projects, // 호환성을 위해 projects에도 저장
        isLoading: false 
      });
      
      // 마지막 선택된 프로젝트가 있다면 자동 설정
      const state = get();
      if (state.lastSelectedProjectId && projects.length > 0) {
        const lastProject = projects.find((p: Project) => p.id === state.lastSelectedProjectId);
        if (lastProject) {
          state.setCurrentProject(lastProject);
        } else {
          // 첫 번째 프로젝트를 기본 선택
          state.setCurrentProject(projects[0]);
        }
      } else if (projects.length > 0) {
        // 첫 번째 프로젝트를 기본 선택
        state.setCurrentProject(projects[0]);
      }
      
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load user projects',
        isLoading: false 
      });
    }
  },

  initializeFromLocalStorage: () => {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem('mcp-orch-project-context');
      if (stored) {
        const data = JSON.parse(stored);
        set({
          lastSelectedProjectId: data.lastSelectedProjectId || null,
        });
      }
    } catch (error) {
      console.warn('Failed to initialize from localStorage:', error);
    }
  },

  saveToLocalStorage: () => {
    if (typeof window === 'undefined') return;
    
    try {
      const state = get();
      const data = {
        lastSelectedProjectId: state.lastSelectedProjectId,
      };
      localStorage.setItem('mcp-orch-project-context', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  },

  // 유틸리티
  clearError: () => set({ error: null }),
  
  reset: () => set({
    projects: [],
    selectedProject: null,
    projectServers: [],
    projectMembers: [],
    projectApiKeys: [],
    projectTools: [],
    projectActivities: [],
    availableTeams: [],
    isLoading: false,
    error: null,
  }),

  // 팀 관련 함수들
  loadAvailableTeams: async (projectId: string) => {
    try {
      set({ isLoadingAvailableTeams: true, error: null });
      
      const response = await fetch(`/api/projects/${projectId}/available-teams`);
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Failed to load available teams');
      }
      
      const availableTeams = await response.json();
      
      set({ 
        availableTeams,
        isLoadingAvailableTeams: false 
      });
    } catch (error) {
      console.error('Error loading available teams:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load available teams',
        isLoadingAvailableTeams: false 
      });
    }
  },

  inviteTeamToProject: async (projectId: string, data: TeamInviteRequest): Promise<TeamInviteResponse> => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await fetch(`/api/projects/${projectId}/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Failed to invite team');
      }
      
      const result = await response.json();
      
      // 멤버 목록 새로고침
      const { loadProjectMembers } = get();
      await loadProjectMembers(projectId);
      
      set({ isLoading: false });
      
      return result;
    } catch (error) {
      console.error('Error inviting team:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to invite team',
        isLoading: false 
      });
      throw error;
    }
  },
}));
