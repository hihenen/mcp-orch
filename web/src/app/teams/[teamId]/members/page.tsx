'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TeamLayout } from '@/components/teams/TeamLayout';
import { useTeamStore } from '@/stores/teamStore';
import { toast } from 'sonner';
import { 
  Users, 
  UserPlus, 
  Crown,
  Code,
  FileText,
  Shield,
  Mail,
  MoreHorizontal,
  ChevronDown,
  Trash2
} from 'lucide-react';

interface TeamMember {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: string;
  joined_at: string;
  is_current_user?: boolean;
  avatar_url?: string;
}

export default function TeamMembersPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const { selectedTeam } = useTeamStore();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberFilter, setMemberFilter] = useState('');
  const [inviteMemberDialog, setInviteMemberDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('reporter');

  useEffect(() => {
    if (teamId) {
      loadMembers();
    }
  }, [teamId]);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/teams/${teamId}/members`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const memberData = await response.json();
        setMembers(memberData);
      } else {
        console.error('Failed to load members:', response.status, response.statusText);
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
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      toast.error('이메일을 입력해주세요.');
      return;
    }

    try {
      const response = await fetch(`/api/teams/${teamId}/members/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole
        })
      });

      if (response.ok) {
        toast.success('팀원 초대가 전송되었습니다.');
        setInviteMemberDialog(false);
        setInviteEmail('');
        setInviteRole('reporter');
        loadMembers();
      } else {
        const errorText = await response.text();
        console.error('Failed to invite member:', errorText);
        toast.error(`팀원 초대에 실패했습니다: ${errorText}`);
      }
    } catch (error) {
      console.error('Error inviting member:', error);
      toast.error('팀원 초대 중 오류가 발생했습니다.');
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/members/${memberId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          role: newRole
        })
      });

      if (response.ok) {
        const member = members.find(m => m.user_id === memberId);
        const memberName = member?.name || member?.email || '멤버';
        toast.success(`${memberName}님의 역할이 ${newRole}로 변경되었습니다.`);
        loadMembers();
      } else {
        const errorText = await response.text();
        console.error('Failed to update member role:', errorText);
        toast.error(`역할 변경에 실패했습니다: ${errorText}`);
      }
    } catch (error) {
      console.error('Error updating member role:', error);
      toast.error('역할 변경 중 오류가 발생했습니다.');
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
        toast.success(`${memberName}님이 팀에서 제거되었습니다.`);
        loadMembers();
      } else {
        const errorText = await response.text();
        console.error('Failed to remove member:', errorText);
        toast.error(`멤버 제거에 실패했습니다: ${errorText}`);
      }
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('멤버 제거 중 오류가 발생했습니다.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const canAccess = (requiredRole: 'owner' | 'developer' | 'reporter') => {
    if (!selectedTeam?.role) return false;
    const roleHierarchy = { owner: 3, developer: 2, reporter: 1 };
    const userRoleLevel = roleHierarchy[selectedTeam.role.toLowerCase() as keyof typeof roleHierarchy] || 0;
    return userRoleLevel >= roleHierarchy[requiredRole];
  };

  const filteredMembers = members.filter(member => 
    memberFilter === '' || 
    member.name?.toLowerCase().includes(memberFilter.toLowerCase()) ||
    member.email?.toLowerCase().includes(memberFilter.toLowerCase())
  );

  if (loading) {
    return (
      <TeamLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-muted-foreground">팀원 정보를 불러오는 중...</p>
          </div>
        </div>
      </TeamLayout>
    );
  }

  return (
    <TeamLayout>
      <div className="space-y-6">
        {/* 헤더 섹션 */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-purple-900">팀원 관리</h3>
          </div>
          <p className="text-sm text-purple-700">
            팀원을 초대하고 역할을 관리할 수 있습니다. 현재 {members.length}명이 팀에 참여하고 있습니다.
          </p>
        </div>

        {/* 팀원 관리 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>팀원 목록</CardTitle>
                <CardDescription>팀원 {members.length}명</CardDescription>
              </div>
              {canAccess('owner') && (
                <Dialog open={inviteMemberDialog} onOpenChange={setInviteMemberDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="w-4 h-4 mr-2" />
                      팀원 초대
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>팀원 초대</DialogTitle>
                      <DialogDescription>
                        새로운 팀원을 초대합니다.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="inviteEmail">이메일</Label>
                        <Input
                          id="inviteEmail"
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="초대할 이메일을 입력하세요"
                        />
                      </div>
                      <div>
                        <Label htmlFor="inviteRole">역할</Label>
                        <Select value={inviteRole} onValueChange={setInviteRole}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owner">Owner</SelectItem>
                            <SelectItem value="developer">Developer</SelectItem>
                            <SelectItem value="reporter">Reporter</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setInviteMemberDialog(false)}>
                          취소
                        </Button>
                        <Button onClick={handleInviteMember}>
                          초대 보내기
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
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
                  {filteredMembers.map((member) => (
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
                            {selectedTeam?.name}
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
                        {canAccess('owner') && member.role !== 'owner' && !member.is_current_user && (
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
                                onClick={() => handleRemoveMember(member.user_id, member.name || member.email)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                팀에서 제거
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
      </div>
    </TeamLayout>
  );
}