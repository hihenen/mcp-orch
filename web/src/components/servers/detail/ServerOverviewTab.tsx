'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { toast } from 'sonner';
import { ServerTabProps } from './types';
import { formatDateTime } from '@/lib/date-utils';

export function ServerOverviewTab({ server, projectId }: ServerTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* 서버 정보 카드 */}
        <Card>
          <CardHeader>
            <CardTitle>서버 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium text-muted-foreground">전송 타입</div>
                <div>{server.transportType || 'stdio'}</div>
              </div>
              <div>
                <div className="font-medium text-muted-foreground">도구 개수</div>
                <div>{server.tools_count || 0}개</div>
              </div>
              <div>
                <div className="font-medium text-muted-foreground">상태</div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    server.status === 'online' ? 'bg-green-500' :
                    server.status === 'offline' ? 'bg-gray-500' :
                    server.status === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  {server.status === 'online' ? '온라인' : 
                   server.status === 'offline' ? '오프라인' :
                   server.status === 'connecting' ? '연결 중' : '에러'}
                </div>
              </div>
              <div>
                <div className="font-medium text-muted-foreground">마지막 연결</div>
                <div>
                  {server.last_connected 
                    ? formatDateTime(server.last_connected)
                    : '연결 기록 없음'
                  }
                </div>
              </div>
            </div>
            
            {server.lastError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="font-medium text-red-800 text-sm">최근 오류</div>
                <div className="text-red-700 text-sm mt-1">{server.lastError}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 구성 정보 카드 */}
        <Card>
          <CardHeader>
            <CardTitle>구성 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              {server.command && (
                <div>
                  <div className="font-medium text-muted-foreground">명령어</div>
                  <div className="font-mono bg-muted p-2 rounded text-xs">
                    {server.command}
                  </div>
                </div>
              )}
              
              {server.args && server.args.length > 0 && (
                <div>
                  <div className="font-medium text-muted-foreground">인수</div>
                  <div className="font-mono bg-muted p-2 rounded text-xs">
                    {server.args.join(' ')}
                  </div>
                </div>
              )}
              
              {server.cwd && (
                <div>
                  <div className="font-medium text-muted-foreground">작업 디렉토리</div>
                  <div className="font-mono bg-muted p-2 rounded text-xs">
                    {server.cwd}
                  </div>
                </div>
              )}
              
              {server.env && Object.keys(server.env).length > 0 && (
                <div>
                  <div className="font-medium text-muted-foreground">환경 변수</div>
                  <div className="font-mono bg-muted p-2 rounded text-xs space-y-1">
                    {Object.entries(server.env).map(([key, value]) => (
                      <div key={key}>
                        <span className="text-blue-600">{key}</span>=
                        <span className="text-green-600">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cline/Cursor 연결 정보 카드 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Cline/Cursor 연결 정보
          </CardTitle>
          <CardDescription>
            이 서버를 Cline이나 Cursor에서 MCP Orch SSE 방식으로 연결하려면 아래 설정을 복사하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-sm">SSE 엔드포인트</div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const endpoint = `http://localhost:8000/projects/${projectId}/servers/${server.name}/sse`;
                    navigator.clipboard.writeText(endpoint);
                    toast.success('엔드포인트가 클립보드에 복사되었습니다.');
                  }}
                >
                  복사
                </Button>
              </div>
              <div className="font-mono bg-muted p-3 rounded text-sm break-all">
                http://localhost:8000/projects/{projectId}/servers/{server.name}/sse
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-sm">MCP Proxy SSE 설정 JSON</div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const mcpConfig = {
                      mcpServers: {
                        [server.name]: {
                          disabled: false,
                          timeout: 30,
                          url: `http://localhost:8000/projects/${projectId}/servers/${server.name}/sse`,
                          headers: {
                            Authorization: "Bearer YOUR_API_TOKEN"
                          },
                          type: "sse"
                        }
                      }
                    };
                    navigator.clipboard.writeText(JSON.stringify(mcpConfig, null, 2));
                    toast.success('MCP Proxy SSE 설정이 클립보드에 복사되었습니다.');
                  }}
                >
                  복사
                </Button>
              </div>
              <div className="font-mono bg-muted p-3 rounded text-xs overflow-auto max-h-48">
                <pre>{JSON.stringify({
                  mcpServers: {
                    [server.name]: {
                      disabled: false,
                      timeout: 30,
                      url: `http://localhost:8000/projects/${projectId}/servers/${server.name}/sse`,
                      headers: {
                        Authorization: "Bearer YOUR_API_TOKEN"
                      },
                      type: "sse"
                    }
                  }
                }, null, 2)}</pre>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-sm">로컬 직접 설치 JSON (선택사항)</div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const mcpConfig = {
                      mcpServers: {
                        [server.name]: {
                          command: server.command,
                          args: server.args || [],
                          env: server.env || {}
                        }
                      }
                    };
                    navigator.clipboard.writeText(JSON.stringify(mcpConfig, null, 2));
                    toast.success('로컬 설치 설정이 클립보드에 복사되었습니다.');
                  }}
                >
                  복사
                </Button>
              </div>
              <div className="font-mono bg-muted p-3 rounded text-xs overflow-auto max-h-48">
                <pre>{JSON.stringify({
                  mcpServers: {
                    [server.name]: {
                      command: server.command,
                      args: server.args || [],
                      env: server.env || {}
                    }
                  }
                }, null, 2)}</pre>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}