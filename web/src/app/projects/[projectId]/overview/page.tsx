'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users, 
  Server, 
  Activity,
  FileText
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { useToolStore } from '@/stores/toolStore';
import { ProjectLayout } from '@/components/projects/ProjectLayout';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getRoleBadgeColor(role: string): string {
  switch (role?.toLowerCase()) {
    case 'owner':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'developer':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'reporter':
      return 'bg-gray-50 text-gray-700 border-gray-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

export default function ProjectOverviewPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  
  const { 
    selectedProject, 
    projectMembers, 
    projectServers,
    loadProject, 
    loadProjectMembers,
    loadProjectServers,
    isLoading 
  } = useProjectStore();
  
  const { tools: projectTools, loadTools } = useToolStore();

  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
      loadProjectMembers(projectId);
      loadProjectServers(projectId);
      loadTools();
    }
  }, [projectId, loadProject, loadProjectMembers, loadProjectServers, loadTools]);

  if (isLoading) {
    return (
      <ProjectLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-muted-foreground">프로젝트 정보를 불러오는 중...</p>
          </div>
        </div>
      </ProjectLayout>
    );
  }

  if (!selectedProject) {
    return (
      <ProjectLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">프로젝트를 찾을 수 없습니다.</p>
        </div>
      </ProjectLayout>
    );
  }

  return (
    <ProjectLayout>
      <div className="space-y-6">
        {/* 통계 카드들 */}
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

        {/* 빠른 작업 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle>빠른 작업</CardTitle>
            <CardDescription>자주 사용하는 기능들에 빠르게 접근</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <Server className="h-6 w-6 text-blue-500" />
                  <div>
                    <p className="font-medium">서버 추가</p>
                    <p className="text-sm text-muted-foreground">새 MCP 서버 추가</p>
                  </div>
                </div>
              </div>
              <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <Users className="h-6 w-6 text-green-500" />
                  <div>
                    <p className="font-medium">멤버 초대</p>
                    <p className="text-sm text-muted-foreground">새 팀원 초대</p>
                  </div>
                </div>
              </div>
              <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-purple-500" />
                  <div>
                    <p className="font-medium">도구 탐색</p>
                    <p className="text-sm text-muted-foreground">사용 가능한 도구</p>
                  </div>
                </div>
              </div>
              <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <Activity className="h-6 w-6 text-orange-500" />
                  <div>
                    <p className="font-medium">활동 보기</p>
                    <p className="text-sm text-muted-foreground">프로젝트 활동</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProjectLayout>
  );
}