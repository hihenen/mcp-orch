import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  Settings, 
  Users, 
  Activity,
  Shield,
  Database,
  Zap
} from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adminMenuItems = [
    {
      href: '/admin/workers',
      icon: Zap,
      title: '워커 관리',
      description: 'APScheduler 백그라운드 워커',
      badge: 'New'
    },
    {
      href: '/admin/users',
      icon: Users,
      title: '사용자 관리',
      description: '사용자 계정 및 권한 관리',
      badge: null
    },
    {
      href: '/admin/settings',
      icon: Settings,
      title: '시스템 설정',
      description: '전역 설정 및 환경 변수',
      badge: null
    },
    {
      href: '/admin/security',
      icon: Shield,
      title: '보안 설정',
      description: 'API 키, 인증 설정',
      badge: null
    },
    {
      href: '/admin/activity',
      icon: Activity,
      title: '시스템 활동',
      description: '로그 및 활동 모니터링',
      badge: null
    },
    {
      href: '/admin/database',
      icon: Database,
      title: '데이터베이스',
      description: '백업, 마이그레이션',
      badge: null
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        {/* 관리자 헤더 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">관리자 페널</h1>
              <p className="text-muted-foreground mt-1">
                MCP Orchestrator 시스템을 관리하고 모니터링하세요
              </p>
            </div>
            <Link href="/">
              <Button variant="outline">
                메인으로 돌아가기
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* 사이드바 메뉴 */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">관리 메뉴</CardTitle>
                <CardDescription>
                  시스템 관리 기능에 접근하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {adminMenuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href}>
                      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="font-medium text-sm">{item.title}</div>
                            <div className="text-xs text-muted-foreground">{item.description}</div>
                          </div>
                        </div>
                        {item.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* 메인 콘텐츠 */}
          <div className="lg:col-span-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}