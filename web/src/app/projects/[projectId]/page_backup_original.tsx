'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users, 
  Server, 
  Settings, 
  Activity, 
  Key,
  Plus,
  MoreHorizontal,
  Play,
  Pause,
  RefreshCw,
  Eye,
  UserPlus,
  Mail,
  Calendar,
  ChevronDown,
  Shield,
  Crown,
  Code,
  FileText,
  Copy,
  Trash,
  AlertCircle,
  Download
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { useServerStore } from '@/stores/serverStore';
import { useToolStore } from '@/stores/toolStore';
import { Project, ProjectMember, ProjectRole, InviteSource, TeamForInvite, TeamInviteRequest } from '@/types/project';
import { MCPServer } from '@/types';
import { useRouter } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { AddServerDialog } from '@/components/servers/AddServerDialog';
import { SecuritySettingsSection } from '@/components/projects/SecuritySettingsSection';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  
  const { 
    selectedProject, 
    projectMembers, 
    projectServers,
    projectApiKeys,
    availableTeams,
    loadProject, 
    loadProjectMembers,
    loadProjectServers,
    loadProjectApiKeys,
    loadAvailableTeams,
    inviteTeamToProject,
    createProjectApiKey,
    deleteProjectApiKey,
    getProjectClineConfig,
    addProjectMember,
    updateProjectMember,
    removeProjectMember,
    toggleProjectServer,
    restartProjectServer,
    isLoading,
    isLoadingAvailableTeams 
  } = useProjectStore();
  
  const { tools, loadTools } = useToolStore();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteTab, setInviteTab] = useState('member'); // 'member' or 'team'
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'developer',
    inviteAs: 'individual',
    message: ''
  });
  const [teamInviteData, setTeamInviteData] = useState({
    teamId: '',
    role: 'developer',
    message: ''
  });
  const [memberFilter, setMemberFilter] = useState('');
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
  const [apiKeyData, setApiKeyData] = useState({
    name: '',
    description: '',
    expires_at: null as string | null
  });
  const [newlyCreatedApiKey, setNewlyCreatedApiKey] = useState<string | null>(null);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [isAddServerDialogOpen, setIsAddServerDialogOpen] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
      loadProjectMembers(projectId);
      loadProjectServers(projectId);
      loadProjectApiKeys(projectId);
      loadAvailableTeams(projectId);
      loadTools();
    }
  }, [projectId, loadProject, loadProjectMembers, loadProjectServers, loadProjectApiKeys, loadAvailableTeams, loadTools]);

  // 멤버 초대 핸들러
  const handleInviteMember = async () => {
    if (!inviteData.email.trim()) {
      toast.error('이메일 주소를 입력해주세요.');
      return;
    }

    // 문자열을 enum으로 변환
    const role = inviteData.role === 'owner' ? ProjectRole.OWNER :
                 inviteData.role === 'developer' ? ProjectRole.DEVELOPER :
                 ProjectRole.REPORTER;
    
    const inviteSource = inviteData.inviteAs === 'team_member' ? InviteSource.TEAM_MEMBER :
                        inviteData.inviteAs === 'external' ? InviteSource.EXTERNAL :
                        InviteSource.INDIVIDUAL;

    try {
      await addProjectMember(projectId, {
        email: inviteData.email.trim(),
        role: role,
        invited_as: inviteSource,
        message: inviteData.message
      });

      toast.success(`${inviteData.email}님을 프로젝트에 초대했습니다.`);
      
      // 폼 리셋
      setInviteData({
        email: '',
        role: 'developer',
        inviteAs: 'individual',
        message: ''
      });
      
      // 다이얼로그 닫기
      setIsInviteOpen(false);
      
      // 멤버 목록 새로고침
      loadProjectMembers(projectId);
      
    } catch (error) {
      console.error('멤버 초대 실패:', error);
      toast.error('멤버 초대에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // 팀 초대 핸들러
  const handleInviteTeam = async () => {
    if (!teamInviteData.teamId) {
      toast.error('초대할 팀을 선택해주세요.');
      return;
    }

    // 문자열을 enum으로 변환
    const role = teamInviteData.role === 'owner' ? ProjectRole.OWNER :
                 teamInviteData.role === 'developer' ? ProjectRole.DEVELOPER :
                 ProjectRole.REPORTER;

    try {
      const teamInviteRequest: TeamInviteRequest = {
        team_id: teamInviteData.teamId,
        role: role,
        invite_message: teamInviteData.message || undefined
      };

      const result = await inviteTeamToProject(projectId, teamInviteRequest);

      toast.success(
        `${result.team_name} 팀의 ${result.total_invited}명을 프로젝트에 초대했습니다.${
          result.skipped_members.length > 0 ? 
          ` (${result.skipped_members.length}명은 이미 멤버입니다)` : ''
        }`
      );

      // 폼 리셋
      setTeamInviteData({
        teamId: '',
        role: 'developer',
        message: ''
      });

      // 다이얼로그 닫기
      setIsInviteOpen(false);

      // 멤버 목록은 Store에서 자동으로 새로고침됨

    } catch (error) {
      console.error('팀 초대 실패:', error);
      toast.error('팀 초대에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // 멤버 역할 변경 핸들러
  const handleRoleChange = async (memberId: string, newRole: string) => {
    // 문자열을 enum으로 변환
    const role = newRole === 'owner' ? ProjectRole.OWNER :
                 newRole === 'developer' ? ProjectRole.DEVELOPER :
                 ProjectRole.REPORTER;

    try {
      await updateProjectMember(projectId, memberId, {
        role: role
      });
      
      toast.success('멤버 역할이 변경되었습니다.');
      
      // 멤버 목록 새로고침
      loadProjectMembers(projectId);
      
    } catch (error) {
      console.error('역할 변경 실패:', error);
      toast.error('역할 변경에 실패했습니다.');
    }
  };

  // 멤버 제거 핸들러
  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`정말로 ${memberName}님을 프로젝트에서 제거하시겠습니까?`)) {
      return;
    }

    try {
      await removeProjectMember(projectId, memberId);
      
      toast.success(`${memberName}님이 프로젝트에서 제거되었습니다.`);
      
      // 멤버 목록 새로고침
      loadProjectMembers(projectId);
      
    } catch (error) {
      console.error('멤버 제거 실패:', error);
      toast.error('멤버 제거에 실패했습니다.');
    }
  };

  // API 키 생성 핸들러
  const handleCreateApiKey = async () => {
    if (!apiKeyData.name.trim()) {
      toast.error('API 키 이름을 입력해주세요.');
      return;
    }

    try {
      // 만료일 처리 - YYYY-MM-DD 형식을 ISO 형식으로 변환
      const expires_at = apiKeyData.expires_at ? 
        new Date(apiKeyData.expires_at + 'T23:59:59.999Z').toISOString() : 
        null;

      const response = await createProjectApiKey(projectId, {
        name: apiKeyData.name.trim(),
        description: apiKeyData.description.trim() || null,
        expires_at
      });

      // 새로 생성된 API 키 저장 (전체 키)
      if (response.api_key) {
        setNewlyCreatedApiKey(response.api_key);
        setShowApiKeyDialog(true);
      }

      toast.success(`API 키 '${apiKeyData.name}'가 생성되었습니다.`);
      
      // 폼 리셋
      setApiKeyData({
        name: '',
        description: '',
        expires_at: null
      });
      
      // 다이얼로그 닫기
      setIsApiKeyDialogOpen(false);
      
      // API 키 목록 새로고침
      loadProjectApiKeys(projectId);
      
    } catch (error) {
      console.error('API 키 생성 실패:', error);
      toast.error('API 키 생성에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // API 키 삭제 핸들러
  const handleDeleteApiKey = async (apiKeyId: string, apiKeyName: string) => {
    if (!confirm(`정말로 API 키 '${apiKeyName}'를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      await deleteProjectApiKey(projectId, apiKeyId);
      
      toast.success(`API 키 '${apiKeyName}'가 삭제되었습니다.`);
      
      // API 키 목록 새로고침
      loadProjectApiKeys(projectId);
      
    } catch (error) {
      console.error('API 키 삭제 실패:', error);
      toast.error('API 키 삭제에 실패했습니다.');
    }
  };

  // Cline 설정 다운로드 핸들러
  const handleDownloadClineConfig = async () => {
    try {
      const config = await getProjectClineConfig(projectId);
      
      // JSON 파일로 다운로드
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedProject?.slug || 'project'}-cline-config.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Cline 설정 파일이 다운로드되었습니다.');
      
    } catch (error) {
      console.error('Cline 설정 다운로드 실패:', error);
      toast.error('Cline 설정 다운로드에 실패했습니다.');
    }
  };

  // 팀 초대 탭 변경 핸들러
  const handleInviteTabChange = (value: string) => {
    setInviteTab(value);
    
    // 팀 초대 탭 선택 시 available teams 로드
    if (value === 'team') {
      console.log('🔄 Team tab selected - loading available teams...');
      loadAvailableTeams(projectId);
    }
  };

  if (isLoading || !selectedProject) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">프로젝트 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 프로젝트 서버의 도구들
  const projectTools = tools.filter(tool => 
    projectServers.some(server => tool.serverId === server.name || tool.serverId === server.id)
  );

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-red-100 text-red-800';
      case 'maintainer': return 'bg-orange-100 text-orange-800';
      case 'developer': return 'bg-blue-100 text-blue-800';
      case 'reporter': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 서버 상세 페이지로 이동하는 핸들러
  const handleServerClick = (serverId: string) => {
    router.push(`/projects/${projectId}/servers/${serverId}`);
  };

  return (
    <div className="space-y-6">
      {/* 프로젝트 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{selectedProject.name}</h1>
          <p className="text-muted-foreground mt-1">{selectedProject.description}</p>
          <div className="flex items-center gap-4 mt-3">
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {projectMembers.length} members
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Server className="h-3 w-3" />
              {projectServers.length} servers
            </Badge>
            <Badge variant="outline">
              {projectTools.length} tools
            </Badge>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Settings className="h-4 w-4 mr-2" />
              프로젝트 설정
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Key className="h-4 w-4 mr-2" />
              API 키 관리
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">
              프로젝트 삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 탭 네비게이션 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="servers" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            Servers
          </TabsTrigger>
          <TabsTrigger value="tools" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Tools
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Overview 탭 */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 프로젝트 정보 카드 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  프로젝트 정보
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium">생성일</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedProject.created_at).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">슬러그</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {selectedProject.slug}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">상태</p>
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    활성
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* 서버 상태 카드 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  서버 상태
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">활성 서버</span>
                  <span className="text-sm font-medium">
                    {projectServers.filter(s => !s.disabled).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">비활성 서버</span>
                  <span className="text-sm font-medium">
                    {projectServers.filter(s => s.disabled).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">총 도구</span>
                  <span className="text-sm font-medium">{projectTools.length}</span>
                </div>
              </CardContent>
            </Card>

            {/* 팀 멤버 카드 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  팀 멤버
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {projectMembers.slice(0, 3).map((member) => (
                    <div key={member.id} className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(member.user_name || member.user_email || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {member.user_name || member.user_email || 'Unknown User'}
                        </p>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getRoleBadgeColor(member.role)}`}
                        >
                          {member.role}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {projectMembers.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{projectMembers.length - 3}명 더
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 최근 활동 */}
          <Card>
            <CardHeader>
              <CardTitle>최근 활동</CardTitle>
              <CardDescription>프로젝트의 최근 변경사항</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm">새 서버가 추가되었습니다</p>
                    <p className="text-xs text-muted-foreground">2시간 전</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm">팀 멤버가 초대되었습니다</p>
                    <p className="text-xs text-muted-foreground">1일 전</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm">프로젝트 설정이 변경되었습니다</p>
                    <p className="text-xs text-muted-foreground">3일 전</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Members 탭 - 섹션 그룹핑 스타일 */}
        <TabsContent value="members" className="space-y-6">
          {/* 헤더 섹션 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <UserPlus className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-blue-900">프로젝트 멤버</h3>
            </div>
            <p className="text-sm text-blue-700">
              새 멤버를 {selectedProject.name} 프로젝트에 초대하거나 다른 그룹에서 가져올 수 있습니다.
              이 그룹과 연결된 모든 하위 그룹 및 프로젝트의 모든 멤버에 대한 seat 관리를 위해 usage quotas 페이지를 방문하세요.
            </p>
          </div>

          {/* 액션 버튼들 */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold">멤버 {projectMembers.length}명</h3>
            </div>
            <div className="flex gap-2">
              <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    멤버/팀 초대
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>멤버/팀 초대</DialogTitle>
                    <DialogDescription>
                      개별 멤버를 초대하거나 팀 전체를 프로젝트에 초대할 수 있습니다.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Tabs value={inviteTab} onValueChange={handleInviteTabChange} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="member" className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        개별 멤버 초대
                      </TabsTrigger>
                      <TabsTrigger value="team" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        팀 초대
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="member" className="space-y-4 mt-4">
                      <div>
                        <Label htmlFor="email">이메일 주소</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="user@example.com"
                          value={inviteData.email}
                          onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="role">역할 선택</Label>
                        <Select
                          value={inviteData.role}
                          onValueChange={(value) => setInviteData(prev => ({ ...prev, role: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
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
                      </div>
                      <div>
                        <Label htmlFor="inviteAs">초대 경로</Label>
                        <Select
                          value={inviteData.inviteAs}
                          onValueChange={(value) => setInviteData(prev => ({ ...prev, inviteAs: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="individual">개인으로 초대</SelectItem>
                            <SelectItem value="team_member">팀 멤버로 초대</SelectItem>
                            <SelectItem value="external">외부 협력사로 초대</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="member-message">초대 메시지 (선택사항)</Label>
                        <Textarea
                          id="member-message"
                          placeholder="프로젝트에 참여해주셔서 감사합니다..."
                          value={inviteData.message}
                          onChange={(e) => setInviteData(prev => ({ ...prev, message: e.target.value }))}
                          rows={3}
                        />
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="team" className="space-y-4 mt-4">
                      <div>
                        <Label htmlFor="team">팀 선택</Label>
                        <Select
                          value={teamInviteData.teamId}
                          onValueChange={(value) => setTeamInviteData(prev => ({ ...prev, teamId: value }))}
                          disabled={isLoadingAvailableTeams}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingAvailableTeams ? "팀 목록을 불러오는 중..." : "초대할 팀을 선택하세요"} />
                          </SelectTrigger>
                          <SelectContent>
                            {isLoadingAvailableTeams ? (
                              <SelectItem value="loading" disabled>
                                <div className="flex items-center gap-2">
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                  <span>로딩 중...</span>
                                </div>
                              </SelectItem>
                            ) : availableTeams.map((team) => (
                              <SelectItem key={team.id} value={team.id}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{team.name}</span>
                                  <span className="text-sm text-muted-foreground ml-2">
                                    {team.member_count}명 • {team.user_role}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!isLoadingAvailableTeams && availableTeams.length === 0 && (
                          <p className="text-sm text-muted-foreground mt-1">
                            초대할 수 있는 팀이 없습니다. 먼저 팀에 가입하거나 팀을 생성해주세요.
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="team-role">팀 멤버들의 역할</Label>
                        <Select
                          value={teamInviteData.role}
                          onValueChange={(value) => setTeamInviteData(prev => ({ ...prev, role: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
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
                      </div>
                      <div>
                        <Label htmlFor="team-message">초대 메시지 (선택사항)</Label>
                        <Textarea
                          id="team-message"
                          placeholder="팀 전체를 프로젝트에 초대합니다..."
                          value={teamInviteData.message}
                          onChange={(e) => setTeamInviteData(prev => ({ ...prev, message: e.target.value }))}
                          rows={3}
                        />
                      </div>
                      
                      {/* 팀 정보 미리보기 */}
                      {teamInviteData.teamId && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <h4 className="font-medium text-blue-900 mb-2">선택된 팀 정보</h4>
                          {(() => {
                            const selectedTeam = availableTeams.find(t => t.id === teamInviteData.teamId);
                            return selectedTeam ? (
                              <div className="text-sm text-blue-700">
                                <p><strong>{selectedTeam.name}</strong></p>
                                <p>{selectedTeam.member_count}명의 멤버가 프로젝트에 초대됩니다.</p>
                                <p>현재 당신의 역할: {selectedTeam.user_role}</p>
                              </div>
                            ) : null;
                          })()}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                      취소
                    </Button>
                    {inviteTab === 'member' ? (
                      <Button 
                        onClick={handleInviteMember} 
                        disabled={!inviteData.email.trim()}
                      >
                        멤버 초대
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleInviteTeam} 
                        disabled={!teamInviteData.teamId}
                      >
                        팀 초대
                      </Button>
                    )}
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* 멤버 필터 및 검색 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Input
                placeholder="멤버 검색..."
                value={memberFilter}
                onChange={(e) => setMemberFilter(e.target.value)}
                className="w-64"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="account-sort">계정</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    정렬 <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>이름순</DropdownMenuItem>
                  <DropdownMenuItem>이메일순</DropdownMenuItem>
                  <DropdownMenuItem>최근 활동순</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* 멤버 섹션별 그룹 표시 */}
          {(() => {
            // 멤버를 초대 방식별로 그룹핑
            const directMembers = projectMembers.filter(member => 
              member.invited_as === InviteSource.INDIVIDUAL &&
              (memberFilter === '' || 
               member.user_name?.toLowerCase().includes(memberFilter.toLowerCase()) ||
               member.user_email?.toLowerCase().includes(memberFilter.toLowerCase()))
            );
            
            const teamMembers = projectMembers.filter(member => 
              member.invited_as === InviteSource.TEAM_MEMBER &&
              (memberFilter === '' || 
               member.user_name?.toLowerCase().includes(memberFilter.toLowerCase()) ||
               member.user_email?.toLowerCase().includes(memberFilter.toLowerCase()))
            );
            
            const externalMembers = projectMembers.filter(member => 
              member.invited_as === InviteSource.EXTERNAL &&
              (memberFilter === '' || 
               member.user_name?.toLowerCase().includes(memberFilter.toLowerCase()) ||
               member.user_email?.toLowerCase().includes(memberFilter.toLowerCase()))
            );

            return (
              <div className="space-y-6">
                {/* 직접 초대된 멤버 섹션 */}
                {directMembers.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        직접 초대된 멤버
                        <Badge variant="secondary" className="ml-2">
                          {directMembers.length}명
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              <th className="text-left p-4 font-medium text-sm text-gray-700">계정</th>
                              <th className="text-left p-4 font-medium text-sm text-gray-700">역할</th>
                              <th className="text-left p-4 font-medium text-sm text-gray-700">가입일</th>
                              <th className="text-left p-4 font-medium text-sm text-gray-700">활동</th>
                              <th className="text-right p-4 font-medium text-sm text-gray-700"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {directMembers.map((member) => (
                              <tr key={member.id} className="hover:bg-gray-50">
                                <td className="p-4">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                      <AvatarFallback className="text-sm">
                                        {getInitials(member.user_name || member.user_email || 'U')}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">{member.user_name || member.user_email || 'Unknown User'}</span>
                                        {member.is_current_user && (
                                          <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800">
                                            It's you
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-muted-foreground">
                                        {member.user_email || '@username'}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <Select
                                    value={member.role}
                                    onValueChange={(value) => handleRoleChange(member.id, value)}
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
                                  <p className="text-sm text-muted-foreground">
                                    {new Date(member.joined_at).toLocaleDateString('ko-KR')}
                                  </p>
                                </td>
                                <td className="p-4">
                                  <p className="text-sm text-muted-foreground">
                                    최근 활동
                                  </p>
                                </td>
                                <td className="p-4 text-right">
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
                                      <DropdownMenuItem 
                                        className="text-red-600"
                                        onClick={() => handleRemoveMember(member.id, member.user_name || member.user_email || 'Unknown User')}
                                      >
                                        멤버 제거
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 팀별 멤버 섹션 */}
                {teamMembers.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        팀별 멤버
                        <Badge variant="secondary" className="ml-2">
                          {teamMembers.length}명
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        팀을 통해 프로젝트에 참여한 멤버들입니다
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              <th className="text-left p-4 font-medium text-sm text-gray-700">계정</th>
                              <th className="text-left p-4 font-medium text-sm text-gray-700">팀</th>
                              <th className="text-left p-4 font-medium text-sm text-gray-700">역할</th>
                              <th className="text-left p-4 font-medium text-sm text-gray-700">가입일</th>
                              <th className="text-right p-4 font-medium text-sm text-gray-700"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {teamMembers.map((member) => (
                              <tr key={member.id} className="hover:bg-gray-50">
                                <td className="p-4">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                      <AvatarFallback className="text-sm">
                                        {getInitials(member.user_name || member.user_email || 'U')}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">{member.user_name || member.user_email || 'Unknown User'}</span>
                                        {member.is_current_user && (
                                          <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800">
                                            It's you
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-muted-foreground">
                                        {member.user_email || '@username'}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">
                                      {member.team_name || '팀 정보 없음'}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <Select
                                    value={member.role}
                                    onValueChange={(value) => handleRoleChange(member.id, value)}
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
                                  <p className="text-sm text-muted-foreground">
                                    {new Date(member.joined_at).toLocaleDateString('ko-KR')}
                                  </p>
                                </td>
                                <td className="p-4 text-right">
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
                                      <DropdownMenuItem 
                                        className="text-red-600"
                                        onClick={() => handleRemoveMember(member.id, member.user_name || member.user_email || 'Unknown User')}
                                      >
                                        멤버 제거
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 외부 멤버 섹션 */}
                {externalMembers.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        외부 멤버
                        <Badge variant="secondary" className="ml-2">
                          {externalMembers.length}명
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        외부 협력사로 초대된 멤버들입니다
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              <th className="text-left p-4 font-medium text-sm text-gray-700">계정</th>
                              <th className="text-left p-4 font-medium text-sm text-gray-700">역할</th>
                              <th className="text-left p-4 font-medium text-sm text-gray-700">가입일</th>
                              <th className="text-right p-4 font-medium text-sm text-gray-700"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {externalMembers.map((member) => (
                              <tr key={member.id} className="hover:bg-gray-50">
                                <td className="p-4">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                      <AvatarFallback className="text-sm">
                                        {getInitials(member.user_name || member.user_email || 'U')}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">{member.user_name || member.user_email || 'Unknown User'}</span>
                                        {member.is_current_user && (
                                          <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800">
                                            It's you
                                          </Badge>
                                        )}
                                        <Badge variant="outline" className="text-xs">
                                          외부
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-muted-foreground">
                                        {member.user_email || '@username'}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <Select
                                    value={member.role}
                                    onValueChange={(value) => handleRoleChange(member.id, value)}
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
                                  <p className="text-sm text-muted-foreground">
                                    {new Date(member.joined_at).toLocaleDateString('ko-KR')}
                                  </p>
                                </td>
                                <td className="p-4 text-right">
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
                                      <DropdownMenuItem 
                                        className="text-red-600"
                                        onClick={() => handleRemoveMember(member.id, member.user_name || member.user_email || 'Unknown User')}
                                      >
                                        멤버 제거
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 멤버가 없는 경우 */}
                {projectMembers.length === 0 && (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">아직 프로젝트에 멤버가 없습니다.</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        위의 "멤버/팀 초대" 버튼을 클릭하여 멤버를 추가하세요.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })()}
        </TabsContent>

        {/* Servers 탭 */}
        <TabsContent value="servers" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">프로젝트 서버</h3>
            <Button onClick={() => setIsAddServerDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              서버 추가
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectServers.map((server) => (
              <Card 
                key={server.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleServerClick(server.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{server.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {server.description || '설명 없음'}
                      </CardDescription>
                    </div>
                    <Badge 
                      variant={server.disabled ? "secondary" : "default"}
                      className={server.disabled ? "bg-gray-100" : "bg-green-100 text-green-800"}
                    >
                      {server.disabled ? '비활성' : '활성'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      도구: {server.tools_count || 0}개
                    </div>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" title="상세 보기">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" title={server.disabled ? '활성화' : '비활성화'}>
                        {server.disabled ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="sm" title="재시작">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tools 탭 */}
        <TabsContent value="tools" className="space-y-6">
          <h3 className="text-lg font-semibold">프로젝트 도구</h3>
          
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {projectTools.map((tool) => (
                  <div key={`${tool.serverId}-${tool.name}`} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{tool.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {tool.description || '설명 없음'}
                        </p>
                        <Badge variant="outline" className="mt-2 text-xs">
                          {tool.serverId}
                        </Badge>
                      </div>
                      <Button variant="outline" size="sm">
                        실행
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity 탭 */}
        <TabsContent value="activity" className="space-y-6">
          <h3 className="text-lg font-semibold">프로젝트 활동</h3>
          
          <Card>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Server className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">새 MCP 서버 'excel-server'가 추가되었습니다</p>
                    <p className="text-xs text-muted-foreground mt-1">2시간 전 • Admin</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Users className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">새 멤버 'john@example.com'이 Developer 역할로 초대되었습니다</p>
                    <p className="text-xs text-muted-foreground mt-1">1일 전 • Owner</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <Settings className="h-4 w-4 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">프로젝트 설정이 업데이트되었습니다</p>
                    <p className="text-xs text-muted-foreground mt-1">3일 전 • Maintainer</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys 탭 */}
        <TabsContent value="api-keys" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">API Keys</h3>
              <p className="text-sm text-muted-foreground">
                프로젝트별 API 키를 관리하고 Cline 설정을 생성하세요
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDownloadClineConfig}>
                <Download className="h-4 w-4 mr-2" />
                Cline 설정 다운로드
              </Button>
              <Dialog open={isApiKeyDialogOpen} onOpenChange={setIsApiKeyDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    API 키 생성
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>새 API 키 생성</DialogTitle>
                    <DialogDescription>
                      프로젝트의 MCP 서버에 접근하기 위한 새 API 키를 생성합니다.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="apiKeyName">API 키 이름</Label>
                      <Input
                        id="apiKeyName"
                        placeholder="예: Production Key"
                        value={apiKeyData.name}
                        onChange={(e) => setApiKeyData(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="apiKeyDescription">설명 (선택사항)</Label>
                      <Textarea
                        id="apiKeyDescription"
                        placeholder="이 API 키의 용도를 설명해주세요..."
                        value={apiKeyData.description}
                        onChange={(e) => setApiKeyData(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="apiKeyExpiration">만료일</Label>
                      <Select 
                        value={apiKeyData.expires_at || "never"} 
                        onValueChange={(value) => {
                          const expires_at = value === "never" ? null : value;
                          setApiKeyData(prev => ({ ...prev, expires_at }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="만료일을 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="never">만료 안함 (Never expires)</SelectItem>
                          <SelectItem value={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}>
                            7일 후
                          </SelectItem>
                          <SelectItem value={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}>
                            30일 후
                          </SelectItem>
                          <SelectItem value={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}>
                            90일 후
                          </SelectItem>
                          <SelectItem value={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}>
                            1년 후
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsApiKeyDialogOpen(false)}>
                      취소
                    </Button>
                    <Button onClick={handleCreateApiKey} disabled={!apiKeyData.name.trim()}>
                      API 키 생성
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* API 키 목록 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Keys
              </CardTitle>
              <CardDescription>
                프로젝트의 MCP 서버에 접근하기 위한 API 키들입니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* API 키 목록이 있는 경우 */}
                {projectApiKeys && projectApiKeys.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left p-4 font-medium text-sm text-gray-700">이름</th>
                          <th className="text-left p-4 font-medium text-sm text-gray-700">상태</th>
                          <th className="text-left p-4 font-medium text-sm text-gray-700">마지막 사용</th>
                          <th className="text-left p-4 font-medium text-sm text-gray-700">생성일</th>
                          <th className="text-right p-4 font-medium text-sm text-gray-700"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {projectApiKeys.map((apiKey) => (
                          <tr key={apiKey.id} className="hover:bg-gray-50">
                            <td className="p-4">
                              <div className="font-medium">{apiKey.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {apiKey.expires_at 
                                  ? `만료: ${new Date(apiKey.expires_at).toLocaleDateString('ko-KR')}`
                                  : '만료 없음'
                                }
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge className="bg-green-100 text-green-800">활성</Badge>
                            </td>
                            <td className="p-4">
                              <div className="text-sm">{apiKey.last_used_at ? new Date(apiKey.last_used_at).toLocaleDateString('ko-KR') : '사용 안함'}</div>
                              <div className="text-xs text-muted-foreground">{apiKey.last_used_ip || '-'}</div>
                            </td>
                            <td className="p-4">
                              <div className="text-sm">{apiKey.created_at ? new Date(apiKey.created_at).toLocaleDateString('ko-KR') : '-'}</div>
                            </td>
                            <td className="p-4 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                    <Copy className="h-4 w-4 mr-2" />
                                    키 복사
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    키 재생성
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-red-600"
                                    onClick={() => handleDeleteApiKey(apiKey.id, apiKey.name)}
                                  >
                                    <Trash className="h-4 w-4 mr-2" />
                                    키 삭제
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* API 키가 없는 경우 */
                  <div className="text-center py-8">
                    <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">API 키가 없습니다</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      첫 번째 API 키를 생성하여 MCP 서버에 접근하세요
                    </p>
                    <Dialog open={isApiKeyDialogOpen} onOpenChange={setIsApiKeyDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          첫 번째 API 키 생성
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>새 API 키 생성</DialogTitle>
                          <DialogDescription>
                            프로젝트의 MCP 서버에 접근하기 위한 새 API 키를 생성합니다.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="apiKeyName2">API 키 이름</Label>
                            <Input
                              id="apiKeyName2"
                              placeholder="예: Production Key"
                              value={apiKeyData.name}
                              onChange={(e) => setApiKeyData(prev => ({ ...prev, name: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="apiKeyDescription2">설명 (선택사항)</Label>
                            <Textarea
                              id="apiKeyDescription2"
                              placeholder="이 API 키의 용도를 설명해주세요..."
                              value={apiKeyData.description}
                              onChange={(e) => setApiKeyData(prev => ({ ...prev, description: e.target.value }))}
                              rows={3}
                            />
                          </div>
                          <div>
                            <Label htmlFor="apiKeyExpiration2">만료일</Label>
                            <Select 
                              value={apiKeyData.expires_at || "never"} 
                              onValueChange={(value) => {
                                const expires_at = value === "never" ? null : value;
                                setApiKeyData(prev => ({ ...prev, expires_at }));
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="만료일을 선택하세요" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="never">만료 안함 (Never expires)</SelectItem>
                                <SelectItem value={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}>
                                  7일 후
                                </SelectItem>
                                <SelectItem value={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}>
                                  30일 후
                                </SelectItem>
                                <SelectItem value={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}>
                                  90일 후
                                </SelectItem>
                                <SelectItem value={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}>
                                  1년 후
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsApiKeyDialogOpen(false)}>
                            취소
                          </Button>
                          <Button onClick={handleCreateApiKey} disabled={!apiKeyData.name.trim()}>
                            API 키 생성
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Cline 설정 미리보기 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Cline 설정 미리보기
              </CardTitle>
              <CardDescription>
                생성된 API 키로 자동 생성되는 Cline MCP 설정입니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="text-sm text-gray-600">
{`{
  "mcpServers": {
    "excel-server": {
      "transport": "sse",
      "url": "http://localhost:8000/projects/${projectId}/servers/excel-server/sse",
      "headers": {
        "Authorization": "Bearer project_abc123..."
      }
    }
  }
}`}
                </pre>
              </div>
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">사용 방법</h4>
                    <ol className="text-sm text-blue-700 mt-2 space-y-1">
                      <li>1. API 키를 생성하세요</li>
                      <li>2. "Cline 설정 다운로드" 버튼을 클릭하세요</li>
                      <li>3. 다운로드된 설정을 Cline MCP 설정에 추가하세요</li>
                      <li>4. Cline을 재시작하여 변경사항을 적용하세요</li>
                    </ol>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings 탭 */}
        <TabsContent value="settings" className="space-y-6">
          <h3 className="text-lg font-semibold">프로젝트 설정</h3>
          
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
              <CardDescription>프로젝트의 기본 정보를 관리합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">프로젝트 이름</label>
                <input 
                  type="text" 
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  defaultValue={selectedProject.name}
                />
              </div>
              <div>
                <label className="text-sm font-medium">설명</label>
                <textarea 
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  rows={3}
                  defaultValue={selectedProject.description || ''}
                />
              </div>
              <div>
                <label className="text-sm font-medium">슬러그</label>
                <input 
                  type="text" 
                  className="w-full mt-1 px-3 py-2 border rounded-md font-mono"
                  defaultValue={selectedProject.slug}
                />
              </div>
              <Button>설정 저장</Button>
            </CardContent>
          </Card>

          {/* 보안 설정 섹션 추가 */}
          <SecuritySettingsSection projectId={projectId} />

          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">위험 구역</CardTitle>
              <CardDescription>이 작업들은 되돌릴 수 없습니다</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive">
                프로젝트 삭제
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* GitHub 스타일 API 키 복사 다이얼로그 */}
      <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-green-600" />
              API 키가 생성되었습니다!
            </DialogTitle>
            <DialogDescription>
              보안상 이 키는 다시 표시되지 않습니다. 지금 복사해서 안전한 곳에 저장하세요.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* 경고 메시지 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">API 키를 안전하게 보관하세요</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    이 키는 다시 표시되지 않습니다. 지금 복사해서 안전한 곳에 저장하세요.
                  </p>
                </div>
              </div>
            </div>

            {/* API 키 표시 */}
            <div className="space-y-2">
              <Label>생성된 API 키</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-3">
                  <code className="text-sm font-mono text-green-800 break-all">
                    {newlyCreatedApiKey}
                  </code>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (newlyCreatedApiKey) {
                      navigator.clipboard.writeText(newlyCreatedApiKey);
                      toast.success('API 키가 클립보드에 복사되었습니다!');
                    }
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* 사용 방법 안내 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium mb-2">사용 방법</h4>
              <ol className="text-sm text-gray-600 space-y-1">
                <li>1. 위의 API 키를 복사하세요</li>
                <li>2. Cline MCP 설정에서 Authorization 헤더에 추가하세요</li>
                <li>3. 형식: <code className="bg-white px-1 rounded">Bearer YOUR_API_KEY</code></li>
                <li>4. Cline을 재시작하여 변경사항을 적용하세요</li>
              </ol>
            </div>
          </div>

          <DialogFooter>
            <Button 
              onClick={() => {
                setShowApiKeyDialog(false);
                setNewlyCreatedApiKey(null);
              }}
              className="w-full"
            >
              확인했습니다
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AddServerDialog 컴포넌트 */}
      <AddServerDialog 
        open={isAddServerDialogOpen}
        onOpenChange={setIsAddServerDialogOpen}
        projectId={projectId}
        onServerAdded={() => {
          loadProjectServers(projectId);
          toast.success('서버가 성공적으로 추가되었습니다.');
        }}
      />
    </div>
  );
}
