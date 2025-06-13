"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Server, Plus, Edit, Trash2, Settings, Play, Square, Shield, ArrowLeft } from "lucide-react";
import { useServerStore } from "@/stores/serverStore";
import { useProjectStore } from "@/stores/projectStore";
import { MCPServer } from "@/types";
import { AlertCircle } from "lucide-react";
import { useAdminPermission } from "@/hooks/useAdminPermission";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ServerFormData {
  name: string;
  command: string;
  args: string;
  env: string;
  transportType: "stdio" | "http";
  timeout: number;
  autoApprove: string;
}

export default function ServersPage() {
  const { servers, addServer, updateServer, removeServer } = useServerStore();
  const { currentProject, loadUserProjects } = useProjectStore();
  const { isAdmin, canAccessGlobalServers } = useAdminPermission();
  const router = useRouter();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<string | null>(null);
  const [formData, setFormData] = useState<ServerFormData>({
    name: "",
    command: "",
    args: "",
    env: "",
    transportType: "stdio",
    timeout: 60,
    autoApprove: "",
  });

  // 관리자 권한 확인
  if (!canAccessGlobalServers) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Shield className="w-16 h-16 text-red-400 mb-4" />
              <h3 className="text-xl font-semibold mb-2">접근 권한이 없습니다</h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mb-6">
                전역 서버 관리는 관리자만 접근할 수 있습니다. 
                프로젝트별 서버 관리를 이용해주세요.
              </p>
              <div className="flex gap-3">
                <Link href="/projects">
                  <Button>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    프로젝트로 이동
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  useEffect(() => {
    // 사용자 프로젝트 목록을 로드합니다
    loadUserProjects();
  }, [loadUserProjects]);

  useEffect(() => {
    // 선택된 프로젝트가 있을 때만 서버 데이터를 불러옵니다
    if (!currentProject) {
      // 프로젝트가 선택되지 않았으면 서버 데이터를 비웁니다
      useServerStore.getState().setServers([]);
      return;
    }

    const fetchProjectServers = async () => {
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
      } catch (error) {
        console.error('Failed to fetch project servers:', error);
        // 에러 시 빈 데이터로 설정
        useServerStore.getState().setServers([]);
      }
    };

    fetchProjectServers();
  }, [currentProject]);

  const handleSubmit = () => {
    const serverData: MCPServer = {
      id: editingServer || `server-${Date.now()}`,
      name: formData.name,
      command: formData.command,
      args: formData.args.split(" ").filter(arg => arg),
      env: formData.env ? JSON.parse(formData.env) : {},
      transportType: formData.transportType,
      status: "offline",
      availableTools: 0,
      disabled: false,
      timeout: formData.timeout,
      autoApprove: formData.autoApprove.split(",").filter(tool => tool.trim()),
    };

    if (editingServer) {
      updateServer(editingServer, serverData);
    } else {
      addServer(serverData);
    }

    setIsAddDialogOpen(false);
    setEditingServer(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      command: "",
      args: "",
      env: "",
      transportType: "stdio",
      timeout: 60,
      autoApprove: "",
    });
  };

  const handleEdit = (serverId: string) => {
    const server = servers.find(s => s.id === serverId);
    if (server) {
      setFormData({
        name: server.name,
        command: server.command,
        args: server.args.join(" "),
        env: JSON.stringify(server.env, null, 2),
        transportType: server.transportType,
        timeout: server.timeout || 60,
        autoApprove: server.autoApprove?.join(", ") || "",
      });
      setEditingServer(serverId);
      setIsAddDialogOpen(true);
    }
  };

  const handleDelete = (serverId: string) => {
    if (confirm("Are you sure you want to delete this server?")) {
      removeServer(serverId);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">Global Server Management</h1>
              <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-800 rounded-full">
                <Shield className="w-4 h-4" />
                <span className="text-sm font-medium">Admin Only</span>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              전역 MCP 서버를 설정하고 관리합니다. 관리자 권한이 필요합니다.
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingServer(null); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Server
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{editingServer ? "Edit Server" : "Add New Server"}</DialogTitle>
                <DialogDescription>
                  Configure the MCP server settings
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Server Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., GitHub Server"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="command">Command</Label>
                  <Input
                    id="command"
                    value={formData.command}
                    onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                    placeholder="e.g., npx, node, python"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="args">Arguments</Label>
                  <Input
                    id="args"
                    value={formData.args}
                    onChange={(e) => setFormData({ ...formData, args: e.target.value })}
                    placeholder="e.g., -y @modelcontextprotocol/server-github"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="env">Environment Variables (JSON)</Label>
                  <Textarea
                    id="env"
                    value={formData.env}
                    onChange={(e) => setFormData({ ...formData, env: e.target.value })}
                    placeholder='{"API_KEY": "your-key"}'
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="transport">Transport Type</Label>
                  <Select
                    value={formData.transportType}
                    onValueChange={(value: "stdio" | "http") => 
                      setFormData({ ...formData, transportType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stdio">stdio</SelectItem>
                      <SelectItem value="http">http</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="timeout">Timeout (seconds)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    value={formData.timeout}
                    onChange={(e) => setFormData({ ...formData, timeout: parseInt(e.target.value) })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="autoApprove">Auto-approve Tools (comma-separated)</Label>
                  <Input
                    id="autoApprove"
                    value={formData.autoApprove}
                    onChange={(e) => setFormData({ ...formData, autoApprove: e.target.value })}
                    placeholder="e.g., list_issues, create_issue"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>
                  {editingServer ? "Update" : "Add"} Server
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {!currentProject ? (
          // 프로젝트가 선택되지 않은 경우
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold mb-2">프로젝트를 선택해주세요</h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-md">
                MCP 서버를 관리하려면 먼저 프로젝트를 선택해야 합니다. 
                헤더의 프로젝트 선택기를 사용하여 프로젝트를 선택하거나 새로 만드세요.
              </p>
            </CardContent>
          </Card>
        ) : servers.length === 0 ? (
          // 프로젝트는 선택되었지만 서버가 없는 경우
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Server className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold mb-2">서버가 없습니다</h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mb-6">
                {currentProject.name} 프로젝트에는 아직 MCP 서버가 없습니다. 
                첫 번째 서버를 추가하여 시작하세요.
              </p>
              <Button onClick={() => { resetForm(); setEditingServer(null); setIsAddDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                첫 번째 서버 추가
              </Button>
            </CardContent>
          </Card>
        ) : (
          // 서버 목록 표시
          <div className="grid gap-4">
            {servers.map((server) => (
              <Card key={server.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Server className={`w-8 h-8 ${
                        server.status === "online" ? "text-green-600" : "text-gray-400"
                      }`} />
                      <div>
                        <CardTitle>{server.name}</CardTitle>
                        <CardDescription>
                          {server.command} {server.args.join(" ")}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={
                        server.status === "online" 
                          ? "bg-green-100 text-green-800" 
                          : "bg-gray-100 text-gray-800"
                      }>
                        {server.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(server.id)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(server.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Transport</p>
                      <p className="font-medium">{server.transportType}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Tools</p>
                      <p className="font-medium">{server.availableTools || 0} available</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Timeout</p>
                      <p className="font-medium">{server.timeout || 60}s</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Environment</p>
                      <p className="font-medium">{Object.keys(server.env || {}).length} vars</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={server.status === "online"}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={server.status === "offline"}
                    >
                      <Square className="w-4 h-4 mr-2" />
                      Stop
                    </Button>
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4 mr-2" />
                      Configure
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
