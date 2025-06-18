import { useState, useEffect, useCallback } from 'react';

export interface TeamMember {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: string;
  joined_at: string;
  is_current_user?: boolean;
  avatar_url?: string;
}

export interface TeamServer {
  id: string;
  name: string;
  description?: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  disabled: boolean;
  status: string;
}

export interface TeamTool {
  id: string;
  name: string;
  server_name: string;
  description?: string;
  usage_count: number;
}

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  is_active: boolean;
  expires_at?: string;
  created_at: string;
  last_used_at?: string;
}

export interface ActivityItem {
  id: string;
  type: string;
  description: string;
  user_name: string;
  timestamp: string;
}

export interface Organization {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  member_count: number;
  server_count: number;
}

export const useTeamData = (teamId: string) => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [servers, setServers] = useState<TeamServer[]>([]);
  const [tools, setTools] = useState<TeamTool[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  const loadOrganization = useCallback(async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const orgData = await response.json();
        setOrganization(orgData);
      } else {
        // 최소한의 기본 데이터만 설정 (실제 팀 이름 유지)
        setOrganization({
          id: teamId,
          name: "팀", // 실제 팀 이름은 UI에서 처리
          description: "",
          created_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Failed to load organization:', error);
      // 에러 시 null로 설정하여 빈 상태 표시
      setOrganization(null);
    }
  }, [teamId]);

  const loadMembers = useCallback(async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}/members`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const memberData = await response.json();
        setMembers(memberData);
      } else {
        // 현재 사용자만 포함하는 최소 데이터
        const demoMembers: TeamMember[] = [
          {
            id: '1',
            user_id: '1',
            name: '나',
            email: 'current.user@example.com',
            role: 'owner',
            joined_at: new Date().toISOString(),
            is_current_user: true
          }
        ];
        setMembers(demoMembers);
      }
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  }, [teamId]);

  const loadServers = useCallback(async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}/servers`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const serverData = await response.json();
        setServers(serverData);
      } else {
        // 빈 상태로 설정 (서버가 없는 것이 더 현실적)
        setServers([]);
      }
    } catch (error) {
      console.error('Failed to load servers:', error);
    }
  }, [teamId]);

  const loadTools = useCallback(async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}/tools`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const toolData = await response.json();
        setTools(toolData);
      } else {
        // 빈 상태로 설정 (도구가 없는 것이 더 현실적)
        setTools([]);
      }
    } catch (error) {
      console.error('Failed to load tools:', error);
    }
  }, [teamId]);

  const loadApiKeys = useCallback(async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}/api-keys`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const keyData = await response.json();
        setApiKeys(keyData);
      } else {
        // 빈 상태로 설정 (API 키가 없는 것이 더 현실적)
        setApiKeys([]);
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
    }
  }, [teamId]);

  const loadActivities = useCallback(async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}/activity`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const activityData = await response.json();
        setActivities(activityData);
      } else {
        // 팀 생성 활동만 표시
        const demoActivities: ActivityItem[] = [
          {
            id: '1',
            type: 'settings_changed',
            description: '팀이 생성되었습니다',
            user_name: '나',
            timestamp: new Date().toISOString()
          }
        ];
        setActivities(demoActivities);
      }
    } catch (error) {
      console.error('Failed to load activities:', error);
    }
  }, [teamId]);

  const loadProjects = useCallback(async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}/projects`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const projectData = await response.json();
        setProjects(projectData);
      } else {
        // 빈 상태로 설정 (프로젝트가 없는 것이 더 현실적)
        setProjects([]);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  }, [teamId]);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadOrganization(),
        loadMembers(),
        loadServers(),
        loadTools(),
        loadApiKeys(),
        loadActivities(),
        loadProjects()
      ]);
    } catch (error) {
      console.error('Failed to load team data:', error);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  return {
    // 데이터
    organization,
    members,
    servers,
    tools,
    apiKeys,
    activities,
    projects,
    loading,
    
    // 개별 로드 함수
    loadOrganization,
    loadMembers,
    loadServers,
    loadTools,
    loadApiKeys,
    loadActivities,
    loadProjects,
    loadAllData,
    
    // 상태 업데이트 함수
    setMembers,
    setServers,
    setTools,
    setApiKeys,
    setActivities,
    setProjects
  };
};