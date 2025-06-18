/**
 * ToolCallLog 메트릭 대시보드 컴포넌트
 * Datadog/Sentry 스타일의 메트릭 요약 표시
 */

'use client';

import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Users,
  Wrench
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ToolCallLogMetrics } from '@/types/tool-call-logs';
import { cn } from '@/lib/utils';

interface LogMetricsProps {
  metrics: ToolCallLogMetrics;
  isLoading?: boolean;
  className?: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

function MetricCard({ title, value, icon, description, trend, className }: MetricCardProps) {
  return (
    <Card className={cn("transition-all duration-200 hover:shadow-md", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-center space-x-2">
              <p className="text-2xl font-bold">{value}</p>
              {trend && (
                <TrendingUp className={cn(
                  "h-4 w-4",
                  trend === 'up' && "text-green-500",
                  trend === 'down' && "text-red-500 rotate-180",
                  trend === 'neutral' && "text-gray-400"
                )} />
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="text-primary/20">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function LogMetrics({ metrics, isLoading = false, className }: LogMetricsProps) {
  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
  const formatDuration = (seconds: number) => {
    if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
    return `${seconds.toFixed(2)}s`;
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* 주요 메트릭 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="총 호출 수"
          value={metrics.total_calls.toLocaleString()}
          icon={<BarChart3 className="h-8 w-8" />}
          description="전체 도구 호출 횟수"
        />

        <MetricCard
          title="성공률"
          value={formatPercentage(metrics.success_rate)}
          icon={<CheckCircle className="h-8 w-8" />}
          description={`${metrics.successful_calls}/${metrics.total_calls} 성공`}
          trend={metrics.success_rate >= 95 ? 'up' : metrics.success_rate >= 80 ? 'neutral' : 'down'}
        />

        <MetricCard
          title="평균 응답시간"
          value={formatDuration(metrics.average_execution_time)}
          icon={<Clock className="h-8 w-8" />}
          description={`P95: ${formatDuration(metrics.p95_execution_time)}`}
          trend={metrics.average_execution_time <= 1 ? 'up' : metrics.average_execution_time <= 5 ? 'neutral' : 'down'}
        />

        <MetricCard
          title="분당 호출수"
          value={metrics.calls_per_minute.toFixed(1)}
          icon={<TrendingUp className="h-8 w-8" />}
          description="평균 호출 빈도"
        />
      </div>

      {/* 상세 통계 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 상태별 분포 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              호출 상태 분포
            </CardTitle>
            <CardDescription>
              상태별 호출 분포 및 에러율 분석
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 성공 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>성공</span>
                </div>
                <span className="font-medium">
                  {metrics.successful_calls} ({formatPercentage(metrics.successful_calls / metrics.total_calls * 100)})
                </span>
              </div>
              <Progress 
                value={metrics.successful_calls / metrics.total_calls * 100} 
                className="h-2 bg-green-100"
              />
            </div>

            {/* 에러 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span>에러</span>
                </div>
                <span className="font-medium">
                  {metrics.error_calls} ({formatPercentage(metrics.error_calls / metrics.total_calls * 100)})
                </span>
              </div>
              <Progress 
                value={metrics.error_calls / metrics.total_calls * 100} 
                className="h-2 bg-red-100"
              />
            </div>

            {/* 타임아웃 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span>타임아웃</span>
                </div>
                <span className="font-medium">
                  {metrics.timeout_calls} ({formatPercentage(metrics.timeout_calls / metrics.total_calls * 100)})
                </span>
              </div>
              <Progress 
                value={metrics.timeout_calls / metrics.total_calls * 100} 
                className="h-2 bg-orange-100"
              />
            </div>
          </CardContent>
        </Card>

        {/* 사용량 통계 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              사용량 통계
            </CardTitle>
            <CardDescription>
              도구 및 세션 사용 현황
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <Wrench className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {metrics.unique_tools}
                </div>
                <div className="text-sm text-blue-600/70">
                  활성 도구
                </div>
              </div>

              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {metrics.unique_sessions}
                </div>
                <div className="text-sm text-purple-600/70">
                  활성 세션
                </div>
              </div>
            </div>

            {/* 성능 지표 */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">중간값 응답시간:</span>
                <span className="font-medium">{formatDuration(metrics.median_execution_time)}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">P95 응답시간:</span>
                <span className="font-medium">{formatDuration(metrics.p95_execution_time)}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">평균 호출/분:</span>
                <span className="font-medium">{metrics.calls_per_minute.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}