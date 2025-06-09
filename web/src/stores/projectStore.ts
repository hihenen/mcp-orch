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
  ProjectRole
} from '@/types/project';

interface ProjectStore {
  // 상태
  projects: Project[];
  selectedProject: ProjectDetail | null;
  projectServers: ProjectServer[];
  projectMembers: ProjectMember[];
  projectApiKeys: ProjectApiKey[];
  isLoading: boolean;
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

  // 프로젝트 서버 관리
  loadProjectServers: (projectId: string) => Promise<void>;
  addProjectServer: (projectId: string, serverData: any) => Promise<ProjectServer>;
  toggleProjectServer: (projectId: string, serverId: string) => Promise<any>;
  restartProjectServer: (projectId: string, serverId: string) => Promise<any>;

  // 프로젝트 API 키 관리
  loadProjectApiKeys: (projectId: string) => Promise<void>;
  createProjectApiKey: (projectId: string, data: CreateProjectApiKeyRequest) => Promise<ProjectApiKey & { api_key: string }>;
  deleteProjectApiKey: (projectId: string, keyId: string) => Promise<void>;

  // Cline 설정
  getProjectClineConfig: (projectId: string) => Promise<ProjectClineConfig>;

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
  isLoading: false,
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
      set({ selectedProject: project, isLoading: false });
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
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load project members: ${response.statusText}`);
      }
      
      const members = await response.json();
      set({ projectMembers: members, isLoading: false });
    } catch (error) {
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

  // 프로젝트 서버 관리
  loadProjectServers: async (projectId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/projects/${projectId}/servers`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load project servers: ${response.statusText}`);
      }
      
      const servers = await response.json();
      set({ projectServers: servers, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load project servers',
        isLoading: false 
      });
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

  // 프로젝트 API 키 관리
  loadProjectApiKeys: async (projectId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/projects/${projectId}/api-keys`, {
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
      const response = await fetch(`/projects/${projectId}/api-keys`, {
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
      const response = await fetch(`/projects/${projectId}/api-keys/${keyId}`, {
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

  // Cline 설정
  getProjectClineConfig: async (projectId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/projects/${projectId}/cline-config`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get project Cline config: ${response.statusText}`);
      }
      
      const config = await response.json();
      set({ isLoading: false });
      return config;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to get project Cline config',
        isLoading: false 
      });
      throw error;
    }
  },

  // 프로젝트 컨텍스트 관리
  getCurrentUserRole: (projectId: string) => {
    const state = get();
    
    // selectedProject에서 현재 사용자의 역할 확인
    if (state.selectedProject?.id === projectId) {
      const currentUserMember = state.selectedProject.members?.find(
        member => member.is_current_user
      );
      return currentUserMember?.role || null;
    }
    
    // projectMembers에서 현재 사용자의 역할 확인
    const currentUserMember = state.projectMembers.find(
      member => member.is_current_user
    );
    return currentUserMember?.role || null;
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
    isLoading: false,
    error: null,
  }),
}));
