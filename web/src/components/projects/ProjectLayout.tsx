'use client';

import { useEffect, ReactNode } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Server, 
  Settings, 
  Activity, 
  Key,
  FileText,
  BarChart3,
  Home
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { cn } from '@/lib/utils';

interface ProjectLayoutProps {
  children: ReactNode;
}

export function ProjectLayout({ children }: ProjectLayoutProps) {
  const params = useParams();
  const pathname = usePathname();
  const projectId = params.projectId as string;
  
  const { 
    selectedProject, 
    loadProject, 
    isLoading 
  } = useProjectStore();

  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    }
  }, [projectId, loadProject]);

  const navigationItems = [
    {
      label: 'Overview',
      href: `/projects/${projectId}/overview`,
      icon: BarChart3,
      description: '프로젝트 개요'
    },
    {
      label: 'Servers',
      href: `/projects/${projectId}/servers`,
      icon: Server,
      description: 'MCP 서버 관리'
    },
    {
      label: 'Members',
      href: `/projects/${projectId}/members`,
      icon: Users,
      description: '팀 멤버 관리'
    },
    {
      label: 'Tools',
      href: `/projects/${projectId}/tools`,
      icon: FileText,
      description: '사용 가능한 도구'
    },
    {
      label: 'API Keys',
      href: `/projects/${projectId}/api-keys`,
      icon: Key,
      description: 'API 키 관리'
    },
    {
      label: 'Activity',
      href: `/projects/${projectId}/activity`,
      icon: Activity,
      description: '프로젝트 활동'
    },
    {
      label: 'Settings',
      href: `/projects/${projectId}/settings`,
      icon: Settings,
      description: '프로젝트 설정'
    }
  ];

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href);
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

  if (!selectedProject) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground">프로젝트를 찾을 수 없습니다.</p>
          <Button asChild className="mt-4">
            <Link href="/projects">프로젝트 목록으로 돌아가기</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 브레드크럼 */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-6 py-2">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground flex items-center gap-1">
              <Home className="h-3 w-3" />
              Home
            </Link>
            <span>/</span>
            <Link href="/projects" className="hover:text-foreground">
              Projects
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">{selectedProject.name}</span>
          </div>
        </div>
      </div>

      {/* 프로젝트 헤더 */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-foreground truncate">
                  {selectedProject.name}
                </h1>
                <Badge variant="outline">
                  {selectedProject.visibility === 'private' ? '비공개' : '공개'}
                </Badge>
              </div>
              {selectedProject.description && (
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {selectedProject.description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{selectedProject.members_count || 0}명</span>
                </div>
                <div className="flex items-center gap-1">
                  <Server className="h-4 w-4" />
                  <span>{selectedProject.servers_count || 0}개 서버</span>
                </div>
                {selectedProject.created_at && (
                  <div>
                    생성일: {new Date(selectedProject.created_at).toLocaleDateString('ko-KR')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 네비게이션 탭 */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-6">
          <nav className="flex space-x-0">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 border-b-2 transition-colors text-sm font-medium",
                    active
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
                  )}
                  title={item.description}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* 페이지 콘텐츠 */}
      <div className="container mx-auto px-6 py-6">
        {children}
      </div>
    </div>
  );
}