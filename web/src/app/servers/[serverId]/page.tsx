'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { ArrowLeft, RefreshCw, Settings, FileText, Power, Server, Cpu, HardDrive, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { MCPServer, MCPTool } from '@/types';
import { useServerStore } from '@/stores/serverStore';
import { useToolStore } from '@/stores/toolStore';

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
  }, [serverId, servers, tools, fetchServers, fetchTools]);

  const filteredTools = serverTools.filter(tool =>
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBack = () => {
    router.push('/dashboard');
  };

  const handleRestart = () => {
    // TODO: Implement server restart
    console.log('Restart server:', serverId);
  };

  const handleConfigure = () => {
    // TODO: Navigate to server configuration
    router.push(`/servers/${serverId}/configure`);
  };

  const handleViewLogs = () => {
    // TODO: Navigate to server logs
    router.push(`/servers/${serverId}/logs`);
  };

  const handleToggleStatus = () => {
    // TODO: Implement server enable/disable
    console.log('Toggle server status:', serverId);
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
          <CardContent className="space-y-3">
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
          </CardContent>
        </Card>
      </div>

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
                <ToolCard key={tool.id} tool={tool} serverName={server.name} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Tool Card Component
interface ToolCardProps {
  tool: MCPTool;
  serverName: string;
}

function ToolCard({ tool, serverName }: ToolCardProps) {
  const handleExecute = () => {
    // TODO: Open execution modal
    console.log('Execute tool:', tool.name);
  };

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
            onClick={handleExecute}
            className="ml-4"
          >
            Execute
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
