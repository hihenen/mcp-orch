'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useWorkerStatus } from '@/hooks/useWorkerStatus';
import { WorkerConfigModal } from '@/components/admin/WorkerConfigModal';
import { WorkerHistoryTable } from '@/components/admin/WorkerHistoryTable';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Settings, 
  Zap,
  Clock,
  Users,
  Activity,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

export default function WorkersPage() {
  const { status, history, isLoading, error, actions } = useWorkerStatus();
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);

  const handleAction = async (actionName: string, action: () => Promise<void>) => {
    setIsActionLoading(actionName);
    try {
      await action();
    } catch (error) {
      console.error(`Failed to execute ${actionName}:`, error);
    } finally {
      setIsActionLoading(null);
    }
  };

  const formatInterval = (seconds: number) => {
    if (seconds < 60) return `${seconds}초`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}분`;
    return `${Math.floor(seconds / 3600)}시간 ${Math.floor((seconds % 3600) / 60)}분`;
  };

  const formatNextRun = (timestamp: string | null) => {
    if (!timestamp) return '예정 없음';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff < 0) return '지금';
    if (diff < 60000) return `${Math.round(diff / 1000)}초 후`;
    if (diff < 3600000) return `${Math.round(diff / 60000)}분 후`;
    
    return date.toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">워커 관리</h2>
            <p className="text-muted-foreground">APScheduler 백그라운드 워커를 관리하고 모니터링합니다</p>
          </div>
        </div>
        
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-muted-foreground">워커 상태를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">워커 관리</h2>
            <p className="text-muted-foreground">APScheduler 백그라운드 워커를 관리하고 모니터링합니다</p>
          </div>
        </div>
        
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">워커 상태 조회 실패</h3>
            <p className="text-muted-foreground text-center mb-4">{error}</p>
            <Button onClick={actions.refreshStatus}>
              <RefreshCw className="h-4 w-4 mr-2" />
              다시 시도
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">워커 관리</h2>
            <p className="text-muted-foreground">APScheduler 백그라운드 워커를 관리하고 모니터링합니다</p>
          </div>
        </div>
        
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">워커 상태를 가져올 수 없습니다.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">워커 관리</h2>
          <p className="text-muted-foreground">
            APScheduler 백그라운드 워커를 관리하고 모니터링합니다
          </p>
        </div>
        <Button
          variant="outline"
          onClick={actions.refreshStatus}
          disabled={isActionLoading === 'refresh'}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isActionLoading === 'refresh' ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      {/* 워커 상태 카드 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">워커 상태</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {status.running ? (
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  실행 중
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <Square className="h-3 w-3 mr-1" />
                  정지됨
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {status.jobs.length}개 작업 등록됨
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">체크 간격</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatInterval(status.config.server_check_interval)}
            </div>
            <p className="text-xs text-muted-foreground">
              서버 상태 체크 주기
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">워커 설정</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status.config.max_workers}개
            </div>
            <p className="text-xs text-muted-foreground">
              최대 동시 실행 워커
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">다음 실행</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {status.jobs.length > 0 ? formatNextRun(status.jobs[0].next_run) : '예정 없음'}
            </div>
            <p className="text-xs text-muted-foreground">
              다음 서버 상태 체크
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 워커 제어 패널 */}
      <Card>
        <CardHeader>
          <CardTitle>워커 제어</CardTitle>
          <CardDescription>
            워커를 시작, 정지하거나 설정을 변경할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {!status.running ? (
              <Button
                onClick={() => handleAction('start', actions.startWorker)}
                disabled={isActionLoading === 'start'}
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="h-4 w-4 mr-2" />
                {isActionLoading === 'start' ? '시작 중...' : '워커 시작'}
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={() => handleAction('stop', actions.stopWorker)}
                disabled={isActionLoading === 'stop'}
              >
                <Square className="h-4 w-4 mr-2" />
                {isActionLoading === 'stop' ? '정지 중...' : '워커 정지'}
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => handleAction('restart', actions.restartWorker)}
              disabled={isActionLoading === 'restart'}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {isActionLoading === 'restart' ? '재시작 중...' : '워커 재시작'}
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowConfigModal(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              설정 변경
            </Button>

            <Button
              variant="outline"
              onClick={() => handleAction('check', actions.triggerImmediateCheck)}
              disabled={isActionLoading === 'check'}
            >
              <Zap className="h-4 w-4 mr-2" />
              {isActionLoading === 'check' ? '실행 중...' : '즉시 체크 실행'}
            </Button>
          </div>

          <Separator className="my-6" />

          {/* 현재 설정 표시 */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="text-sm font-medium mb-2">현재 설정</h4>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">체크 간격:</dt>
                  <dd>{formatInterval(status.config.server_check_interval)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">최대 워커 수:</dt>
                  <dd>{status.config.max_workers}개</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">최대 인스턴스:</dt>
                  <dd>{status.config.max_instances}개</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">중복 작업 병합:</dt>
                  <dd>{status.config.coalesce ? '활성화' : '비활성화'}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">실행 통계</h4>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">총 실행 횟수:</dt>
                  <dd>{status.job_history_count}회</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">마지막 실행:</dt>
                  <dd>
                    {status.last_execution 
                      ? new Date(status.last_execution).toLocaleString('ko-KR')
                      : '없음'
                    }
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 워커 실행 이력 */}
      <WorkerHistoryTable
        history={history}
        isLoading={isActionLoading === 'refreshHistory'}
        onRefresh={() => handleAction('refreshHistory', actions.refreshHistory)}
      />

      {/* 설정 변경 모달 */}
      <WorkerConfigModal
        open={showConfigModal}
        onOpenChange={setShowConfigModal}
        currentConfig={status.config}
        onSave={actions.updateConfig}
      />
    </div>
  );
}