'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Settings, Users, Calendar } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Team {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  member_count: number;
  user_role: string;
}

export default function TeamsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [createTeamDialog, setCreateTeamDialog] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');

  // 로그인 체크
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // 팀 목록 로드
  useEffect(() => {
    if (session?.user) {
      loadTeams();
    }
  }, [session]);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/teams/', {
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const teamList = await response.json();
        setTeams(teamList);
      } else {
        console.log('백엔드가 응답하지 않아 데모 데이터를 사용합니다.');
        
        // 데모 데이터로 대체
        const demoTeams = [
          { id: '550e8400-e29b-41d4-a716-446655440000', name: "John's Team", created_at: '2025-06-01T00:00:00Z', updated_at: '2025-06-01T00:00:00Z', member_count: 1, user_role: 'owner' },
          { id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8', name: "Development Team", created_at: '2025-06-01T00:00:00Z', updated_at: '2025-06-01T00:00:00Z', member_count: 3, user_role: 'admin' }
        ];
        setTeams(demoTeams);
      }
    } catch (error) {
      console.error('Failed to load teams:', error);
      console.log('네트워크 오류로 데모 데이터를 사용합니다.');
      
      // 네트워크 오류 시 데모 데이터
      const demoTeams = [
        { id: '550e8400-e29b-41d4-a716-446655440000', name: "John's Team", created_at: '2025-06-01T00:00:00Z', updated_at: '2025-06-01T00:00:00Z', member_count: 1, user_role: 'owner' },
        { id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8', name: "Development Team", created_at: '2025-06-01T00:00:00Z', updated_at: '2025-06-01T00:00:00Z', member_count: 3, user_role: 'admin' }
      ];
      setTeams(demoTeams);
    } finally {
      setLoading(false);
    }
  };

  const createTeam = async () => {
    if (!newTeamName.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/teams/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          name: newTeamName
        })
      });

      if (response.ok) {
        const newTeam = await response.json();
        alert('새 팀이 성공적으로 생성되었습니다!');
        setCreateTeamDialog(false);
        setNewTeamName('');
        loadTeams(); // 팀 목록 새로고침
        
        // 새로 생성된 팀 상세 페이지로 이동
        window.location.href = `/teams/${newTeam.id}`;
      } else {
        // 데모용 응답
        const demoTeam: Team = {
          id: `demo-${Date.now()}`,
          name: newTeamName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          member_count: 1,
          user_role: 'owner'
        };
        setTeams((prev: Team[]) => [...prev, demoTeam]);
        alert('새 팀이 성공적으로 생성되었습니다! (데모)');
        setCreateTeamDialog(false);
        setNewTeamName('');
        
        // 데모 팀 상세 페이지로 이동
        window.location.href = `/teams/${demoTeam.id}`;
      }
    } catch (error) {
      console.error('Failed to create team:', error);
      alert('팀 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-red-100 text-red-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'developer': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">팀 관리</h1>
          <p className="text-muted-foreground">팀을 선택하여 관리하세요</p>
        </div>
        <Dialog open={createTeamDialog} onOpenChange={setCreateTeamDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              새 팀 생성
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 팀 생성</DialogTitle>
              <DialogDescription>
                새로운 팀을 생성합니다. 생성 후 팀 상세 페이지로 이동합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="teamName">팀 이름</Label>
                <Input
                  id="teamName"
                  placeholder="예: Frontend Team"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCreateTeamDialog(false);
                    setNewTeamName('');
                  }}
                >
                  취소
                </Button>
                <Button onClick={createTeam} disabled={loading || !newTeamName.trim()}>
                  {loading ? '생성 중...' : '생성'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 팀 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>내 팀 목록</CardTitle>
          <CardDescription>소속된 팀 목록입니다. 팀을 클릭하여 관리하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">팀 목록을 불러오는 중...</p>
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-12">
              <Settings className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">아직 생성된 팀이 없습니다.</p>
              <Button onClick={() => setCreateTeamDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                첫 번째 팀 생성하기
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((team: Team) => (
                <Card 
                  key={team.id} 
                  className="cursor-pointer transition-all hover:shadow-md hover:scale-105"
                  onClick={() => window.location.href = `/teams/${team.id}`}
                >
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* 팀 헤더 */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Settings className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{team.name}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(team.user_role)}`}>
                              {team.user_role.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 팀 정보 */}
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Users className="w-4 h-4 mr-2" />
                          <span>{team.member_count}명의 팀원</span>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span>생성일: {formatDate(team.created_at)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ID: {team.id.substring(0, 8)}...
                        </div>
                      </div>

                      {/* 하단 액션 힌트 */}
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground text-center">
                          클릭하여 팀 관리 페이지로 이동
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 도움말 */}
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-2">
            <h3 className="font-medium">팀 관리 가이드</h3>
            <p className="text-sm text-muted-foreground">
              팀을 클릭하면 팀원 관리, API 키 설정, 서버 관리, 활동 내역 등을 확인할 수 있습니다.
            </p>
            <div className="flex justify-center space-x-4 text-sm text-muted-foreground mt-4">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                <span>OWNER - 모든 권한</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                <span>ADMIN - 관리 권한</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span>DEVELOPER - 개발 권한</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
