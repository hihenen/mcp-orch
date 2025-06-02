"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Server, Zap } from "lucide-react";
import { useServerStore } from "@/stores/serverStore";
import { useToolStore } from "@/stores/toolStore";
import { useExecutionStore } from "@/stores/executionStore";
import { ServerStatusCard } from "@/components/dashboard/ServerStatusCard";
import { MCPServer, Tool, Execution } from "@/types";

export default function DashboardPage() {
  const [mode, setMode] = useState<"proxy" | "batch">("proxy");
  const { servers } = useServerStore();
  const { tools } = useToolStore();
  const { executions } = useExecutionStore();

  useEffect(() => {
    // Fetch data from the API
    const fetchData = async () => {
      try {
        // Fetch servers
        const serversResponse = await fetch('http://localhost:8000/servers');
        if (serversResponse.ok) {
          const serversData = await serversResponse.json();
          const servers: MCPServer[] = serversData.map((server: any) => ({
            id: server.name,
            name: server.name,
            command: server.command || '',
            args: server.args || [],
            env: server.env || {},
            transportType: server.transport_type || 'stdio' as const,
            status: server.connected ? 'online' : 'offline',
            availableTools: server.tools_count || 0,
            disabled: false,
          }));
          useServerStore.getState().setServers(servers);
        }

        // Fetch tools
        const toolsResponse = await fetch('http://localhost:8000/tools');
        if (toolsResponse.ok) {
          const toolsData = await toolsResponse.json();
          console.log('Tools API response:', toolsData);
          const tools: Tool[] = toolsData.map((tool: any) => {
            return {
              id: tool.namespace,
              name: tool.name,
              description: tool.description || '',
              serverId: tool.server,
              serverName: tool.server,
              parameters: [],
            };
          });
          console.log('Mapped tools:', tools);
          useToolStore.getState().setTools(tools);
        }

        // For now, use mock executions until we have a real executions API
        const mockExecutions: Execution[] = [
          {
            id: "exec-1",
            toolId: "brave-search.web_search",
            toolName: "web_search",
            serverId: "brave-search",
            serverName: "brave-search",
            parameters: { query: "MCP protocol" },
            status: "completed",
            startedAt: new Date(Date.now() - 3600000),
            completedAt: new Date(Date.now() - 3500000),
            duration: 100000,
            result: { success: true },
          },
        ];
        useExecutionStore.getState().setExecutions(mockExecutions);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        // Fallback to empty data if API fails
        useServerStore.getState().setServers([]);
        useToolStore.getState().setTools([]);
        useExecutionStore.getState().setExecutions([]);
      }
    };

    fetchData();
  }, []);

  const activeServers = servers.filter(s => s.status === "online").length;
  const totalTools = tools.length;
  const todayExecutions = executions.filter(e => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return e.startedAt >= today;
  }).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">MCP Orch Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage and monitor your MCP servers
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
