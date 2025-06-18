import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface WorkerJob {
  id: string;
  name: string;
  next_run: string | null;
  trigger: string;
}

export interface WorkerConfig {
  server_check_interval: number;
  max_workers: number;
  coalesce: boolean;
  max_instances: number;
}

export interface WorkerStatus {
  running: boolean;
  jobs: WorkerJob[];
  config: WorkerConfig;
  last_execution: string | null;
  job_history_count: number;
}

export interface JobHistoryEntry {
  timestamp: string;
  duration: number;
  status: string;
  checked_count?: number;
  updated_count?: number;
  error_count?: number;
  error?: string;
}

export function useWorkerStatus() {
  const [status, setStatus] = useState<WorkerStatus | null>(null);
  const [history, setHistory] = useState<JobHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/workers/status', {
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch worker status');
      }

      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to fetch worker status:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async (limit: number = 50) => {
    try {
      const response = await fetch(`/api/workers/history?limit=${limit}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch worker history');
      }

      const data = await response.json();
      setHistory(data);
    } catch (err) {
      console.error('Failed to fetch worker history:', err);
      toast.error('워커 실행 이력 조회 실패');
    }
  }, []);

  const startWorker = useCallback(async () => {
    try {
      const response = await fetch('/api/workers/start', {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start worker');
      }

      const data = await response.json();
      toast.success(data.message);
      await fetchStatus(); // 상태 새로고침
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`워커 시작 실패: ${errorMessage}`);
      throw err;
    }
  }, [fetchStatus]);

  const stopWorker = useCallback(async () => {
    try {
      const response = await fetch('/api/workers/stop', {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to stop worker');
      }

      const data = await response.json();
      toast.success(data.message);
      await fetchStatus(); // 상태 새로고침
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`워커 정지 실패: ${errorMessage}`);
      throw err;
    }
  }, [fetchStatus]);

  const restartWorker = useCallback(async () => {
    try {
      const response = await fetch('/api/workers/restart', {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to restart worker');
      }

      const data = await response.json();
      toast.success(data.message);
      await fetchStatus(); // 상태 새로고침
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`워커 재시작 실패: ${errorMessage}`);
      throw err;
    }
  }, [fetchStatus]);

  const updateConfig = useCallback(async (newConfig: Partial<WorkerConfig>) => {
    try {
      const response = await fetch('/api/workers/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newConfig),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update worker config');
      }

      const data = await response.json();
      toast.success(data.message);
      await fetchStatus(); // 상태 새로고침
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`워커 설정 업데이트 실패: ${errorMessage}`);
      throw err;
    }
  }, [fetchStatus]);

  const triggerImmediateCheck = useCallback(async () => {
    try {
      const response = await fetch('/api/workers/check-now', {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to trigger immediate check');
      }

      const data = await response.json();
      toast.success(data.message);
      // 약간의 지연 후 상태 새로고침
      setTimeout(() => {
        fetchStatus();
        fetchHistory();
      }, 1000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`즉시 체크 실행 실패: ${errorMessage}`);
      throw err;
    }
  }, [fetchStatus, fetchHistory]);

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    fetchStatus();
    fetchHistory();
  }, [fetchStatus, fetchHistory]);

  // 자동 새로고침 (30초마다)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchStatus]);

  return {
    status,
    history,
    isLoading,
    error,
    actions: {
      startWorker,
      stopWorker,
      restartWorker,
      updateConfig,
      triggerImmediateCheck,
      refreshStatus: fetchStatus,
      refreshHistory: fetchHistory,
    }
  };
}