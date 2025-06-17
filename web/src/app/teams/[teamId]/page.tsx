'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useProjectStore } from '@/stores/projectStore';
import { Project } from '@/types/project';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Server, 
  Wrench, 
  Activity, 
  Settings, 
  Key, 
  Plus, 
  UserPlus, 
  Copy, 
  Download, 
  Trash2, 
  Edit,
  BarChart3,
  Calendar,
  Mail,
  Shield,
  AlertTriangle,
  FolderOpen,
  MoreHorizontal,
  Crown,
  Code,
  FileText,
  ChevronDown
} from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  member_count?: number;
}

interface Member {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: 'owner' | 'developer' | 'reporter';
  joined_at: string;
  avatar_url?: string;
  is_current_user?: boolean;
}

interface TeamServer {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  tool_count: number;
  last_used?: string;
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
  expires_at: string | null;
  created_at: string;
  last_used_at: string | null;
}

interface ActivityItem {
  id: string;
  type: 'member_joined' | 'member_left' | 'server_added' | 'server_removed' | 'tool_executed' | 'settings_changed';
  description: string;
  user_name: string;
  timestamp: string;
}

export default function TeamDetailPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const { data: session } = useSession();
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [servers, setServers] = useState<TeamServer[]>([]);
  const [tools, setTools] = useState<TeamTool[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<'owner' | 'developer' | 'reporter'>('developer');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // 프로젝트 관련 상태
  const { projects, loadProjects, createProject, loading: projectLoading } = useProjectStore();
  const [createProjectDialog, setCreateProjectDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectSlug, setNewProjectSlug] = useState('');

  // 다이얼로그 상태
  const [inviteMemberDialog, setInviteMemberDialog] = useState(false);
  const [createApiKeyDialog, setCreateApiKeyDialog] = useState(false);
  const [editTeamDialog, setEditTeamDialog] = useState(false);

  // 폼 상태
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'developer' | 'reporter'>('developer');
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamDescription, setEditTeamDescription] = useState('');
  
  // 멤버 관리 상태
  const [memberFilter, setMemberFilter] = useState('');

  useEffect(() => {
    if (teamId) {
      loadTeamData();
      loadProjects(); // 프로젝트 데이터 로드
    }
  }, [teamId, loadProjects]);

  // 프로젝트 생성 핸들러
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      await createProject({
        name: newProjectName,
        description: newProjectDescription,
        slug: newProjectSlug || newProjectName.toLowerCase().replace(/\s+/g, '-')
      });
      
      // 다이얼로그 닫기 및 폼 초기화
      setCreateProjectDialog(false);
      setNewProjectName('');
      setNewProjectDescription('');
      setNewProjectSlug('');
      
      // 성공 알림 (향후 toast 추가 가능)
      console.log('프로젝트가 성공적으로 생성되었습니다.');
    } catch (error) {
      console.error('프로젝트 생성 실패:', error);
    }
  };

  // 프로젝트 이름 변경 시 슬러그 자동 생성
  const handleProjectNameChange = (name: string) => {
    setNewProjectName(name);
    if (!newProjectSlug) {
      setNewProjectSlug(name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
    }
  };

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
      // NextAuth JWT 토큰 가져오기
      const response = await fetch(`/api/teams/${teamId}`, {
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // 쿠키 포함
      });

      if (response.ok) {
        const org = await response.json();
        setOrganization(org);
        setEditTeamName(org.name);
        setEditTeamDescription(org.description || '');
        // 현재 사용자 역할 설정
        setCurrentUserRole(org.user_role || 'developer');
      } else {
        console.error('Failed to load team:', response.status, response.statusText);
        // 데모 데이터
        const demoOrg: Organization = {
          id: teamId,
          name: "Development Team",
          description: "Frontend and Backend development team",
          created_at: "2025-06-01T10:00:00Z",
          member_count: 3
        };
        setOrganization(demoOrg);
        setEditTeamName(demoOrg.name);
        setEditTeamDescription(demoOrg.description || '');
      }
    } catch (error) {
      console.error('Failed to load organization:', error);
    }
  };

  const loadMembers = async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}/members`, {
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const memberData = await response.json();
        setMembers(memberData);
        console.log('✅ Successfully loaded team members:', memberData);
        
        // 현재 사용자의 역할을 멤버 목록에서 찾아서 설정
        console.log('🔍 Session user email:', session?.user?.email);
        console.log('🔍 Member data:', memberData);
        
        // is_current_user 플래그를 사용해서 현재 사용자 찾기
        const currentUserMember = memberData.find((member: any) => 
          member.is_current_user === true
        );
        console.log('🔍 Found current user member:', currentUserMember);
        
        if (currentUserMember) {
          setCurrentUserRole(currentUserMember.role);
          console.log('✅ Set current user role:', currentUserMember.role);
        } else {
          console.log('❌ Current user not found in member list');
          // 이메일로 다시 시도
          const fallbackCurrentUser = memberData.find((member: Member) => 
            member.email === session?.user?.email
          );
          if (fallbackCurrentUser) {
            setCurrentUserRole(fallbackCurrentUser.role);
            console.log('✅ Set current user role (fallback):', fallbackCurrentUser.role);
          }
        }
      } else {
        console.error('Failed to load members:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        setMembers([]); // 빈 배열로 설정
      }
    } catch (error) {
      console.error('Failed to load members:', error);
      setMembers([]); // 빈 배열로 설정
    }
  };

  const loadServers = async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}/servers`, {
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const serverData = await response.json();
        setServers(serverData);
      } else {
        console.error('Failed to load servers:', response.status, response.statusText);
        // 데모 데이터
        const demoServers: TeamServer[] = [
          {
            id: 'excel-server',
            name: 'Excel Server',
            status: 'active',
            tool_count: 5,
            last_used: '2025-06-03T15:30:00Z'
          },
          {
            id: 'github-server',
            name: 'GitHub Server',
            status: 'active',
            tool_count: 8,
            last_used: '2025-06-03T14:20:00Z'
          },
          {
            id: 'aws-server',
            name: 'AWS Server',
            status: 'inactive',
            tool_count: 12,
            last_used: '2025-06-02T11:15:00Z'
          }
        ];
        setServers(demoServers);
      }
    } catch (error) {
      console.error('Failed to load servers:', error);
    }
  };

  const inviteMember = async () => {
    if (!inviteEmail.trim()) {
      alert('이메일을 입력해주세요.');
      return;
    }

    try {
      const response = await fetch(`/api/teams/${teamId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Member invited successfully:', result);
        
        // 성공 알림
        alert(`${inviteEmail}님을 ${inviteRole} 역할로 초대했습니다.`);
        
        // 다이얼로그 닫고 폼 리셋
        setInviteMemberDialog(false);
        setInviteEmail('');
        setInviteRole('developer');
        
        // 멤버 목록 새로고침
        loadMembers();
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to invite member:', errorText);
        alert(`멤버 초대에 실패했습니다: ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Error inviting member:', error);
      alert('멤버 초대 중 오류가 발생했습니다.');
    }
  };

  const loadTools = async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}/tools`, {
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const toolData = await response.json();
        setTools(toolData);
      } else {
        console.error('Failed to load tools:', response.status, response.statusText);
        // 데모 데이터
        const demoTools: TeamTool[] = [
          {
            id: 'excel_read_sheet',
            name: 'Read Excel Sheet',
            server_name: 'Excel Server',
            description: 'Read data from Excel sheets',
            usage_count: 45
          },
          {
            id: 'github_create_issue',
            name: 'Create GitHub Issue',
            server_name: 'GitHub Server',
            description: 'Create issues in GitHub repositories',
            usage_count: 23
          },
          {
            id: 'aws_list_buckets',
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
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const keyData = await response.json();
        setApiKeys(keyData);
      } else {
        console.error('Failed to load API keys:', response.status, response.statusText);
        // 데모 데이터
        const demoKeys: ApiKey[] = [
          {
            id: '1',
            name: 'Development Key',
            key_prefix: 'mcp_abc123',
            is_active: true,
            expires_at: null,
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
            last_used_at: null
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
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const activityData = await response.json();
        setActivities(activityData);
      } else {
        console.error('Failed to load activities:', response.status, response.statusText);
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

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner': return 'destructive';
      case 'developer': return 'default';
      case 'reporter': return 'secondary';
      default: return 'secondary';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return '🔴';
      case 'developer': return '🟡';
      case 'reporter': return '🔵';
      default: return '⚪';
    }
  };

  const canAccess = (requiredRole: 'owner' | 'developer' | 'reporter') => {
    const roleHierarchy = { owner: 3, developer: 2, reporter: 1 };
    const hasAccess = roleHierarchy[currentUserRole] >= roleHierarchy[requiredRole];
    console.log(`🔍 canAccess(${requiredRole}): currentUserRole=${currentUserRole}, hasAccess=${hasAccess}`);
    return hasAccess;
  };

  // 멤버 관리 헬퍼 함수들
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/members/${memberId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          role: newRole
        })
      });

      if (response.ok) {
        console.log('✅ Member role updated successfully');
        // 멤버 목록 새로고침
        loadMembers();
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to update member role:', errorText);
        alert(`역할 변경에 실패했습니다: ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Error updating member role:', error);
      alert('역할 변경 중 오류가 발생했습니다.');
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`정말로 ${memberName}님을 팀에서 제거하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/teams/${teamId}/members/${memberId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        console.log('✅ Member removed successfully');
        // 멤버 목록 새로고침
        loadMembers();
        alert(`${memberName}님이 팀에서 제거되었습니다.`);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to remove member:', errorText);
        alert(`멤버 제거에 실패했습니다: ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Error removing member:', error);
      alert('멤버 제거 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">팀 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="container mx-auto py-6">
        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            팀을 찾을 수 없습니다. 팀 ID를 확인해주세요.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{organization.name}</h1>
          <p className="text-muted-foreground">{organization.description || '팀 설명이 없습니다.'}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">
            {getRoleIcon(currentUserRole)} {currentUserRole.toUpperCase()}
          </Badge>
          {canAccess('owner') && (
            <Button onClick={() => setEditTeamDialog(true)} variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              팀 편집
            </Button>
          )}
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center space-x-2">
            <FolderOpen className="w-4 h-4" />
            <span>Projects</span>
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Members</span>
          </TabsTrigger>
          <TabsTrigger value="servers" className="flex items-center space-x-2">
            <Server className="w-4 h-4" />
            <span>Servers</span>
          </TabsTrigger>
          <TabsTrigger value="tools" className="flex items-center space-x-2">
            <Wrench className="w-4 h-4" />
            <span>Tools</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center space-x-2">
            <Activity className="w-4 h-4" />
            <span>Activity</span>
          </TabsTrigger>
          {canAccess('owner') && (
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </TabsTrigger>
          )}
          {canAccess('developer') && (
            <TabsTrigger value="api-keys" className="flex items-center space-x-2">
              <Key className="w-4 h-4" />
              <span>API Keys</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Overview 탭 */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Users className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{members.length}</p>
                    <p className="text-sm text-muted-foreground">팀원</p>
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
        </TabsContent>

        {/* Projects 탭 */}
        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>프로젝트 관리</CardTitle>
                  <CardDescription>팀에서 진행 중인 프로젝트 목록</CardDescription>
                </div>
                {canAccess('developer') && (
                  <Button onClick={() => setCreateProjectDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    새 프로젝트 생성
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {projectLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-muted-foreground">프로젝트를 불러오는 중...</p>
                </div>
              ) : projects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((project) => (
                    <Card key={project.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-medium text-lg">{project.name}</h3>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {project.description || '프로젝트 설명이 없습니다.'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <div className="flex items-center space-x-4">
                              <span className="flex items-center">
                                <Users className="w-4 h-4 mr-1" />
                                {project.member_count}명
                              </span>
                              <span className="flex items-center">
                                <Server className="w-4 h-4 mr-1" />
                                {project.server_count}개
                              </span>
                            </div>
                            <span>{formatDate(project.created_at)}</span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Button size="sm" className="flex-1">
                              프로젝트 열기
                            </Button>
                            {canAccess('owner') && (
                              <Button size="sm" variant="outline">
                                <Settings className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FolderOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">프로젝트가 없습니다</h3>
                  <p className="text-muted-foreground mb-4">
                    새로운 프로젝트를 생성하여 팀 협업을 시작하세요.
                  </p>
                  {canAccess('developer') && (
                    <Button onClick={() => setCreateProjectDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      첫 번째 프로젝트 생성
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 프로젝트 통계 */}
          {projects.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>프로젝트 통계</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{projects.length}</p>
                    <p className="text-sm text-muted-foreground">총 프로젝트</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {projects.reduce((sum, p) => sum + p.member_count, 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">총 참여자</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">
                      {projects.reduce((sum, p) => sum + p.server_count, 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">총 서버</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Members 탭 */}
        <TabsContent value="members" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>팀원 관리</CardTitle>
                  <CardDescription>팀원 {members.length}명</CardDescription>
                </div>
                {canAccess('owner') && (
                  <Button onClick={() => setInviteMemberDialog(true)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    팀원 초대
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* 멤버 검색 */}
              <div className="flex items-center space-x-2 mb-6">
                <div className="flex-1">
                  <Input
                    placeholder="멤버 검색..."
                    value={memberFilter}
                    onChange={(e) => setMemberFilter(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <Button variant="outline" size="sm">
                  정렬 <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </div>

              {/* 멤버 테이블 */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-4 font-medium text-sm text-gray-700">계정</th>
                      <th className="text-left p-4 font-medium text-sm text-gray-700">출처</th>
                      <th className="text-left p-4 font-medium text-sm text-gray-700">역할</th>
                      <th className="text-left p-4 font-medium text-sm text-gray-700">가입일</th>
                      <th className="text-left p-4 font-medium text-sm text-gray-700">활동</th>
                      <th className="text-right p-4 font-medium text-sm text-gray-700"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {members.filter(member => 
                      memberFilter === '' || 
                      member.name?.toLowerCase().includes(memberFilter.toLowerCase()) ||
                      member.email?.toLowerCase().includes(memberFilter.toLowerCase())
                    ).map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={member.avatar_url} />
                              <AvatarFallback className="text-sm">
                                {getInitials(member.name || member.email || 'U')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{member.name || member.email || 'Unknown User'}</span>
                                {member.is_current_user && (
                                  <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800">
                                    It's you
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {member.email || '@username'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm">
                            <p className="text-muted-foreground">팀 직접 초대</p>
                            <p className="text-xs text-muted-foreground">
                              {organization?.name}
                            </p>
                          </div>
                        </td>
                        <td className="p-4">
                          <Select
                            value={member.role}
                            onValueChange={(value) => handleRoleChange(member.user_id, value)}
                            disabled={!canAccess('owner') || member.role === 'owner'}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue>
                                <div className="flex items-center gap-2">
                                  {member.role === 'owner' && <Crown className="h-4 w-4 text-red-600" />}
                                  {member.role === 'developer' && <Code className="h-4 w-4 text-blue-600" />}
                                  {member.role === 'reporter' && <FileText className="h-4 w-4 text-gray-600" />}
                                  <span className="capitalize">{member.role}</span>
                                </div>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="owner">
                                <div className="flex items-center gap-2">
                                  <Crown className="h-4 w-4 text-red-600" />
                                  <span>Owner</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="developer">
                                <div className="flex items-center gap-2">
                                  <Code className="h-4 w-4 text-blue-600" />
                                  <span>Developer</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="reporter">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-gray-600" />
                                  <span>Reporter</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-muted-foreground">
                            <p>{formatDate(member.joined_at || new Date().toISOString())}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-muted-foreground">
                            <p>최근 활동</p>
                            <p className="text-xs">활성 상태</p>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          {canAccess('owner') && member.role !== 'owner' && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Shield className="h-4 w-4 mr-2" />
                                  권한 편집
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Mail className="h-4 w-4 mr-2" />
                                  다시 초대
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => handleRemoveMember(member.user_id, member.name || member.email || 'Unknown User')}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  멤버 제거
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Servers 탭 */}
        <TabsContent value="servers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>서버 관리</CardTitle>
                  <CardDescription>팀에서 사용하는 MCP 서버 목록</CardDescription>
                </div>
                {canAccess('developer') && (
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    서버 추가
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {servers.map((server) => (
                  <Card key={server.id}>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">{server.name}</h3>
                          <Badge variant={server.status === 'active' ? 'default' : 'secondary'}>
                            {server.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>도구 수: {server.tool_count}</p>
                          {server.last_used && (
                            <p>마지막 사용: {formatDate(server.last_used)}</p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" className="flex-1">
                            상세보기
                          </Button>
                          {canAccess('owner') && (
                            <Button size="sm" variant="outline">
                              <Settings className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tools 탭 */}
        <TabsContent value="tools" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>도구 목록</CardTitle>
              <CardDescription>팀에서 사용 가능한 모든 도구</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tools.map((tool) => (
                  <Card key={tool.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{tool.name}</h3>
                          <p className="text-sm text-muted-foreground">{tool.description}</p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                            <span>서버: {tool.server_name}</span>
                            <span>사용 횟수: {tool.usage_count}</span>
                          </div>
                        </div>
                        {canAccess('developer') && (
                          <Button size="sm">
                            실행
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity 탭 */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>활동 피드</CardTitle>
              <CardDescription>팀의 모든 활동 내역</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                    <div className="w-3 h-3 bg-primary rounded-full mt-1"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.user_name} • {formatDate(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
                {activities.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    활동 내역이 없습니다.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings 탭 (Owner만) */}
        {canAccess('owner') && (
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>팀 설정</CardTitle>
                <CardDescription>팀 정보 및 설정 관리</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>팀 이름</Label>
                  <Input value={organization.name} disabled />
                </div>
                <div>
                  <Label>팀 설명</Label>
                  <Input value={organization.description || ''} disabled />
                </div>
                <div>
                  <Label>팀 ID</Label>
                  <Input value={organization.id} disabled />
                </div>
                <div className="pt-4 border-t">
                  <h3 className="text-lg font-medium text-destructive mb-2">위험 구역</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    이 작업들은 되돌릴 수 없습니다. 신중하게 진행하세요.
                  </p>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="w-4 h-4 mr-2" />
                    팀 삭제
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* API Keys 탭 (Developer 이상) */}
        {canAccess('developer') && (
          <TabsContent value="api-keys" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>API 키 관리</CardTitle>
                    <CardDescription>팀 API 키 생성 및 관리</CardDescription>
                  </div>
                  {canAccess('owner') && (
                    <Button onClick={() => setCreateApiKeyDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      새 API 키 생성
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {apiKeys.map((key) => (
                    <Card key={key.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium">{key.name}</h3>
                              <Badge variant={key.is_active ? "default" : "secondary"}>
                                {key.is_active ? "활성" : "비활성"}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <span>키: {key.key_prefix}...</span>
                              <span>생성: {formatDate(key.created_at)}</span>
                              {key.last_used_at && (
                                <span>마지막 사용: {formatDate(key.last_used_at)}</span>
                              )}
                              {key.expires_at && (
                                <span>만료: {formatDate(key.expires_at)}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button size="sm" variant="outline">
                              <Copy className="w-4 h-4" />
                            </Button>
                            {canAccess('owner') && (
                              <Button size="sm" variant="outline">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {apiKeys.length === 0 && (
                    <div className="text-center py-8">
                      <Key className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">생성된 API 키가 없습니다.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Cline 설정 생성 */}
            <Card>
              <CardHeader>
                <CardTitle>Cline 설정</CardTitle>
                <CardDescription>팀 API 키를 사용한 Cline MCP 설정 생성</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">팀의 MCP 서버 설정을 Cline에서 사용할 수 있는 형태로 생성합니다.</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      API 키가 필요합니다. 설정 파일에는 팀의 모든 활성 서버가 포함됩니다.
                    </p>
                  </div>
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    설정 다운로드
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* 팀원 초대 다이얼로그 */}
      <Dialog open={inviteMemberDialog} onOpenChange={setInviteMemberDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>팀원 초대</DialogTitle>
            <DialogDescription>
              새로운 팀원을 초대합니다. 초대된 사용자는 이메일로 알림을 받게 됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="inviteEmail">이메일 주소</Label>
              <Input
                id="inviteEmail"
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="inviteRole">역할</Label>
              <select
                id="inviteRole"
                className="w-full p-2 border rounded-md"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'developer' | 'reporter')}
              >
                <option value="developer">🟡 Developer</option>
                <option value="reporter">🔵 Reporter</option>
              </select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setInviteMemberDialog(false);
                  setInviteEmail('');
                  setInviteRole('developer');
                }}
              >
                취소
              </Button>
              <Button 
                disabled={!inviteEmail.trim()}
                onClick={inviteMember}
              >
                초대 보내기
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* API 키 생성 다이얼로그 */}
      <Dialog open={createApiKeyDialog} onOpenChange={setCreateApiKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 API 키 생성</DialogTitle>
            <DialogDescription>
              팀에서 사용할 새로운 API 키를 생성합니다. 키는 생성 후 한 번만 표시됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newApiKeyName">키 이름</Label>
              <Input
                id="newApiKeyName"
                placeholder="예: Development Key"
                value={newApiKeyName}
                onChange={(e) => setNewApiKeyName(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCreateApiKeyDialog(false);
                  setNewApiKeyName('');
                }}
              >
                취소
              </Button>
              <Button disabled={!newApiKeyName.trim()}>
                생성
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 팀 편집 다이얼로그 */}
      <Dialog open={editTeamDialog} onOpenChange={setEditTeamDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>팀 편집</DialogTitle>
            <DialogDescription>
              팀 정보를 수정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editTeamName">팀 이름</Label>
              <Input
                id="editTeamName"
                value={editTeamName}
                onChange={(e) => setEditTeamName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="editTeamDescription">팀 설명</Label>
              <Input
                id="editTeamDescription"
                value={editTeamDescription}
                onChange={(e) => setEditTeamDescription(e.target.value)}
                placeholder="팀에 대한 간단한 설명을 입력하세요"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditTeamDialog(false);
                  setEditTeamName(organization?.name || '');
                  setEditTeamDescription(organization?.description || '');
                }}
              >
                취소
              </Button>
              <Button disabled={!editTeamName.trim()}>
                저장
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 프로젝트 생성 다이얼로그 */}
      <Dialog open={createProjectDialog} onOpenChange={setCreateProjectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 프로젝트 생성</DialogTitle>
            <DialogDescription>
              팀에서 새로운 프로젝트를 생성합니다. 프로젝트는 독립적인 협업 단위로 관리됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newProjectName">프로젝트 이름</Label>
              <Input
                id="newProjectName"
                placeholder="예: E-commerce Redesign"
                value={newProjectName}
                onChange={(e) => handleProjectNameChange(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="newProjectDescription">프로젝트 설명</Label>
              <Input
                id="newProjectDescription"
                placeholder="프로젝트에 대한 간단한 설명을 입력하세요"
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="newProjectSlug">프로젝트 슬러그 (URL 식별자)</Label>
              <Input
                id="newProjectSlug"
                placeholder="e-commerce-redesign"
                value={newProjectSlug}
                onChange={(e) => setNewProjectSlug(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                영문 소문자, 숫자, 하이픈만 사용 가능합니다. API 엔드포인트에서 사용됩니다.
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCreateProjectDialog(false);
                  setNewProjectName('');
                  setNewProjectDescription('');
                  setNewProjectSlug('');
                }}
              >
                취소
              </Button>
              <Button 
                disabled={!newProjectName.trim() || !newProjectSlug.trim() || projectLoading}
                onClick={handleCreateProject}
              >
                {projectLoading ? '생성 중...' : '프로젝트 생성'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
