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
import { Server, Plus, Edit, Trash2, Settings, Play, Square } from "lucide-react";
import { useServerStore } from "@/stores/serverStore";
import { MCPServer } from "@/types";

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

  useEffect(() => {
    // In a real app, this would fetch from the API
    // For now, we'll use mock data
    const mockServers: MCPServer[] = [
      {
        id: "github-server",
        name: "GitHub Server",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-github"],
        env: { GITHUB_TOKEN: "***" },
        transportType: "stdio",
        status: "online",
        availableTools: 12,
        disabled: false,
      },
      {
        id: "notion-server",
        name: "Notion Server",
        command: "node",
        args: ["/path/to/notion-server"],
        env: { NOTION_API_KEY: "***" },
        transportType: "stdio",
        status: "online",
        availableTools: 8,
        disabled: false,
      },
      {
        id: "slack-server",
        name: "Slack Server",
        command: "python",
        args: ["-m", "slack_mcp_server"],
        env: { SLACK_TOKEN: "***" },
        transportType: "stdio",
        status: "offline",
        availableTools: 4,
        disabled: false,
      },
    ];
    
    // Simulate API call
    useServerStore.getState().setServers(mockServers);
  }, []);

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
            <h1 className="text-3xl font-bold mb-2">Server Management</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Configure and manage your MCP servers
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
      </div>
    </div>
  );
}
