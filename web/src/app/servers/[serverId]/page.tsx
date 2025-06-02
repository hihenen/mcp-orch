'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { ArrowLeft, RefreshCw, Settings, FileText, Power, Server, Cpu, HardDrive, Search, Copy, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { MCPServer, MCPTool } from '@/types';
import { useServerStore } from '@/stores/serverStore';
import { useToolStore } from '@/stores/toolStore';
import { ToolExecutionModal } from '@/components/tools/ToolExecutionModal';
import { ExecutionTimeline } from '@/components/tools/ExecutionTimeline';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';

export default function ServerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const serverId = params.serverId as string;

  const { servers, fetchServers } = useServerStore();
  const { tools, fetchTools, getToolsByServerId } = useToolStore();
  const [server, setServer] = useState<MCPServer | null>(null);
  const [serverTools, setServerTools] = useState<MCPTool[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTool, setSelectedTool] = useState<MCPTool | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const loadServerData = async () => {
      setIsLoading(true);
      try {
        // Fetch servers if not already loaded
        if (servers.length === 0) {
          await fetchServers();
        }
        
        // Find the server
        const foundServer = servers.find(s => s.name === serverId);
        if (foundServer) {
          setServer(foundServer);
        }

        // Fetch tools if not already loaded
        if (tools.length === 0) {
          await fetchTools();
        }

        // Get tools for this server
        const serverTools = getToolsByServerId(serverId);
        setServerTools(serverTools);
      } finally {
        setIsLoading(false);
      }
    };

    loadServerData();
  }, [serverId, servers, tools, fetchServers, fetchTools, getToolsByServerId]);

  // 서버 목록이 업데이트되면 현재 서버 정보도 업데이트
  useEffect(() => {
    if (servers.length > 0 && serverId) {
      const updatedServer = servers.find(s => s.name === serverId);
      if (updatedServer) {
        setServer(updatedServer);
      }
    }
  }, [servers, serverId]);

  // 도구 목록이 업데이트되면 서버별 도구도 업데이트
  useEffect(() => {
    if (serverId) {
      const updatedServerTools = getToolsByServerId(serverId);
      setServerTools(updatedServerTools);
    }
  }, [tools, serverId, getToolsByServerId]);

  const filteredTools = serverTools.filter(tool =>
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBack = () => {
    router.push('/dashboard');
  };

  const handleRestart = async () => {
    try {
      const result = await api.restartServer(serverId);
      if (result.status === 'success') {
        // 서버 목록 새로고침
        await fetchServers();
        
        // 도구 목록도 새로고침
        await fetchTools();
        
        // 서버별 도구 다시 가져오기
        const updatedServerTools = getToolsByServerId(serverId);
        setServerTools(updatedServerTools);
        
        // 성공 메시지 표시 (나중에 토스트로 변경 가능)
        console.log(result.message);
      }
    } catch (error) {
      console.error('Failed to restart server:', error);
    }
  };

  const handleConfigure = () => {
    // Configuration 페이지로 이동
    router.push('/config');
  };

  const handleViewLogs = () => {
    // 로그 페이지로 이동 (서버 필터링)
    router.push(`/logs?server=${serverId}`);
  };

  const handleToggleStatus = async () => {
    try {
      const result = await api.toggleServer(serverId);
      if (result.status === 'success') {
        // 서버 목록 새로고침
        await fetchServers();
        
        // 도구 목록도 새로고침 (서버가 활성화되면 도구가 로드됨)
        await fetchTools();
        
        // 서버별 도구 다시 가져오기
        const updatedServerTools = getToolsByServerId(serverId);
        setServerTools(updatedServerTools);
        
        // 성공 메시지 표시
        console.log(result.message);
      }
    } catch (error) {
      console.error('Failed to toggle server status:', error);
    }
  };

  const handleExecuteTool = (tool: MCPTool) => {
    setSelectedTool(tool);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedTool(null);
    setIsModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-48 bg-gray-200 rounded"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!server) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold mb-4">Server not found</h2>
          <Button onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Server className="w-6 h-6" />
            {server.name}
          </h1>
        </div>
      </div>

      {/* Overview and Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Server Overview */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Server Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <Badge variant={server.status === 'online' ? 'default' : 'secondary'}>
                {server.status}
              </Badge>
            </div>
            
            {server.status === 'online' && (
              <>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center gap-1">
                      <Cpu className="w-3 h-3" />
                      CPU
                    </span>
                    <span>{server.cpu || 0}%</span>
                  </div>
                  <Progress value={server.cpu || 0} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3" />
                      Memory
                    </span>
                    <span>{server.memory || 0}%</span>
                  </div>
                  <Progress value={server.memory || 0} className="h-2" />
                </div>
              </>
            )}
            
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Tools</span>
                <span className="font-medium">{serverTools.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Executions</span>
                <span className="font-medium">0</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={handleRestart}
              disabled={server.status !== 'online'}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Restart
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={handleConfigure}
            >
              <Settings className="w-4 h-4 mr-2" />
              Configure
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={handleViewLogs}
            >
              <FileText className="w-4 h-4 mr-2" />
              View Logs
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={handleToggleStatus}
            >
              <Power className="w-4 h-4 mr-2" />
              {server.status === 'online' ? 'Disable' : 'Enable'}
            </Button>
          </CardContent>
        </Card>

        {/* Connection Info */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Connection Info</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">Info</TabsTrigger>
                <TabsTrigger value="json">JSON</TabsTrigger>
              </TabsList>
              
              <TabsContent value="info" className="space-y-3 mt-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Status</div>
                  <div className="text-sm font-medium">
                    <Badge variant={server.disabled ? 'secondary' : 'default'}>
                      {server.disabled ? 'Disabled' : 'Enabled'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Transport Type</div>
                  <div className="text-sm font-medium">{server.transport_type?.toUpperCase() || 'STDIO'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Command</div>
                  <div className="text-sm font-medium font-mono break-all">{server.command || 'N/A'}</div>
                </div>
                {server.args && server.args.length > 0 && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Arguments</div>
                    <div className="text-sm font-medium font-mono break-all">{server.args.join(' ')}</div>
                  </div>
                )}
                {server.env && Object.keys(server.env).length > 0 && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Environment Variables</div>
                    <div className="text-sm font-medium font-mono">
                      {Object.entries(server.env).map(([key, value]) => (
                        <div key={key} className="break-all">
                          {key}: {value}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Timeout</div>
                  <div className="text-sm font-medium">{server.timeout || 30} seconds</div>
                </div>
                {server.autoApprove && server.autoApprove.length > 0 && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Auto Approve</div>
                    <div className="text-sm font-medium">
                      {server.autoApprove.map((pattern, idx) => (
                        <Badge key={idx} variant="outline" className="mr-1 mb-1">
                          {pattern}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Tools Count</div>
                  <div className="text-sm font-medium">{server.tools_count || serverTools.length}</div>
                </div>
                {server.last_connected && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Last Connected</div>
                    <div className="text-sm font-medium">
                      {new Date(server.last_connected).toLocaleString()}
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="json" className="mt-4">
                <ConnectionInfoJson server={server} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        {/* MCP Client Integration */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">MCP Client Integration</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Cline, Cursor, Claude Desktop 등에서 사용
            </p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="json" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="json">JSON Config</TabsTrigger>
                <TabsTrigger value="url">SSE URL</TabsTrigger>
              </TabsList>
              
              <TabsContent value="json" className="mt-4">
                <ClineConfigJson server={server} />
              </TabsContent>
              
              <TabsContent value="url" className="mt-4">
                <ClineConfigUrl serverId={serverId} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Available Tools */}
        <Card>
          <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Available Tools</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTools.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No tools found matching your search' : 'No tools available'}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTools.map((tool) => (
                <ToolCard 
                  key={tool.id} 
                  tool={tool} 
                  serverName={server.name}
                  onExecute={() => handleExecuteTool(tool)}
                />
              ))}
            </div>
          )}
          </CardContent>
        </Card>

        {/* Execution History */}
        <ExecutionTimeline serverId={serverId} limit={20} />
      </div>

      {/* Tool Execution Modal */}
      <ToolExecutionModal
        tool={selectedTool}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}

// Tool Card Component
interface ToolCardProps {
  tool: MCPTool;
  serverName: string;
  onExecute: () => void;
}

function ToolCard({ tool, serverName, onExecute }: ToolCardProps) {
  // Remove server prefix from tool name for display
  const displayName = tool.name.replace(`${serverName}.`, '');

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold">{displayName}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {tool.description || 'No description available'}
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Last used: Never</span>
              <span>Success rate: -</span>
            </div>
          </div>
          <Button 
            size="sm" 
            onClick={onExecute}
            className="ml-4"
          >
            Execute
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Cline Config JSON Component
function ClineConfigJson({ server }: { server: MCPServer }) {
  const [copiedDirect, setCopiedDirect] = useState(false);
  const [copiedProxy, setCopiedProxy] = useState(false);
  const [activeConfig, setActiveConfig] = useState<'direct' | 'proxy'>('proxy');
  
  // Direct config - 개별 서버 직접 설치
  const directConfig = {
    "mcpServers": {
      [server.name]: {
        "command": server.command,
        "args": server.args || [],
        "env": server.env || {}
      }
    }
  };
  
  // Proxy config - MCP-Orch를 통한 프록시 연결
  const proxyConfig = {
    "mcpServers": {
      [`${server.name}-proxy`]: {
        "disabled": false,
        "timeout": 30,
        "url": `http://localhost:8000/servers/${server.name}/sse`,
        "transportType": "sse"
      }
    }
  };
  
  const directConfigString = JSON.stringify(directConfig, null, 2);
  const proxyConfigString = JSON.stringify(proxyConfig, null, 2);
  
  const handleCopyDirect = () => {
    navigator.clipboard.writeText(directConfigString);
    setCopiedDirect(true);
    setTimeout(() => setCopiedDirect(false), 2000);
  };
  
  const handleCopyProxy = () => {
    navigator.clipboard.writeText(proxyConfigString);
    setCopiedProxy(true);
    setTimeout(() => setCopiedProxy(false), 2000);
  };
  
  return (
    <div className="space-y-4">
      {/* Config Type Selector */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={activeConfig === 'proxy' ? 'default' : 'outline'}
          onClick={() => setActiveConfig('proxy')}
          className="text-xs"
        >
          Proxy 연결 (권장)
        </Button>
        <Button
          size="sm"
          variant={activeConfig === 'direct' ? 'default' : 'outline'}
          onClick={() => setActiveConfig('direct')}
          className="text-xs"
        >
          직접 연결
        </Button>
      </div>
      
      {/* Proxy Config */}
      {activeConfig === 'proxy' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">
              MCP-Orch 프록시를 통한 연결 (Cline, Cursor 등)
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopyProxy}
              className="h-7 px-2"
            >
              {copiedProxy ? (
                <Check className="h-3 w-3" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>
          <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
            <code>{proxyConfigString}</code>
          </pre>
          <p className="text-xs text-muted-foreground">
            MCP-Orch가 실행 중이어야 하며, 모든 도구가 통합되어 제공됩니다.
          </p>
        </div>
      )}
      
      {/* Direct Config */}
      {activeConfig === 'direct' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">
              개별 서버 직접 설치 (MCP-Orch 없이)
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopyDirect}
              className="h-7 px-2"
            >
              {copiedDirect ? (
                <Check className="h-3 w-3" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>
          <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
            <code>{directConfigString}</code>
          </pre>
          <p className="text-xs text-muted-foreground">
            서버가 로컬에 설치되어 있어야 합니다.
          </p>
        </div>
      )}
    </div>
  );
}

// Connection Info JSON Component
function ConnectionInfoJson({ server }: { server: MCPServer }) {
  const [copied, setCopied] = useState(false);
  
  // 전체 서버 설정 포함
  const serverConfig: any = {
    "command": server.command,
    "args": server.args || [],
    "env": server.env || {},
    "timeout": server.timeout || 30,
    "autoApprove": server.autoApprove || [],
    "transportType": server.transport_type || "stdio",
    "disabled": server.disabled || false
  };
  
  const config = {
    "mcpServers": {
      [server.name]: serverConfig
    }
  };
  
  const configString = JSON.stringify(config, null, 2);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(configString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground">
          MCP-Orch에 등록된 전체 서버 설정
        </p>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCopy}
          className="h-7 px-2"
        >
          {copied ? (
            <Check className="h-3 w-3" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>
      <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
        <code>{configString}</code>
      </pre>
      <p className="text-xs text-muted-foreground">
        이 설정을 사용하여 다른 MCP-Orch 인스턴스나 로컬 환경에서 동일한 서버를 설정할 수 있습니다.
      </p>
    </div>
  );
}

// Cline Config URL Component
function ClineConfigUrl({ serverId }: { serverId: string }) {
  const [copied, setCopied] = useState(false);
  
  // Get the current host
  const host = typeof window !== 'undefined' ? window.location.origin.replace(/:\d+$/, ':8000') : 'http://localhost:8000';
  const sseUrl = `${host}/servers/${serverId}/sse`;
  
  const handleCopy = () => {
    navigator.clipboard.writeText(sseUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground">
          SSE 연결 URL (HTTP Transport)
        </p>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCopy}
          className="h-7 px-2"
        >
          {copied ? (
            <Check className="h-3 w-3" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>
      <div className="bg-muted p-3 rounded-md">
        <code className="text-xs break-all">{sseUrl}</code>
      </div>
      <div className="mt-2">
        <p className="text-xs text-muted-foreground">
          이 URL은 HTTP 스트리밍 전송을 지원하는 클라이언트에서만 작동합니다.
        </p>
      </div>
    </div>
  );
}
