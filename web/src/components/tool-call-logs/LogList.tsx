/**
 * ToolCallLog 리스트 컴포넌트
 * Datadog/Sentry 스타일의 무한 스크롤 로그 리스트
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LogItem } from './LogItem';
import { LogFilter } from './LogFilter';
import { LogMetrics } from './LogMetrics';
import { 
  ToolCallLog, 
  ToolCallLogListResponse, 
  ToolCallLogMetrics,
  LogFilter as LogFilterType 
} from '@/types/tool-call-logs';
import ToolCallLogService from '@/services/tool-call-logs';
import { cn } from '@/lib/utils';

interface LogListProps {
  projectId: string;
  serverId?: string;
  className?: string;
}

export function LogList({ projectId, serverId, className }: LogListProps) {
  // 상태 관리
  const [logs, setLogs] = useState<ToolCallLog[]>([]);
  const [metrics, setMetrics] = useState<ToolCallLogMetrics | null>(null);
  const [filter, setFilter] = useState<LogFilterType>({
    project_id: projectId,
    server_id: serverId,
    time_range: '30m'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedLogIds, setExpandedLogIds] = useState<Set<number>>(new Set());
  const [hasNextPage, setHasNextPage] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Refs
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 로그 데이터 로드
  const loadLogs = useCallback(async (page = 1, append = false) => {
    try {
      if (page === 1) {
        setIsLoading(true);
        setError(null);
      } else {
        setIsLoadingMore(true);
      }

      const response = await ToolCallLogService.getToolCallLogs({
        ...filter,
        page,
        page_size: 50
      });

      if (append) {
        setLogs(prev => [...prev, ...response.logs]);
      } else {
        setLogs(response.logs);
      }

      setHasNextPage(response.has_next);
      setCurrentPage(page);

    } catch (err) {
      console.error('Failed to load logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load logs');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [filter]);

  // 메트릭 데이터 로드
  const loadMetrics = useCallback(async () => {
    try {
      setIsLoadingMetrics(true);
      
      const metricsData = await ToolCallLogService.getToolCallMetrics({
        project_id: projectId,
        server_id: serverId,
        time_range: filter.time_range,
        start_time: filter.start_time,
        end_time: filter.end_time
      });

      setMetrics(metricsData);
    } catch (err) {
      console.error('Failed to load metrics:', err);
    } finally {
      setIsLoadingMetrics(false);
    }
  }, [projectId, serverId, filter.time_range, filter.start_time, filter.end_time]);

  // 다음 페이지 로드
  const loadNextPage = useCallback(() => {
    if (!isLoadingMore && hasNextPage) {
      loadLogs(currentPage + 1, true);
    }
  }, [isLoadingMore, hasNextPage, currentPage, loadLogs]);

  // 새로고침
  const handleRefresh = useCallback(() => {
    setCurrentPage(1);
    loadLogs(1, false);
    loadMetrics();
  }, [loadLogs, loadMetrics]);

  // 필터 변경 처리
  const handleFilterChange = useCallback((newFilter: LogFilterType) => {
    setFilter(newFilter);
    setCurrentPage(1);
    setExpandedLogIds(new Set());
  }, []);

  // 로그 아이템 펼침/접힘 토글
  const toggleLogExpanded = useCallback((logId: number) => {
    setExpandedLogIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  }, []);

  // 무한 스크롤 설정
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isLoadingMore) {
          loadNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasNextPage, isLoadingMore, loadNextPage]);

  // 자동 새로고침 설정
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshIntervalRef.current = setInterval(() => {
        if (!isLoading && !isLoadingMore) {
          handleRefresh();
        }
      }, 30000); // 30초마다 자동 새로고침
    } else {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    }

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [autoRefresh, isLoading, isLoadingMore, handleRefresh]);

  // 초기 데이터 로드
  useEffect(() => {
    loadLogs(1, false);
    loadMetrics();
  }, [loadLogs, loadMetrics]);

  // 필터 변경 시 데이터 다시 로드
  useEffect(() => {
    loadLogs(1, false);
    loadMetrics();
  }, [filter]);

  // 정리 작업
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className={cn("space-y-6", className)}>
      {/* 메트릭 대시보드 */}
      {metrics && (
        <LogMetrics 
          metrics={metrics} 
          isLoading={isLoadingMetrics}
        />
      )}

      {/* 필터 */}
      <LogFilter
        filter={filter}
        onFilterChange={handleFilterChange}
        onRefresh={handleRefresh}
        isLoading={isLoading}
      />

      {/* 자동 새로고침 토글 */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {logs.length > 0 && (
            <span>총 {logs.length}개의 로그</span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(
              autoRefresh && "bg-green-50 border-green-200 text-green-700"
            )}
          >
            <RefreshCw className={cn(
              "h-3 w-3 mr-1",
              autoRefresh && "animate-pulse"
            )} />
            자동 새로고침 {autoRefresh ? 'ON' : 'OFF'}
          </Button>
        </div>
      </div>

      {/* 에러 표시 */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">로그 로드 실패</span>
            </div>
            <p className="text-sm text-red-600 mt-1">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="mt-2"
            >
              다시 시도
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 로딩 상태 (첫 로드) */}
      {isLoading && logs.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            <p className="text-sm text-muted-foreground">로그를 로드하는 중...</p>
          </div>
        </div>
      )}

      {/* 로그 없음 */}
      {!isLoading && logs.length === 0 && !error && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-4">📄</div>
            <h3 className="text-lg font-medium mb-2">로그가 없습니다</h3>
            <p className="text-sm text-muted-foreground mb-4">
              현재 필터 조건에 맞는 로그가 없습니다.
            </p>
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              새로고침
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 로그 리스트 */}
      {logs.length > 0 && (
        <div className="space-y-3">
          {logs.map((log) => (
            <LogItem
              key={log.id}
              log={log}
              isExpanded={expandedLogIds.has(log.id)}
              onToggleExpanded={toggleLogExpanded}
            />
          ))}
        </div>
      )}

      {/* 무한 스크롤 로더 */}
      {hasNextPage && (
        <div 
          ref={loadMoreRef}
          className="flex items-center justify-center py-6"
        >
          {isLoadingMore ? (
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">더 많은 로그를 로드하는 중...</span>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={loadNextPage}
              disabled={isLoadingMore}
            >
              더 보기
            </Button>
          )}
        </div>
      )}

      {/* 로드 완료 표시 */}
      {!hasNextPage && logs.length > 0 && (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">
            모든 로그를 표시했습니다.
          </p>
        </div>
      )}
    </div>
  );
}