'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDateTime } from '@/lib/date-utils';
import { RefreshCw, AlertCircle, Info, AlertTriangle, XCircle, Clock, CheckCircle, Code, Settings } from 'lucide-react';

interface ServerLog {
  id: string;
  level: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  category: 'connection' | 'tool_execution' | 'error' | 'status_check' | 'configuration';
  message: string;
  details?: string;
  timestamp: string;
  source?: string;
}

interface ServerConnectionLogsProps {
  projectId: string;
  serverId: string;
}

const LOG_LEVEL_COLORS = {
  debug: 'secondary',
  info: 'default',
  warning: 'secondary',
  error: 'destructive',
  critical: 'destructive'
} as const;

const LOG_LEVEL_ICONS = {
  debug: Info,
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  critical: XCircle
};

export function ServerConnectionLogs({ projectId, serverId }: ServerConnectionLogsProps) {
  const [logs, setLogs] = useState<ServerLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (levelFilter !== 'all') params.set('level', levelFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      params.set('limit', '50');

      const response = await fetch(`/api/projects/${projectId}/servers/${serverId}/logs?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      } else {
        console.error('Failed to fetch logs:', response.status);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [projectId, serverId, levelFilter, categoryFilter]);

  const toggleLogDetails = (logId: string) => {
    setExpandedLog(expandedLog === logId ? null : logId);
  };

  return (
    <div className="space-y-6">
      {/* 헤더 및 필터 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Server Logs</CardTitle>
              <CardDescription>
                View MCP server connection, tool execution, error, and status check logs.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLogs}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Level:</label>
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Category:</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="connection">Connection</SelectItem>
                  <SelectItem value="tool_execution">Tool Execution</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="status_check">Status Check</SelectItem>
                  <SelectItem value="configuration">Configuration</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 로그 리스트 */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Loading logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Info className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No logs to display.</p>
            </div>
          ) : (
            <div className="space-y-0">
              {logs.map((log) => {
                const Icon = LOG_LEVEL_ICONS[log.level];
                const isExpanded = expandedLog === log.id;
                
                return (
                  <div key={log.id} className="border-b last:border-b-0">
                    <div 
                      className="p-4 hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleLogDetails(log.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={LOG_LEVEL_COLORS[log.level]} className="text-xs">
                              {log.level.toUpperCase()}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {log.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(log.timestamp)}
                            </span>
                            {log.source && (
                              <span className="text-xs text-muted-foreground">
                                • {log.source}
                              </span>
                            )}
                          </div>
                          <p className="text-sm">{log.message}</p>
                          
                          {isExpanded && log.details && (
                            <div className="mt-3">
                              {log.category === 'tool_execution' ? (
                                <ToolExecutionDetails details={log.details} />
                              ) : (
                                <div className="p-3 bg-muted rounded text-xs font-mono">
                                  <pre className="whitespace-pre-wrap break-words">
                                    {typeof log.details === 'string' 
                                      ? JSON.stringify(JSON.parse(log.details), null, 2)
                                      : JSON.stringify(log.details, null, 2)
                                    }
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// 도구 실행 로그 전용 상세 정보 컴포넌트
function ToolExecutionDetails({ details }: { details: string | object }) {
  let parsedDetails;
  try {
    parsedDetails = typeof details === 'string' ? JSON.parse(details) : details;
  } catch {
    return (
      <div className="p-3 bg-muted rounded text-xs font-mono">
        <pre className="whitespace-pre-wrap break-words">{String(details)}</pre>
      </div>
    );
  }

  const {
    tool_name,
    arguments: toolArgs,
    success,
    execution_time,
    result,
    error_message,
    error_code
  } = parsedDetails;

  return (
    <div className="p-3 bg-muted rounded text-sm space-y-3">
      {/* 도구 정보 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Code className="h-4 w-4" />
          <span className="font-medium">{tool_name}</span>
        </div>
        {success !== undefined && (
          <Badge variant={success ? 'default' : 'destructive'}>
            {success ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Success
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                Failed
              </>
            )}
          </Badge>
        )}
        {execution_time && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {execution_time.toFixed(3)}s
          </div>
        )}
      </div>

      {/* 인수 */}
      {toolArgs && Object.keys(toolArgs).length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Settings className="h-3 w-3" />
            <span className="text-xs font-medium text-muted-foreground">Arguments:</span>
          </div>
          <div className="pl-5 text-xs font-mono bg-background rounded p-2">
            <pre className="whitespace-pre-wrap break-words">
              {JSON.stringify(toolArgs, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* 결과 또는 에러 */}
      {result && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-3 w-3 text-green-600" />
            <span className="text-xs font-medium text-muted-foreground">Result:</span>
          </div>
          <div className="pl-5 text-xs font-mono bg-background rounded p-2">
            <pre className="whitespace-pre-wrap break-words">
              {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {error_message && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="h-3 w-3 text-red-600" />
            <span className="text-xs font-medium text-muted-foreground">Error:</span>
            {error_code && (
              <Badge variant="destructive" className="text-xs">
                {error_code}
              </Badge>
            )}
          </div>
          <div className="pl-5 text-xs font-mono bg-red-50 text-red-900 rounded p-2 border border-red-200">
            {error_message}
          </div>
        </div>
      )}

      {/* 기타 상세 정보 */}
      {Object.keys(parsedDetails).some(key => 
        !['tool_name', 'arguments', 'success', 'execution_time', 'result', 'error_message', 'error_code'].includes(key)
      ) && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">Raw details</summary>
          <div className="mt-2 p-2 bg-background rounded font-mono">
            <pre className="whitespace-pre-wrap break-words">
              {JSON.stringify(parsedDetails, null, 2)}
            </pre>
          </div>
        </details>
      )}
    </div>
  );
}