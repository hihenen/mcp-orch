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
  Home,
  FolderOpen
} from 'lucide-react';
import { useTeamStore, Organization } from '@/stores/teamStore';
import { cn } from '@/lib/utils';

interface TeamLayoutProps {
  children: ReactNode;
}

export function TeamLayout({ children }: TeamLayoutProps) {
  const params = useParams();
  const pathname = usePathname();
  const teamId = params.teamId as string;
  
  console.log('🔍 [LAYOUT_DEBUG] TeamLayout rendered with teamId:', teamId);
  
  const { 
    selectedTeam,
    userTeams,
    loading,
    setSelectedTeam,
    getTeamById
  } = useTeamStore();
  
  console.log('🔍 [LAYOUT_DEBUG] TeamStore state:', {
    selectedTeam,
    userTeamsCount: userTeams?.length,
    loading
  });

  useEffect(() => {
    if (teamId && userTeams.length > 0) {
      const team = getTeamById(teamId);
      if (team && (!selectedTeam || selectedTeam.id !== teamId)) {
        setSelectedTeam(team);
      }
    }
  }, [teamId, userTeams, selectedTeam, setSelectedTeam, getTeamById]);

  const navigationItems = [
    {
      label: 'Overview',
      href: `/teams/${teamId}/overview`,
      icon: BarChart3,
      description: '팀 개요'
    },
    {
      label: 'Projects',
      href: `/teams/${teamId}/projects`,
      icon: FolderOpen,
      description: '팀 프로젝트'
    },
    {
      label: 'Members',
      href: `/teams/${teamId}/members`,
      icon: Users,
      description: '팀 멤버 관리'
    },
    {
      label: 'Servers',
      href: `/teams/${teamId}/servers`,
      icon: Server,
      description: 'MCP 서버 관리'
    },
    {
      label: 'Tools',
      href: `/teams/${teamId}/tools`,
      icon: FileText,
      description: '사용 가능한 도구'
    },
    {
      label: 'Activity',
      href: `/teams/${teamId}/activity`,
      icon: Activity,
      description: '팀 활동'
    },
    {
      label: 'API Keys',
      href: `/teams/${teamId}/api-keys`,
      icon: Key,
      description: 'API 키 관리'
    },
    {
      label: 'Settings',
      href: `/teams/${teamId}/settings`,
      icon: Settings,
      description: '팀 설정'
    }
  ];

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">팀 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!selectedTeam) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground">팀을 찾을 수 없습니다.</p>
          <Button asChild className="mt-4">
            <Link href="/teams">팀 목록으로 돌아가기</Link>
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
            <Link href="/teams" className="hover:text-foreground">
              Teams
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">{selectedTeam.name}</span>
          </div>
        </div>
      </div>

      {/* 팀 헤더 */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-foreground truncate">
                  {selectedTeam.name}
                </h1>
                {selectedTeam.role && (
                  <Badge variant="outline" className={
                    selectedTeam.role === 'OWNER' ? 'border-yellow-300 text-yellow-700 bg-yellow-50' :
                    selectedTeam.role === 'ADMIN' ? 'border-blue-300 text-blue-700 bg-blue-50' :
                    'border-gray-300 text-gray-700 bg-gray-50'
                  }>
                    {selectedTeam.role === 'OWNER' ? '소유자' : 
                     selectedTeam.role === 'ADMIN' ? '관리자' : '멤버'}
                  </Badge>
                )}
              </div>
              {selectedTeam.description && (
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {selectedTeam.description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{selectedTeam.member_count || 0}명</span>
                </div>
                {selectedTeam.created_at && (
                  <div>
                    생성일: {new Date(selectedTeam.created_at).toLocaleDateString('ko-KR')}
                  </div>
                )}
              </div>
              
              {/* 디버깅 정보 표시 */}
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                <div>🔍 DEBUG - Team Data:</div>
                <div>Name: {selectedTeam.name}</div>
                <div>Description: {selectedTeam.description || 'No description'}</div>
                <div>Member Count: {selectedTeam.member_count}</div>
                <div>Created At: {selectedTeam.created_at}</div>
                <div>Team ID: {selectedTeam.id}</div>
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