'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { TeamLayout } from '@/components/teams/TeamLayout';
import { 
  Users, 
  Server, 
  Wrench, 
  Key,
  Activity
} from 'lucide-react';

interface TeamMember {
  user_id: string;
  name: string;
  email: string;
  role: string;
  joined_at: string;
}

interface TeamServer {
  id: string;
  name: string;
  description?: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  disabled: boolean;
  status: string;
}

interface TeamTool {
  id: string;
  name: string;
  server_name: string;
  description?: string;
  usage_count: number;
}

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  is_active: boolean;
  expires_at?: string;
  created_at: string;
  last_used_at?: string;
}

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  user_name: string;
  timestamp: string;
}

interface Organization {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export default function TeamOverviewPage() {
  const params = useParams();
  const teamId = params.teamId as string;

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [servers, setServers] = useState<TeamServer[]>([]);
  const [tools, setTools] = useState<TeamTool[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (teamId) {
      loadTeamData();
    }
  }, [teamId]);

  const loadTeamData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadOrganization(),
        loadMembers(),
        loadServers(),
        loadTools(),
        loadApiKeys(),
        loadActivities()
      ]);
    } catch (error) {
      console.error('Failed to load team data:', error);
    } finally {
      setLoading(false);
    }
  };

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
            user_id: '1',
            name: 'John Doe',
            email: 'john.doe@example.com',
            role: 'owner',
            joined_at: '2025-06-01T10:00:00Z'
          },
          {
            user_id: '2', 
            name: 'Jane Smith',
            email: 'jane.smith@example.com',
            role: 'developer',
            joined_at: '2025-06-02T11:30:00Z'
          },
          {
            user_id: '3',
            name: 'Bob Wilson',
            email: 'bob.wilson@example.com', 
            role: 'reporter',
            joined_at: '2025-06-03T09:00:00Z'
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  if (loading) {
    return (
      <TeamLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-muted-foreground">팀 정보를 불러오는 중...</p>
          </div>
        </div>
      </TeamLayout>
    );
  }

  return (
    <TeamLayout>
      <div className="space-y-6">
        {/* 헤더 섹션 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">팀 개요</h3>
          </div>
          <p className="text-sm text-blue-700">
            {organization?.description || '팀의 전반적인 현황과 주요 정보를 한눈에 확인할 수 있습니다.'}
          </p>
        </div>

        {/* 통계 카드들 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Users className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{members.length}</p>
                  <p className="text-sm text-muted-foreground">멤버</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Server className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{servers.length}</p>
                  <p className="text-sm text-muted-foreground">서버</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Wrench className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{tools.length}</p>
                  <p className="text-sm text-muted-foreground">도구</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Key className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{apiKeys.length}</p>
                  <p className="text-sm text-muted-foreground">API 키</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 팀 정보 카드 */}
        {organization && (
          <Card>
            <CardHeader>
              <CardTitle>팀 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>팀 이름</Label>
                  <p className="text-sm font-medium">{organization.name}</p>
                </div>
                <div>
                  <Label>생성일</Label>
                  <p className="text-sm font-medium">{formatDate(organization.created_at)}</p>
                </div>
                <div className="md:col-span-2">
                  <Label>설명</Label>
                  <p className="text-sm font-medium">{organization.description || '설명이 없습니다.'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 최근 활동 */}
        <Card>
          <CardHeader>
            <CardTitle>최근 활동</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.user_name} • {formatDate(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              {activities.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  최근 활동이 없습니다.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </TeamLayout>
  );
}