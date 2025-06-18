'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  Activity, 
  Users, 
  Server, 
  Zap,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';

interface SystemStats {
  totalUsers: number;
  totalProjects: number;
  totalServers: number;
  activeServers: number;
  workerStatus: 'running' | 'stopped' | 'unknown';
  lastWorkerRun: string | null;
}

export default function AdminPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSystemStats = async () => {
      try {
        // 실제 API에서 시스템 통계를 가져오는 로직
        // 현재는 더미 데이터 사용
        await new Promise(resolve => setTimeout(resolve, 1000)); // 로딩 시뮬레이션
        
        setStats({
          totalUsers: 12,
          totalProjects: 8,
          totalServers: 24,
          activeServers: 18,
          workerStatus: 'running',
          lastWorkerRun: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Failed to fetch system stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSystemStats();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-16 animate-pulse mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 시스템 개요 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">시스템 개요</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 사용자</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">
                등록된 사용자 수
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 프로젝트</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalProjects || 0}</div>
              <p className="text-xs text-muted-foreground">
                생성된 프로젝트 수
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">MCP 서버</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.activeServers || 0}/{stats?.totalServers || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                활성/전체 서버
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">워커 상태</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                {stats?.workerStatus === 'running' ? (
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    실행 중
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    정지됨
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                백그라운드 워커
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 빠른 액션 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">빠른 액션</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>워커 관리</span>
              </CardTitle>
              <CardDescription>
                APScheduler 백그라운드 워커를 관리하고 모니터링하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/workers">
                <Button className="w-full">
                  워커 관리로 이동
                </Button>
              </Link>
              {stats?.lastWorkerRun && (
                <p className="text-xs text-muted-foreground mt-2">
                  마지막 실행: {new Date(stats.lastWorkerRun).toLocaleString('ko-KR')}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>사용자 관리</span>
              </CardTitle>
              <CardDescription>
                사용자 계정, 권한, 팀 멤버십을 관리하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" disabled>
                준비 중
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>시스템 모니터링</span>
              </CardTitle>
              <CardDescription>
                시스템 로그, 성능 메트릭, 활동 추적
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" disabled>
                준비 중
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 시스템 상태 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">시스템 상태</h2>
        <Card>
          <CardHeader>
            <CardTitle>주요 컴포넌트 상태</CardTitle>
            <CardDescription>
              시스템의 주요 컴포넌트들의 현재 상태입니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="font-medium">FastAPI 백엔드</div>
                    <div className="text-sm text-muted-foreground">정상 동작 중</div>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800 border-green-200">온라인</Badge>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="font-medium">PostgreSQL 데이터베이스</div>
                    <div className="text-sm text-muted-foreground">연결 상태 양호</div>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800 border-green-200">연결됨</Badge>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {stats?.workerStatus === 'running' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  )}
                  <div>
                    <div className="font-medium">APScheduler 워커</div>
                    <div className="text-sm text-muted-foreground">
                      {stats?.workerStatus === 'running' ? '자동 서버 상태 체크 실행 중' : '워커가 정지된 상태'}
                    </div>
                  </div>
                </div>
                <Badge 
                  className={stats?.workerStatus === 'running' 
                    ? "bg-green-100 text-green-800 border-green-200" 
                    : "bg-yellow-100 text-yellow-800 border-yellow-200"
                  }
                >
                  {stats?.workerStatus === 'running' ? '실행 중' : '정지됨'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}