'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  FolderOpen, 
  Users, 
  Server, 
  Calendar,
  MoreHorizontal,
  Settings,
  Trash2,
  ChevronDown,
  LogIn,
  UserPlus,
  Zap,
  Wrench
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { useTeamStore } from '@/stores/teamStore';
import { Project } from '@/types/project';
import Link from 'next/link';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const { 
    projects, 
    loadProjects, 
    createProject, 
    deleteProject,
    isLoading 
  } = useProjectStore();
  
  const { 
    userTeams: teams, 
    loadUserTeams: loadTeams 
  } = useTeamStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    slug: '',
    team_id: ''
  });

  // 로그인 상태 확인
  useEffect(() => {
    if (status === 'loading') return; // 로딩 중이면 대기
    
    // 로그인된 경우에만 프로젝트 및 팀 목록 로드
    if (status === 'authenticated') {
      loadProjects();
      loadTeams();
    }
  }, [status, loadProjects, loadTeams]);

  // 로그인되지 않은 사용자에게는 랜딩 페이지 표시
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="py-16">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              MCP Orch
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Orchestrate Multiple MCP Servers with Ease
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card>
              <CardHeader>
                <Server className="w-10 h-10 mb-2 text-blue-600" />
                <CardTitle>Proxy Mode</CardTitle>
                <CardDescription>
                  Integrate multiple MCP servers into a single endpoint
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Connect and manage all your MCP servers through one unified interface.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Zap className="w-10 h-10 mb-2 text-purple-600" />
                <CardTitle>Batch Mode</CardTitle>
                <CardDescription>
                  Automatically parallelize tasks with LLM
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Let AI analyze and optimize your workflows for maximum efficiency.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Wrench className="w-10 h-10 mb-2 text-green-600" />
                <CardTitle>Easy Integration</CardTitle>
                <CardDescription>
                  Works with Cursor, Cline, and more
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Compatible with your favorite development tools out of the box.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <div className="space-y-4">
              <div className="mb-6">
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
                  Get started with MCP Orch today
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link href="/auth/signin">
                  <Button size="lg" className="w-full sm:w-auto">
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Sign Up
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 로딩 중인 경우
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">인증 상태를 확인하는 중...</p>
        </div>
      </div>
    );
  }

  // 검색 필터링
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 슬러그 자동 생성
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleNameChange = (name: string) => {
    setNewProject(prev => ({
      ...prev,
      name,
      slug: generateSlug(name)
    }));
  };

  const handleCreateProject = async () => {
    try {
      // "personal" 값을 빈 문자열로 변환하여 개인 프로젝트로 생성
      const projectData = {
        ...newProject,
        team_id: newProject.team_id === 'personal' ? '' : newProject.team_id
      };
      await createProject(projectData);
      setIsCreateDialogOpen(false);
      setNewProject({ name: '', description: '', slug: '', team_id: '' });
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (confirm('정말로 이 프로젝트를 삭제하시겠습니까?')) {
      try {
        await deleteProject(projectId);
      } catch (error) {
        console.error('Failed to delete project:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">프로젝트를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">MCP Orch</h1>
          <p className="text-muted-foreground mt-1">
            프로젝트를 관리하고 MCP 서버를 구성하세요
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              새 프로젝트
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 프로젝트 생성</DialogTitle>
              <DialogDescription>
                새로운 프로젝트를 생성하여 MCP 서버를 관리하세요.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">프로젝트 이름</Label>
                <Input
                  id="name"
                  value={newProject.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="예: Frontend Dashboard"
                />
              </div>
              <div>
                <Label htmlFor="description">설명 (선택사항)</Label>
                <Textarea
                  id="description"
                  value={newProject.description}
                  onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="프로젝트에 대한 간단한 설명을 입력하세요"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="slug">슬러그</Label>
                <Input
                  id="slug"
                  value={newProject.slug}
                  onChange={(e) => setNewProject(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="frontend-dashboard"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  URL에 사용될 고유 식별자입니다.
                </p>
              </div>
              <div>
                <Label htmlFor="team">소속 팀 (선택사항)</Label>
                <Select
                  value={newProject.team_id}
                  onValueChange={(value) => setNewProject(prev => ({ ...prev, team_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="팀을 선택하지 않으면 개인 프로젝트로 생성됩니다" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">개인 프로젝트로 생성</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  팀을 선택하지 않으면 개인 프로젝트로 생성되며, 나중에 멤버를 초대할 수 있습니다.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                취소
              </Button>
              <Button 
                onClick={handleCreateProject}
                disabled={!newProject.name || !newProject.slug}
              >
                생성
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 검색 및 필터 */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="프로젝트 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="outline">
          {filteredProjects.length}개 프로젝트
        </Badge>
      </div>

      {/* 프로젝트 목록 */}
      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">프로젝트가 없습니다</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery ? '검색 조건에 맞는 프로젝트가 없습니다.' : '첫 번째 프로젝트를 생성해보세요.'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                새 프로젝트 생성
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {project.description || '설명 없음'}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/projects/${project.id}`}>
                          <Settings className="h-4 w-4 mr-2" />
                          프로젝트 관리
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => handleDeleteProject(project.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        프로젝트 삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {project.member_count || 1}명
                    </div>
                    <div className="flex items-center gap-1">
                      <Server className="h-4 w-4" />
                      {project.server_count || 0}개 서버
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(project.created_at).toLocaleDateString('ko-KR')}
                  </div>

                  <div className="pt-2">
                    <Link href={`/projects/${project.id}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        프로젝트 열기
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 통계 카드 */}
      {projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">총 프로젝트</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projects.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">총 멤버</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {projects.reduce((sum, p) => sum + (p.member_count || 1), 0)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">총 서버</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {projects.reduce((sum, p) => sum + (p.server_count || 0), 0)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
