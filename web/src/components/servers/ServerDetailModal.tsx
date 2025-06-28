'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/date-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Server, 
  Settings, 
  Activity, 
  Code, 
  Power, 
  PowerOff,
  Edit,
  Trash2,
  RefreshCw,
  Clock,
  Terminal,
  Database,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';

interface ServerDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  server: any;
  projectId: string;
  onServerUpdated?: () => void;
  onEditServer?: (server: any) => void;
  onDeleteServer?: (server: any) => void;
}

export function ServerDetailModal({
  open,
  onOpenChange,
  server,
  projectId,
  onServerUpdated,
  onEditServer,
  onDeleteServer
}: ServerDetailModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [serverDetails, setServerDetails] = useState<any>(null);
  const [serverLogs, setServerLogs] = useState<any[]>([]);
  const [serverTools, setServerTools] = useState<any[]>([]);

  // 서버 상세 정보 로드
  const loadServerDetails = async () => {
    if (!server?.id || !projectId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/servers/${server.id}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setServerDetails(data);
      } else {
        console.error('서버 상세 정보 로드 실패:', response.status);
      }
    } catch (error) {
      console.error('서버 상세 정보 로드 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 서버 로그 로드 (모의 데이터)
  const loadServerLogs = async () => {
    // 실제로는 API에서 로그를 가져와야 함
    setServerLogs([
      {
        id: 1,
        timestamp: new Date().toISOString(),
        level: 'info',
        message: '서버가 시작되었습니다.',
        source: 'system'
      },
      {
        id: 2,
        timestamp: new Date(Date.now() - 60000).toISOString(),
        level: 'debug',
        message: 'MCP 프로토콜 초기화 완료',
        source: 'mcp'
      },
      {
        id: 3,
        timestamp: new Date(Date.now() - 120000).toISOString(),
        level: 'warn',
        message: '일부 도구 로드에 실패했습니다.',
        source: 'tools'
      }
    ]);
  };

  // 서버 도구 목록 로드 (모의 데이터)
  const loadServerTools = async () => {
    // 실제로는 API에서 도구 목록을 가져와야 함
    setServerTools([
      {
        id: 1,
        name: 'search_web',
        description: '웹 검색 도구',
        category: 'search',
        enabled: true
      },
      {
        id: 2,
        name: 'get_weather',
        description: '날씨 정보 조회',
        category: 'weather',
        enabled: true
      },
      {
        id: 3,
        name: 'send_email',
        description: '이메일 전송',
        category: 'communication',
        enabled: false
      }
    ]);
  };

  // 서버 토글 핸들러
  const handleToggleServer = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/servers/${server.id}/toggle`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '서버 상태 변경 실패');
      }

      const data = await response.json();
      toast.success(data.message);
      
      if (onServerUpdated) {
        onServerUpdated();
      }
      
      // 서버 상세 정보 새로고침
      loadServerDetails();
    } catch (error) {
      console.error('서버 토글 오류:', error);
      toast.error(`서버 상태 변경 실패: ${error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}`);
    }
  };

  // 서버 재시작 핸들러
  const handleRestartServer = async () => {
    try {
      setIsLoading(true);
      
      // 실제로는 서버 재시작 API를 호출해야 함
      await new Promise(resolve => setTimeout(resolve, 2000)); // 모의 지연
      
      toast.success('서버가 재시작되었습니다.');
      
      if (onServerUpdated) {
        onServerUpdated();
      }
      
      loadServerDetails();
    } catch (error) {
      console.error('서버 재시작 오류:', error);
      toast.error('서버 재시작에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 모달이 열릴 때 데이터 로드
  useEffect(() => {
    if (open && server) {
      loadServerDetails();
      loadServerLogs();
      loadServerTools();
    }
  }, [open, server]);

  if (!server) return null;

  const currentServer = serverDetails || server;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Server className="h-6 w-6" />
              <div>
                <DialogTitle className="text-xl">{currentServer.name}</DialogTitle>
                <DialogDescription>
                  {currentServer.description || '설명 없음'}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={currentServer.status === 'online' ? 'default' : 'secondary'}>
                {currentServer.status === 'online' ? '온라인' : 
                 currentServer.status === 'offline' ? '오프라인' :
                 currentServer.status === 'connecting' ? '연결 중' : '에러'}
              </Badge>
              {!currentServer.is_enabled && (
                <Badge variant="outline">비활성화</Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="tools">도구</TabsTrigger>
            <TabsTrigger value="logs">로그</TabsTrigger>
            <TabsTrigger value="settings">설정</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* 서버 상태 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    서버 상태
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">상태</span>
                    <Badge variant={currentServer.status === 'online' ? 'default' : 'secondary'}>
                      {currentServer.status === 'online' ? '온라인' : 
                       currentServer.status === 'offline' ? '오프라인' :
                       currentServer.status === 'connecting' ? '연결 중' : '에러'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">활성화</span>
                    <Badge variant={!currentServer.is_enabled ? 'outline' : 'default'}>
                      {!currentServer.is_enabled ? '비활성화' : '활성화'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">도구 개수</span>
                    <span className="text-sm font-medium">{currentServer.tools_count || 0}개</span>
                  </div>
                  {currentServer.last_connected && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">마지막 연결</span>
                      <span className="text-sm font-medium">
                        {formatDateTime(currentServer.last_connected)}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 서버 구성 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    구성 정보
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">전송 타입</span>
                    <span className="text-sm font-medium">{currentServer.transport_type || 'stdio'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">명령어</span>
                    <span className="text-sm font-medium font-mono bg-muted px-2 py-1 rounded">
                      {currentServer.command || 'N/A'}
                    </span>
                  </div>
                  {currentServer.cwd && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">작업 디렉토리</span>
                      <span className="text-sm font-medium font-mono bg-muted px-2 py-1 rounded">
                        {currentServer.cwd}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* 명령어 인수 */}
            {currentServer.args && currentServer.args.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Terminal className="h-4 w-4" />
                    명령어 인수
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {currentServer.args.map((arg: string, index: number) => (
                      <div key={index} className="text-sm font-mono bg-muted px-3 py-2 rounded">
                        {arg}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 환경 변수 */}
            {currentServer.env && Object.keys(currentServer.env).length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    환경 변수
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(currentServer.env).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <span className="font-medium">{key}</span>
                        <span className="font-mono bg-muted px-2 py-1 rounded">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 액션 버튼 */}
            <div className="flex items-center gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={handleToggleServer}
                className={!currentServer.is_enabled ? 'text-green-600 hover:text-green-700' : 'text-orange-600 hover:text-orange-700'}
              >
                {!currentServer.is_enabled ? <Power className="h-4 w-4 mr-2" /> : <PowerOff className="h-4 w-4 mr-2" />}
                {!currentServer.is_enabled ? '활성화' : '비활성화'}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleRestartServer}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                재시작
              </Button>
              <Button 
                variant="outline" 
                onClick={() => onEditServer?.(currentServer)}
              >
                <Edit className="h-4 w-4 mr-2" />
                편집
              </Button>
              <Button 
                variant="outline" 
                onClick={() => onDeleteServer?.(currentServer)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                삭제
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="tools" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">사용 가능한 도구</h3>
              <Badge variant="outline">{serverTools.length}개</Badge>
            </div>
            
            {serverTools.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Code className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">사용 가능한 도구가 없습니다.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {serverTools.map((tool) => (
                  <Card key={tool.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{tool.name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {tool.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {tool.description}
                          </p>
                        </div>
                        <Badge variant={tool.enabled ? 'default' : 'secondary'}>
                          {tool.enabled ? '활성화' : '비활성화'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">서버 로그</h3>
              <Button variant="outline" size="sm" onClick={loadServerLogs}>
                <RefreshCw className="h-4 w-4 mr-2" />
                새로고침
              </Button>
            </div>
            
            <Card>
              <CardContent className="p-0">
                <div className="max-h-96 overflow-y-auto">
                  {serverLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">로그가 없습니다.</p>
                    </div>
                  ) : (
                    <div className="space-y-0">
                      {serverLogs.map((log) => (
                        <div key={log.id} className="border-b last:border-b-0 p-4">
                          <div className="flex items-start gap-3">
                            <Badge 
                              variant={
                                log.level === 'error' ? 'destructive' :
                                log.level === 'warn' ? 'secondary' :
                                'outline'
                              }
                              className="text-xs"
                            >
                              {log.level.toUpperCase()}
                            </Badge>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm">{log.message}</p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <span>{formatDateTime(log.timestamp)}</span>
                                <span>•</span>
                                <span>{log.source}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">서버 설정</h3>
              <Button onClick={() => onEditServer?.(currentServer)}>
                <Edit className="h-4 w-4 mr-2" />
                설정 편집
              </Button>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base">기본 정보</CardTitle>
                <CardDescription>서버의 기본 구성 정보입니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">서버 이름</label>
                    <div className="mt-1 text-sm text-muted-foreground">{currentServer.name}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">전송 타입</label>
                    <div className="mt-1 text-sm text-muted-foreground">{currentServer.transport_type || 'stdio'}</div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">설명</label>
                    <div className="mt-1 text-sm text-muted-foreground">{currentServer.description || '설명 없음'}</div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">명령어</label>
                    <div className="mt-1 text-sm font-mono bg-muted p-2 rounded">{currentServer.command || 'N/A'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  위험 구역
                </CardTitle>
                <CardDescription>주의해서 사용해야 하는 작업들입니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">서버 삭제</h4>
                    <p className="text-sm text-muted-foreground">이 서버를 영구적으로 삭제합니다.</p>
                  </div>
                  <Button 
                    variant="destructive" 
                    onClick={() => onDeleteServer?.(currentServer)}
                  >
                    삭제
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
