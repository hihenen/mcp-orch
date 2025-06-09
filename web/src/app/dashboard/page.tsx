"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Server, Zap, FolderOpen, AlertCircle } from "lucide-react";
import { useServerStore } from "@/stores/serverStore";
import { useToolStore } from "@/stores/toolStore";
import { useExecutionStore } from "@/stores/executionStore";
import { useProjectStore } from "@/stores/projectStore";
import { ServerStatusCard } from "@/components/dashboard/ServerStatusCard";
import { MCPServer, Tool, Execution } from "@/types";

export default function DashboardPage() {
  const [mode, setMode] = useState<"proxy" | "batch">("proxy");
  const { servers } = useServerStore();
  const { tools } = useToolStore();
  const { executions } = useExecutionStore();
  const { currentProject, loadUserProjects } = useProjectStore();

  useEffect(() => {
    // 사용자 프로젝트 목록을 로드합니다
    loadUserProjects();
  }, [loadUserProjects]);

  useEffect(() => {
    // 선택된 프로젝트가 있을 때만 데이터를 불러옵니다
    if (!currentProject) {
      // 프로젝트가 선택되지 않았으면 데이터를 비웁니다
      useServerStore.getState().setServers([]);
      useToolStore.getState().setTools([]);
      useExecutionStore.getState().setExecutions([]);
      return;
    }

    const fetchProjectData = async () => {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        // 프로젝트별 서버 데이터 불러오기
        const serversResponse = await fetch(`/api/projects/${currentProject.id}/servers`, { 
          headers,
          credentials: 'include'
        });
        
        if (serversResponse.ok) {
          const serversData = await serversResponse.json();
          console.log('Project servers:', serversData);
          
          const servers: MCPServer[] = serversData.map((server: any) => ({
            id: server.id || server.name,
            name: server.name,
            command: server.command || '',
            args: server.args || [],
            env: server.env || {},
            transportType: 'stdio' as const,
            status: server.disabled ? 'offline' : 'online',
            availableTools: 0, // 서버별 도구 수는 별도로 계산
            disabled: server.disabled || false,
          }));
          useServerStore.getState().setServers(servers);
        }

        // 프로젝트별 도구 데이터 불러오기
        const toolsResponse = await fetch(`/api/tools`, { 
          headers,
          credentials: 'include'
        });
        
        if (toolsResponse.ok) {
          const toolsData = await toolsResponse.json();
          console.log('Project tools:', toolsData);
          
          const tools: Tool[] = toolsData.map((tool: any) => ({
            id: tool.id || `${tool.serverId}-${tool.name}`,
            name: tool.name,
            description: tool.description || '',
            serverId: tool.serverId,
            serverName: tool.serverId,
            parameters: tool.parameters || [],
          }));
          useToolStore.getState().setTools(tools);

          // 서버별 도구 수 업데이트
          const serverToolCounts: Record<string, number> = {};
          tools.forEach(tool => {
            serverToolCounts[tool.serverId] = (serverToolCounts[tool.serverId] || 0) + 1;
          });

          const updatedServers = useServerStore.getState().servers.map(server => ({
            ...server,
            availableTools: serverToolCounts[server.name] || 0
          }));
          useServerStore.getState().setServers(updatedServers);
        }

        // Mock executions - 실제 API 구현 시 프로젝트별로 필터링
        const mockExecutions: Execution[] = [
          {
            id: "exec-1",
            toolId: "sample-tool",
            toolName: "sample_tool",
            serverId: "sample-server",
            serverName: "sample-server",
            parameters: { query: "test" },
            status: "completed",
            startedAt: new Date(Date.now() - 3600000),
            completedAt: new Date(Date.now() - 3500000),
            duration: 100000,
            result: { success: true },
          },
        ];
        useExecutionStore.getState().setExecutions(mockExecutions);

      } catch (error) {
        console.error('Failed to fetch project data:', error);
        // 에러 시 빈 데이터로 설정
        useServerStore.getState().setServers([]);
        useToolStore.getState().setTools([]);
        useExecutionStore.getState().setExecutions([]);
      }
    };

    fetchProjectData();
  }, [currentProject]);

  const activeServers = servers.filter(s => s.status === "online").length;
  const totalTools = tools.length;
  const todayExecutions = executions.filter(e => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return e.startedAt && e.startedAt >= today;
  }).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">MCP Orch Dashboard</h1>
            {currentProject && (
              <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full">
                <FolderOpen className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">{currentProject.name}</span>
              </div>
            )}
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            {currentProject 
              ? `${currentProject.name} 프로젝트의 MCP 서버를 관리하고 모니터링합니다`
              : '프로젝트를 선택하여 MCP 서버를 관리하고 모니터링하세요'
            }
          </p>
        </div>

        {/* Mode Selector */}
        <div className="mb-8">
          <div className="flex gap-4">
            <Button
              variant={mode === "proxy" ? "default" : "outline"}
              onClick={() => setMode("proxy")}
            >
              <Server className="w-4 h-4 mr-2" />
              Proxy Mode
            </Button>
            <Button
              variant={mode === "batch" ? "default" : "outline"}
              onClick={() => setMode("batch")}
            >
              <Zap className="w-4 h-4 mr-2" />
              Batch Mode
              (Comming Soon....)
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Servers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{servers.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Servers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeServers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTools}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Executions Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayExecutions}</div>
            </CardContent>
          </Card>
        </div>

        {/* Server Status */}
        <Card>
          <CardHeader>
            <CardTitle>Server Status</CardTitle>
            <CardDescription>
              Connected MCP servers and their current status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {servers.length === 0 ? (
                <p className="text-gray-500 text-center py-8 col-span-full">No servers connected</p>
              ) : (
                servers.map((server) => (
                  <ServerStatusCard key={server.id} server={server} />
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
