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
  UserPlus,
  Mail,
  ChevronDown,
  Shield,
  Crown,
  Code,
  FileText,
  MoreHorizontal,
  RefreshCw
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { ProjectMember, ProjectRole, InviteSource, TeamForInvite, TeamInviteRequest } from '@/types/project';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ProjectLayout } from '@/components/projects/ProjectLayout';

export default function ProjectMembersPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  
  const { 
    selectedProject,
    projectMembers,
    availableTeams,
    isLoadingAvailableTeams,
    loadProject,
    loadProjectMembers,
    loadAvailableTeams,
    inviteProjectMember,
    inviteTeamToProject,
    updateProjectMember,
    removeProjectMember
  } = useProjectStore();

  // 상태 관리
  const [memberFilter, setMemberFilter] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteTab, setInviteTab] = useState('member');
  
  // 개별 멤버 초대 데이터
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'developer',
    inviteAs: 'individual',
    message: ''
  });

  // 팀 초대 데이터
  const [teamInviteData, setTeamInviteData] = useState({
    teamId: '',
    role: 'developer',
    message: ''
  });

  // 페이지 로드 시 데이터 로드
  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
      loadProjectMembers(projectId);
      loadAvailableTeams(projectId);
    }
  }, [projectId, loadProject, loadProjectMembers, loadAvailableTeams]);

  // 이니셜 생성 헬퍼 함수
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // 초대 탭 변경 핸들러
  const handleInviteTabChange = (value: string) => {
    setInviteTab(value);
    if (value === 'team') {
      loadAvailableTeams(projectId);
    }
  };

  // 개별 멤버 초대 핸들러
  const handleInviteMember = async () => {
    if (!inviteData.email.trim()) {
      toast.error('이메일을 입력해주세요.');
      return;
    }

    try {
      await inviteProjectMember(projectId, {
        email: inviteData.email.trim(),
        role: inviteData.role as ProjectRole,
        invite_source: inviteData.inviteAs as InviteSource,
        message: inviteData.message.trim() || null
      });

      toast.success(`${inviteData.email}님에게 초대를 보냈습니다.`);
      
      // 폼 리셋
      setInviteData({
        email: '',
        role: 'developer',
        inviteAs: 'individual',
        message: ''
      });
      
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

    try {
      const teamInvite: TeamInviteRequest = {
        team_id: teamInviteData.teamId,
        role: teamInviteData.role as ProjectRole,
        message: teamInviteData.message.trim() || null
      };

      const response = await inviteTeamToProject(projectId, teamInvite);
      
      if (response.added_members > 0) {
        toast.success(`팀 초대 완료: ${response.added_members}명이 추가되었습니다. (${response.skipped_members}명 건너뜀)`);
      } else {
        toast.info('모든 팀 멤버가 이미 프로젝트에 참여하고 있습니다.');
      }

      // 폼 리셋
      setTeamInviteData({
        teamId: '',
        role: 'developer',
        message: ''
      });
      
      setIsInviteOpen(false);

      // 멤버 목록 새로고침
      loadProjectMembers(projectId);

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
    <ProjectLayout>
      <div className="space-y-6">
        {/* 헤더 섹션 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">프로젝트 멤버</h3>
          </div>
          <p className="text-sm text-blue-700">
            새 멤버를 {selectedProject?.name} 프로젝트에 초대하거나 다른 그룹에서 가져올 수 있습니다.
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
              <CardContent className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">프로젝트 멤버가 없습니다</h3>
                <p className="text-muted-foreground mb-4">
                  새 멤버를 초대하여 프로젝트 협업을 시작하세요.
                </p>
                <Button onClick={() => setIsInviteOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  첫 번째 멤버 초대
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ProjectLayout>
  );
}