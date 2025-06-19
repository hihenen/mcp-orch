'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import { useSession } from 'next-auth/react';
import { 
  Users, 
  Settings, 
  Activity, 
  Zap,
  Home,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { isAdmin } = useAdminPermission();

  // 관리자 권한 체크
  useEffect(() => {
    if (status === 'loading') return; // 로딩 중에는 체크하지 않음
    
    if (!session) {
      // 세션이 없으면 로그인 페이지로 리다이렉트
      router.push('/auth/signin?callbackUrl=' + encodeURIComponent(pathname));
      return;
    }
    
    if (!isAdmin) {
      // 관리자가 아니면 프로젝트 페이지로 리다이렉트
      router.push('/projects');
      return;
    }
  }, [session, status, isAdmin, router, pathname]);

  // 로딩 중이거나 권한이 없으면 로딩 표시
  if (status === 'loading' || !session || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <p className="text-muted-foreground">
            {status === 'loading' ? '로딩 중...' : '권한을 확인하는 중...'}
          </p>
        </div>
      </div>
    );
  }

  const navigationItems = [
    {
      label: '사용자 관리',
      href: '/admin/users',
      icon: Users,
      description: '사용자 계정 및 권한 관리',
      available: true
    },
    {
      label: '시스템 활동',
      href: '/admin/activity',
      icon: Activity,
      description: '시스템 로그 및 감사 추적',
      available: false,
      comingSoon: true
    },
    {
      label: '워커 관리',
      href: '/admin/workers',
      icon: Zap,
      description: 'APScheduler 백그라운드 워커',
      available: true
    }
  ];

  const isActive = (href: string) => {
    if (href === '/admin' && pathname === '/admin') {
      return true;
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

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
            <span className="text-foreground font-medium flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Admin
            </span>
          </div>
        </div>
      </div>

      {/* 관리자 헤더 */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">
                  관리자 패널
                </h1>
                <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">
                  <Shield className="h-3 w-3 mr-1" />
                  Admin
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                시스템 전체를 관리하고 모니터링할 수 있습니다
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 네비게이션 탭 */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-6">
          <nav className="flex space-x-0">
            {/* 개요 탭 */}
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-2 px-4 py-3 border-b-2 transition-colors text-sm font-medium",
                pathname === '/admin'
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
              )}
              title="관리자 대시보드"
            >
              <Home className="h-4 w-4" />
              개요
            </Link>
            
            {/* 기본 메뉴들 */}
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              if (!item.available) {
                return (
                  <div
                    key={item.href}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 border-b-2 transition-colors text-sm font-medium",
                      "border-transparent text-muted-foreground/60 cursor-not-allowed"
                    )}
                    title={`${item.description} (준비중)`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                    {item.comingSoon && (
                      <Badge variant="outline" className="ml-2 text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                        준비중
                      </Badge>
                    )}
                  </div>
                );
              }
              
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