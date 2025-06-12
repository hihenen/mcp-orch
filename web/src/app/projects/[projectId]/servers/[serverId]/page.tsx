'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft,
  Server, 
  Settings,
  Activity,
  Wrench,
  FileText,
  Play,
  Pause,
  RotateCcw,
  Edit,
  Trash2
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import Link from 'next/link';
import { toast } from 'sonner';

interface Tool {
  name: string;
  description: string;
  schema: any;
}

interface ServerDetail {
  id: string;
  name: string;
  description?: string;
  status: 'online' | 'offline' | 'connecting' | 'error';
  disabled: boolean;
  transportType: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  tools_count?: number;
  tools?: Tool[];
  last_connected?: string;
  lastError?: string;
}

export default function ProjectServerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const serverId = params.serverId as string;
  
  const { selectedProject, loadProject } = useProjectStore();
  const [server, setServer] = useState<ServerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [tools, setTools] = useState<Tool[]>([]);
  const [toolsLoading, setToolsLoading] = useState(false);

  // 서버 상세 정보 로드
  const loadServerDetail = async () => {
    if (!projectId || !serverId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/servers/${serverId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('서버 상세 정보 로드:', data);
        setServer(data);
        // 서버 정보에 도구 목록이 포함되어 있으면 설정
        if (data.tools && Array.isArray(data.tools)) {
          setTools(data.tools);
        }
      } else {
        console.error('서버 상세 정보 로드 실패:', response.status);
        toast.error('서버 정보를 불러올 수 없습니다.');
        router.push(`/projects/${projectId}/servers`);
      }
    } catch (error) {
      console.error('서버 상세 정보 로드 오류:', error);
      toast.error('서버 정보를 불러오는 중 오류가 발생했습니다.');
      router.push(`/projects/${projectId}/servers`);
    } finally {
      setIsLoading(false);
    }
  };

  // 도구 목록 로드 - 서버 상세 정보에서 도구 목록 가져오기
  const loadTools = async () => {
    if (!projectId || !serverId) return;
    
    setToolsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/servers/${serverId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('서버 상세 정보:', data);
        setTools(data.tools || []);
      } else {
        console.error('서버 상세 정보 로드 실패:', response.status);
        setTools([]);
      }
    } catch (error) {
      console.error('서버 상세 정보 로드 오류:', error);
      setTools([]);
    } finally {
      setToolsLoading(false);
    }
  };

  // 페이지 로드 시 프로젝트 정보와 서버 상세 정보 로드
  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    }
    loadServerDetail();
  }, [projectId, serverId, loadProject]);

  // 도구 탭이 활성화될 때 도구 목록 로드
  useEffect(() => {
    if (activeTab === 'tools' && server && server.status === 'online') {
      loadTools();
    }
  }, [activeTab, server?.status]);

  // 서버 토글 핸들러
  const handleToggleServer = async () => {
    if (!server) return;

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
      console.log('서버 토글 성공:', data);
      
      // 서버 정보 새로고침
      loadServerDetail();
      
      toast.success(data.message);
    } catch (error) {
      console.error('서버 토글 오류:', error);
      toast.error(`서버 상태 변경 실패: ${error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}`);
    }
  };

  // 서버 재시작 핸들러
  const handleRestartServer = async () => {
    if (!server) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/servers/${server.id}/restart`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '서버 재시작 실패');
      }

      const data = await response.json();
      console.log('서버 재시작 성공:', data);
      
      // 서버 정보 새로고침
      loadServerDetail();
      
      toast.success('서버가 재시작되었습니다.');
    } catch (error) {
      console.error('서버 재시작 오류:', error);
      toast.error(`서버 재시작 실패: ${error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}`);
    }
  };

  // 서버 상태 새로고침 핸들러
  const handleRefreshStatus = async () => {
    if (!server) return;

    try {
      toast.info('서버 상태를 확인하는 중...');
      
      const response = await fetch(`/api/projects/${projectId}/servers/${server.id}/refresh-status`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '서버 상태 새로고침 실패');
      }

      const data = await response.json();
      console.log('서버 상태 새로고침 성공:', data);
      
      // 서버 정보 새로고침
      loadServerDetail();
      
      toast.success(`서버 상태가 업데이트되었습니다. (도구: ${data.tools_count}개)`);
    } catch (error) {
      console.error('서버 상태 새로고침 오류:', error);
      toast.error(`서버 상태 새로고침 실패: ${error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}`);
    }
  };

  // 서버 삭제 핸들러
  const handleDeleteServer = async () => {
    if (!server) return;

    if (!confirm(`정말로 "${server.name}" 서버를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/servers?serverId=${server.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '서버 삭제 실패');
      }

      const data = await response.json();
      console.log('서버 삭제 성공:', data);
      
      toast.success(`서버 삭제 완료: ${server.name} 서버가 삭제되었습니다.`);
      
      // 서버 목록 페이지로 이동
      router.push(`/projects/${projectId}/servers`);
    } catch (error) {
      console.error('서버 삭제 오류:', error);
      toast.error(`서버 삭제 실패: ${error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">서버 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!server) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Server className="h-12 w-12 text-muted-foreground mb-4 mx-auto" />
          <h3 className="text-lg font-semibold mb-2">서버를 찾을 수 없습니다</h3>
          <p className="text-muted-foreground mb-4">
            요청하신 서버가 존재하지 않거나 접근 권한이 없습니다.
          </p>
          <Link href={`/projects/${projectId}/servers`}>
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              서버 목록으로 돌아가기
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 브레드크럼 */}
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span>/</span>
        <Link href={`/projects/${projectId}`} className="hover:text-foreground">
          {selectedProject?.name || 'Project'}
        </Link>
        <span>/</span>
        <Link href={`/projects/${projectId}/servers`} className="hover:text-foreground">
          Servers
        </Link>
        <span>/</span>
        <span className="text-foreground">{server.name}</span>
      </div>

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/projects/${projectId}/servers`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              뒤로
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{server.name}</h1>
              <Badge variant={server.status === 'online' ? 'default' : 'secondary'}>
                {server.status === 'online' ? '온라인' : 
                 server.status === 'offline' ? '오프라인' :
                 server.status === 'connecting' ? '연결 중' : '에러'}
              </Badge>
              {server.disabled && (
                <Badge variant="outline">비활성화</Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              {server.description || '설명 없음'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={handleRefreshStatus}
            className="text-blue-600 hover:text-blue-700"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            상태 새로고침
          </Button>
          <Button 
            variant="outline"
            onClick={handleToggleServer}
            className={server.disabled ? 'text-green-600 hover:text-green-700' : 'text-orange-600 hover:text-orange-700'}
          >
            {server.disabled ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
            {server.disabled ? '활성화' : '비활성화'}
          </Button>
          <Button variant="outline" onClick={handleRestartServer}>
            <RotateCcw className="h-4 w-4 mr-2" />
            재시작
          </Button>
          <Button variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            편집
          </Button>
          <Button 
            variant="outline" 
            onClick={handleDeleteServer}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            삭제
          </Button>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            개요
          </TabsTrigger>
          <TabsTrigger value="tools" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            도구
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            사용 현황
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            로그
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            설정
          </TabsTrigger>
        </TabsList>

        {/* 개요 탭 */}
        <TabsContent value="overview" className="space-y-6">
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
                        ? new Date(server.last_connected).toLocaleString('ko-KR')
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
                  <div className="font-mono bg-muted p-3 rounded text-xs overflow-auto max-h-32">
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

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="font-medium text-blue-800 text-sm mb-2">연결 방법</div>
                  <div className="text-blue-700 text-sm space-y-1">
                    <div><strong>권장: MCP Proxy SSE 방식</strong></div>
                    <div>1. 위의 "MCP Proxy SSE 설정 JSON"을 복사</div>
                    <div>2. Cline/Cursor의 MCP 설정 파일에 추가</div>
                    <div>3. YOUR_API_TOKEN을 실제 API 토큰으로 교체</div>
                    <div>4. 연결 후 {server.tools_count || 0}개의 도구를 사용할 수 있습니다</div>
                    <div className="mt-2 pt-2 border-t border-blue-200">
                      <div><strong>대안: 로컬 직접 설치</strong></div>
                      <div>• 서버를 로컬에 직접 설치하여 사용하려는 경우</div>
                      <div>• "로컬 직접 설치 JSON" 설정 사용</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 도구 탭 */}
        <TabsContent value="tools" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>사용 가능한 도구</CardTitle>
                  <CardDescription>
                    이 서버에서 제공하는 MCP 도구 목록입니다.
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  onClick={loadTools}
                  disabled={toolsLoading || server?.status !== 'online'}
                >
                  <RotateCcw className={`h-4 w-4 mr-2 ${toolsLoading ? 'animate-spin' : ''}`} />
                  새로고침
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {server?.status !== 'online' ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Wrench className="h-12 w-12 mx-auto mb-4" />
                  <p>서버가 오프라인 상태입니다</p>
                  <p className="text-sm mt-2">서버를 온라인 상태로 만든 후 도구 목록을 확인할 수 있습니다.</p>
                </div>
              ) : toolsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                  <p>도구 목록을 불러오는 중...</p>
                </div>
              ) : tools.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Wrench className="h-12 w-12 mx-auto mb-4" />
                  <p>사용 가능한 도구가 없습니다</p>
                  <p className="text-sm mt-2">이 서버에서 제공하는 도구가 없거나 도구 목록을 불러올 수 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-muted-foreground">
                      총 {tools.length}개의 도구가 사용 가능합니다.
                    </p>
                  </div>
                  
                  <div className="grid gap-4">
                    {tools.map((tool, index) => (
                      <div key={index} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Wrench className="h-4 w-4 text-blue-600" />
                              <h4 className="font-medium text-sm">{tool.name}</h4>
                              <Badge variant="outline" className="text-xs">도구</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              {tool.description || '설명이 제공되지 않았습니다.'}
                            </p>
                            
                            {tool.schema && (
                              <div className="space-y-2">
                                <h5 className="text-xs font-medium text-muted-foreground">매개변수</h5>
                                <div className="bg-muted p-3 rounded text-xs font-mono">
                                  {tool.schema.properties ? (
                                    <div className="space-y-1">
                                      {Object.entries(tool.schema.properties).map(([key, prop]: [string, any]) => (
                                        <div key={key} className="flex items-center gap-2">
                                          <span className="text-blue-600">{key}</span>
                                          <span className="text-muted-foreground">:</span>
                                          <span className="text-green-600">{prop.type || 'any'}</span>
                                          {tool.schema.required?.includes(key) && (
                                            <Badge variant="destructive" className="text-xs px-1 py-0">필수</Badge>
                                          )}
                                          {prop.description && (
                                            <span className="text-muted-foreground text-xs">- {prop.description}</span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">매개변수 정보 없음</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            <Button variant="outline" size="sm">
                              <Play className="h-3 w-3 mr-1" />
                              테스트
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 사용 현황 탭 */}
        <TabsContent value="usage" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* 클라이언트 세션 카드 */}
            <Card>
              <CardHeader>
                <CardTitle>클라이언트 세션</CardTitle>
                <CardDescription>
                  현재 연결된 클라이언트들의 세션 정보입니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div>
                        <div className="font-medium text-sm">Cline Session</div>
                        <div className="text-xs text-muted-foreground">활성 세션 - 2분 전</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">활성</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <div>
                        <div className="font-medium text-sm">Cursor Session</div>
                        <div className="text-xs text-muted-foreground">비활성 - 1시간 전</div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">비활성</Badge>
                  </div>
                  
                  <div className="text-center py-4 text-muted-foreground">
                    <p className="text-sm">총 2개의 세션 기록</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 사용 통계 카드 */}
            <Card>
              <CardHeader>
                <CardTitle>사용 통계</CardTitle>
                <CardDescription>
                  도구 호출 및 사용 패턴 통계입니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">24</div>
                      <div className="text-muted-foreground">총 호출 수</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-green-600">22</div>
                      <div className="text-muted-foreground">성공 호출</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-red-600">2</div>
                      <div className="text-muted-foreground">실패 호출</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">91.7%</div>
                      <div className="text-muted-foreground">성공률</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 최근 도구 호출 로그 */}
          <Card>
            <CardHeader>
              <CardTitle>최근 도구 호출 로그</CardTitle>
              <CardDescription>
                클라이언트에서 실행한 최근 도구 호출 기록입니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <div className="font-medium text-sm">brave_web_search</div>
                      <div className="text-xs text-muted-foreground">
                        Cline에서 호출 - 5분 전
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs text-green-600">성공</Badge>
                    <span className="text-xs text-muted-foreground">1.2초</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <div className="font-medium text-sm">brave_local_search</div>
                      <div className="text-xs text-muted-foreground">
                        Cline에서 호출 - 12분 전
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs text-green-600">성공</Badge>
                    <span className="text-xs text-muted-foreground">0.8초</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <div>
                      <div className="font-medium text-sm">brave_web_search</div>
                      <div className="text-xs text-muted-foreground">
                        Cursor에서 호출 - 1시간 전
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs text-red-600">실패</Badge>
                    <span className="text-xs text-muted-foreground">타임아웃</span>
                  </div>
                </div>

                <div className="text-center py-4 border-t">
                  <Button variant="outline" size="sm">
                    더 많은 로그 보기
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 로그 탭 */}
        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>서버 로그</CardTitle>
              <CardDescription>
                서버 실행 및 오류 로그를 확인할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4" />
                <p>로그를 불러오는 중...</p>
                <p className="text-sm mt-2">서버 로그가 여기에 표시됩니다.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 설정 탭 */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>서버 설정</CardTitle>
              <CardDescription>
                서버 구성을 수정하고 관리할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">서버 편집</h4>
                    <p className="text-sm text-muted-foreground">
                      서버 설정을 수정합니다.
                    </p>
                  </div>
                  <Button variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    편집
                  </Button>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-medium text-red-600 mb-2">위험 구역</h4>
                  <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                    <div>
                      <h5 className="font-medium">서버 삭제</h5>
                      <p className="text-sm text-muted-foreground">
                        이 서버를 영구적으로 삭제합니다. 이 작업은 되돌릴 수 없습니다.
                      </p>
                    </div>
                    <Button 
                      variant="destructive" 
                      onClick={handleDeleteServer}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      삭제
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
