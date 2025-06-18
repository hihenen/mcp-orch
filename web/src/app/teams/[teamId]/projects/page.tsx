'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TeamLayout } from '@/components/teams/TeamLayout';
import { useTeamStore } from '@/stores/teamStore';
import { toast } from 'sonner';
import { 
  Users, 
  Server, 
  Settings, 
  Plus,
  FolderOpen
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  member_count: number;
  server_count: number;
}

export default function TeamProjectsPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const { selectedTeam, isTeamAdmin } = useTeamStore();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createProjectDialog, setCreateProjectDialog] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    if (teamId) {
      loadProjects();
    }
  }, [teamId]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      console.log(`🔍 Loading projects for team: ${teamId}`);
      
      const response = await fetch(`/api/teams/${teamId}/projects`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const projectData = await response.json();
        console.log(`✅ Successfully loaded ${projectData.length} projects`);
        setProjects(projectData);
      } else {
        const errorText = await response.text();
        console.error('Failed to load projects:', response.status, response.statusText, errorText);
        toast.error(`프로젝트 로드 실패: ${response.status} ${errorText}`);
        setProjects([]); // 오류 시 빈 배열로 설정
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
      toast.error('프로젝트 로드 중 네트워크 오류가 발생했습니다.');
      setProjects([]); // 오류 시 빈 배열로 설정
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) {
      toast.error('프로젝트 이름을 입력해주세요.');
      return;
    }

    try {
      const response = await fetch(`/api/teams/${teamId}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newProject)
      });

      if (response.ok) {
        const createdProject = await response.json();
        setProjects(prev => [createdProject, ...prev]);
        setCreateProjectDialog(false);
        setNewProject({ name: '', description: '' });
        toast.success('프로젝트가 생성되었습니다.');
      } else {
        const errorText = await response.text();
        console.error('Failed to create project:', errorText);
        toast.error(`프로젝트 생성에 실패했습니다: ${errorText}`);
      }
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('프로젝트 생성 중 오류가 발생했습니다.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const canAccess = (requiredRole: 'owner' | 'developer' | 'reporter') => {
    if (!selectedTeam?.role) return false;
    const roleHierarchy = { owner: 3, developer: 2, reporter: 1 };
    const userRoleLevel = roleHierarchy[selectedTeam.role.toLowerCase() as keyof typeof roleHierarchy] || 0;
    return userRoleLevel >= roleHierarchy[requiredRole];
  };

  if (loading) {
    return (
      <TeamLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-muted-foreground">프로젝트를 불러오는 중...</p>
          </div>
        </div>
      </TeamLayout>
    );
  }

  return (
    <TeamLayout>
      <div className="space-y-6">
        {/* 헤더 섹션 */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <FolderOpen className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-green-900">프로젝트 관리</h3>
          </div>
          <p className="text-sm text-green-700">
            팀에서 진행 중인 프로젝트를 관리하고 새로운 프로젝트를 생성할 수 있습니다.
          </p>
        </div>

        {/* 프로젝트 목록 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>프로젝트 목록</CardTitle>
                <CardDescription>팀에서 진행 중인 프로젝트 목록</CardDescription>
              </div>
              {canAccess('developer') && (
                <Dialog open={createProjectDialog} onOpenChange={setCreateProjectDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      새 프로젝트 생성
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>새 프로젝트 생성</DialogTitle>
                      <DialogDescription>
                        새로운 프로젝트를 생성합니다.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="projectName">프로젝트 이름</Label>
                        <Input
                          id="projectName"
                          value={newProject.name}
                          onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="프로젝트 이름을 입력하세요"
                        />
                      </div>
                      <div>
                        <Label htmlFor="projectDescription">설명 (선택사항)</Label>
                        <Input
                          id="projectDescription"
                          value={newProject.description}
                          onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="프로젝트 설명을 입력하세요"
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setCreateProjectDialog(false)}>
                          취소
                        </Button>
                        <Button onClick={handleCreateProject}>
                          생성
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {projects.length > 0 ? (
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
                          <Button size="sm" className="flex-1" asChild>
                            <Link href={`/projects/${project.id}/overview`}>
                              프로젝트 열기
                            </Link>
                          </Button>
                          {canAccess('owner') && (
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/projects/${project.id}/settings`}>
                                <Settings className="w-4 h-4" />
                              </Link>
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
      </div>
    </TeamLayout>
  );
}