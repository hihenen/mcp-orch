'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Activity,
  Server,
  Users,
  Calendar,
  Hash,
  CheckCircle,
  Clock,
  UserPlus,
  Settings
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
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
    projectTools,
    loadProject, 
    loadProjectMembers,
    loadProjectServers,
    isLoading 
  } = useProjectStore();

  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
      loadProjectMembers(projectId);
      loadProjectServers(projectId);
    }
  }, [projectId, loadProject, loadProjectMembers, loadProjectServers]);

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
      <div className="container py-6 space-y-6">
        {/* 헤더 섹션 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">프로젝트 개요</h3>
          </div>
          <p className="text-sm text-blue-700">
            {selectedProject.description || '이 프로젝트의 전반적인 현황과 주요 정보를 한눈에 확인할 수 있습니다.'}
          </p>
        </div>

        {/* 주요 통계 카드들 */}
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
                <p className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  생성일
                </p>
                <p className="text-sm text-muted-foreground ml-6">
                  {new Date(selectedProject.created_at).toLocaleDateString('ko-KR')}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  슬러그
                </p>
                <p className="text-sm text-muted-foreground font-mono ml-6">
                  {selectedProject.slug}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  상태
                </p>
                <div className="ml-6">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    활성
                  </Badge>
                </div>
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
                  {projectServers ? projectServers.filter(s => !s.disabled).length : 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">비활성 서버</span>
                <span className="text-sm font-medium">
                  {projectServers ? projectServers.filter(s => s.disabled).length : 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">총 도구</span>
                <span className="text-sm font-medium">{projectTools ? projectTools.length : 0}</span>
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
                {projectMembers ? projectMembers.slice(0, 3).map((member) => (
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
                )) : []}
                {projectMembers && projectMembers.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{projectMembers.length - 3}명 더
                  </p>
                )}
                {(!projectMembers || projectMembers.length === 0) && (
                  <p className="text-xs text-muted-foreground">아직 멤버가 없습니다</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 최근 활동 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              최근 활동
            </CardTitle>
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

        {/* 빠른 액션 카드들 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = `/projects/${projectId}/members`}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <UserPlus className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">멤버 초대</p>
                  <p className="text-xs text-muted-foreground">팀에 새 멤버 추가</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = `/projects/${projectId}/servers`}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Server className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">서버 관리</p>
                  <p className="text-xs text-muted-foreground">MCP 서버 추가/관리</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = `/projects/${projectId}/tools`}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Activity className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">도구 실행</p>
                  <p className="text-xs text-muted-foreground">MCP 도구 사용</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = `/projects/${projectId}/settings`}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Settings className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">설정</p>
                  <p className="text-xs text-muted-foreground">프로젝트 설정 관리</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProjectLayout>
  );
}