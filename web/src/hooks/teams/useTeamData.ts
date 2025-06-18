import { useState, useEffect } from 'react';

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

  const loadOrganization = async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const orgData = await response.json();
        setOrganization(orgData);
      } else {
        // 데모 데이터
        setOrganization({
          id: teamId,
          name: "Development Team",
          description: "소프트웨어 개발 팀",
          created_at: "2025-06-01T10:00:00Z"
        });
      }
    } catch (error) {
      console.error('Failed to load organization:', error);
    }
  };

  const loadMembers = async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}/members`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const memberData = await response.json();
        setMembers(memberData);
      } else {
        // 데모 데이터
        const demoMembers: TeamMember[] = [
          {
            id: '1',
            user_id: '1',
            name: 'John Doe',
            email: 'john.doe@example.com',
            role: 'owner',
            joined_at: '2025-06-01T10:00:00Z',
            is_current_user: true
          },
          {
            id: '2',
            user_id: '2', 
            name: 'Jane Smith',
            email: 'jane.smith@example.com',
            role: 'developer',
            joined_at: '2025-06-02T11:30:00Z',
            is_current_user: false
          },
          {
            id: '3',
            user_id: '3',
            name: 'Bob Wilson',
            email: 'bob.wilson@example.com', 
            role: 'reporter',
            joined_at: '2025-06-03T09:00:00Z',
            is_current_user: false
          }
        ];
        setMembers(demoMembers);
      }
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  };

  const loadServers = async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}/servers`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const serverData = await response.json();
        setServers(serverData);
      } else {
        // 데모 데이터
        const demoServers: TeamServer[] = [
          {
            id: '1',
            name: 'Excel Server',
            description: 'Excel 파일 처리 서버',
            command: 'node',
            args: ['excel-server.js'],
            env: {},
            disabled: false,
            status: 'running'
          },
          {
            id: '2',
            name: 'AWS Server', 
            description: 'AWS 리소스 관리 서버',
            command: 'python',
            args: ['aws-server.py'],
            env: {},
            disabled: false,
            status: 'running'
          }
        ];
        setServers(demoServers);
      }
    } catch (error) {
      console.error('Failed to load servers:', error);
    }
  };

  const loadTools = async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}/tools`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const toolData = await response.json();
        setTools(toolData);
      } else {
        // 데모 데이터
        const demoTools: TeamTool[] = [
          {
            id: '1',
            name: 'Read Excel Sheet',
            server_name: 'Excel Server',
            description: 'Read data from Excel files',
            usage_count: 25
          },
          {
            id: '2',
            name: 'List S3 Buckets',
            server_name: 'AWS Server',
            description: 'List all S3 buckets in the account',
            usage_count: 12
          }
        ];
        setTools(demoTools);
      }
    } catch (error) {
      console.error('Failed to load tools:', error);
    }
  };

  const loadApiKeys = async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}/api-keys`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const keyData = await response.json();
        setApiKeys(keyData);
      } else {
        // 데모 데이터
        const demoKeys: ApiKey[] = [
          {
            id: '1',
            name: 'Development Key',
            key_prefix: 'mcp_abc123',
            is_active: true,
            expires_at: undefined,
            created_at: '2025-06-01T10:00:00Z',
            last_used_at: '2025-06-03T15:30:00Z'
          },
          {
            id: '2',
            name: 'Production Key', 
            key_prefix: 'mcp_def456',
            is_active: true,
            expires_at: '2025-12-31T23:59:59Z',
            created_at: '2025-06-02T14:00:00Z',
            last_used_at: undefined
          }
        ];
        setApiKeys(demoKeys);
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
    }
  };

  const loadActivities = async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}/activity`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const activityData = await response.json();
        setActivities(activityData);
      } else {
        // 데모 데이터
        const demoActivities: ActivityItem[] = [
          {
            id: '1',
            type: 'member_joined',
            description: 'Bob Wilson joined the team as Reporter',
            user_name: 'Bob Wilson',
            timestamp: '2025-06-03T09:00:00Z'
          },
          {
            id: '2',
            type: 'server_added',
            description: 'AWS Server was added to the team',
            user_name: 'John Doe',
            timestamp: '2025-06-02T16:30:00Z'
          },
          {
            id: '3',
            type: 'tool_executed',
            description: 'Read Excel Sheet tool was executed 5 times',
            user_name: 'Jane Smith',
            timestamp: '2025-06-02T14:20:00Z'
          }
        ];
        setActivities(demoActivities);
      }
    } catch (error) {
      console.error('Failed to load activities:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}/projects`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const projectData = await response.json();
        setProjects(projectData);
      } else {
        // 데모 데이터
        const demoProjects: Project[] = [
          {
            id: '1',
            name: 'MCP Integration',
            description: 'MCP 서버 통합 프로젝트',
            created_at: '2025-06-01T10:00:00Z',
            member_count: 3,
            server_count: 2
          },
          {
            id: '2',
            name: 'Data Analysis',
            description: '데이터 분석 자동화 프로젝트',
            created_at: '2025-06-02T14:00:00Z',
            member_count: 2,
            server_count: 1
          },
          {
            id: '3',
            name: 'AWS Automation',
            description: 'AWS 리소스 자동화',
            created_at: '2025-06-03T09:00:00Z',
            member_count: 4,
            server_count: 3
          }
        ];
        setProjects(demoProjects);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const loadAllData = async () => {
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
  };

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