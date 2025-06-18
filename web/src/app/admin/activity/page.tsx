'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Calendar,
  Search,
  Clock,
  Shield,
  CheckCircle,
  AlertTriangle,
  Users,
  Database,
  Code
} from 'lucide-react';

export default function ActivityPage() {
  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            시스템 활동
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              준비중
            </Badge>
          </h2>
          <p className="text-muted-foreground">시스템 전체의 활동을 모니터링하는 기능을 준비 중입니다</p>
        </div>
      </div>

      {/* 준비중 상태 카드 */}
      <Card className="border-dashed border-2 border-muted-foreground/20">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="mb-6">
            <Activity className="h-24 w-24 text-muted-foreground/40" />
          </div>
          
          <div className="text-center space-y-4 max-w-lg">
            <h3 className="text-xl font-semibold text-muted-foreground">
              시스템 활동 로그 시스템 개발 중
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              사용자 활동, 시스템 이벤트, API 호출 등을 실시간으로 모니터링하고 분석할 수 있는 
              포괄적인 활동 로그 시스템을 개발하고 있습니다.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3 text-center">
            <div className="space-y-2">
              <div className="h-12 w-12 mx-auto rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-medium">사용자 활동 추적</h4>
              <p className="text-sm text-muted-foreground">
                로그인, 프로젝트 생성, 서버 관리 등 모든 사용자 행동 기록
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="h-12 w-12 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                <Database className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-medium">시스템 이벤트</h4>
              <p className="text-sm text-muted-foreground">
                서버 상태 변경, 워커 실행, 에러 발생 등 시스템 레벨 이벤트
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="h-12 w-12 mx-auto rounded-full bg-purple-100 flex items-center justify-center">
                <Code className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="font-medium">API 호출 분석</h4>
              <p className="text-sm text-muted-foreground">
                MCP 도구 호출, 성능 메트릭, 에러율 등 상세 분석
              </p>
            </div>
          </div>

          <div className="mt-8 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              예상 완료: 향후 업데이트에서 제공 예정
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 현재 사용 가능한 대안 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            현재 사용 가능한 모니터링 기능
          </CardTitle>
          <CardDescription>
            시스템 활동 로그가 준비될 때까지 다음 기능들을 활용하실 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <h4 className="font-medium">사용자 관리</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                등록된 사용자 목록과 권한 정보를 확인할 수 있습니다
              </p>
              <Button variant="outline" size="sm" asChild>
                <a href="/admin/users">사용자 관리로 이동</a>
              </Button>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="h-5 w-5 text-green-600" />
                <h4 className="font-medium">워커 관리</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                백그라운드 워커 상태와 실행 이력을 모니터링할 수 있습니다
              </p>
              <Button variant="outline" size="sm" asChild>
                <a href="/admin/workers">워커 관리로 이동</a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}