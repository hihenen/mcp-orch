'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { JobHistoryEntry } from '@/hooks/useWorkerStatus';
import { RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { ErrorDetailModal } from './ErrorDetailModal';
import { formatDateTime } from '@/lib/date-utils';

interface WorkerHistoryTableProps {
  history: JobHistoryEntry[];
  isLoading?: boolean;
  onRefresh: () => void;
}

export function WorkerHistoryTable({ history, isLoading, onRefresh }: WorkerHistoryTableProps) {
  const [selectedJob, setSelectedJob] = useState<JobHistoryEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleErrorClick = (job: JobHistoryEntry) => {
    setSelectedJob(job);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedJob(null);
  };
  const formatDuration = (seconds: number) => {
    if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
    if (seconds < 60) return `${seconds.toFixed(1)}초`;
    return `${Math.floor(seconds / 60)}분 ${Math.round(seconds % 60)}초`;
  };

  const formatTimestamp = (timestamp: string) => {
    return formatDateTime(timestamp);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            성공
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            실패
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            {status}
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>워커 실행 이력</CardTitle>
            <CardDescription>
              최근 {history.length}개의 워커 실행 결과
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">아직 실행 이력이 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>실행 시간</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>소요 시간</TableHead>
                  <TableHead>체크된 서버</TableHead>
                  <TableHead>업데이트된 서버</TableHead>
                  <TableHead>동기화된 도구</TableHead>
                  <TableHead>에러 수</TableHead>
                  <TableHead>에러 메시지</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((entry, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-sm">
                      {formatTimestamp(entry.timestamp)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(entry.status)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatDuration(entry.duration)}
                    </TableCell>
                    <TableCell>
                      {entry.checked_count !== undefined ? (
                        <Badge variant="outline">
                          {entry.checked_count}개
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.updated_count !== undefined ? (
                        <Badge variant="secondary">
                          {entry.updated_count}개
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.tools_synced_count !== undefined ? (
                        entry.tools_synced_count > 0 ? (
                          <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
                            {entry.tools_synced_count}개
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-600">
                            0개
                          </Badge>
                        )
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.error_count !== undefined ? (
                        entry.error_count > 0 ? (
                          <Badge variant="destructive">
                            {entry.error_count}개
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-600">
                            0개
                          </Badge>
                        )
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.error ? (
                        <div 
                          className="max-w-xs cursor-pointer hover:bg-muted/50 rounded px-2 py-1 transition-colors"
                          onClick={() => handleErrorClick(entry)}
                          title="Click to view full error details"
                        >
                          <p className="text-sm text-red-600 truncate">
                            {entry.error}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <ErrorDetailModal
        open={isModalOpen}
        onClose={handleModalClose}
        jobEntry={selectedJob}
      />
    </Card>
  );
}