'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Wrench, Play } from 'lucide-react';
import { ServerTabProps, Tool, MCPTool } from './types';

interface ServerToolsTabProps extends ServerTabProps {
  onTestTool: (tool: MCPTool) => void;
}

export function ServerToolsTab({ 
  server, 
  projectId, 
  serverId, 
  onTestTool 
}: ServerToolsTabProps) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [toolsLoading, setToolsLoading] = useState(false);

  // Load tools list
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

  // Tool test handler
  const handleTestTool = (tool: Tool) => {
    const mcpTool: MCPTool = {
      id: `${server.id}-${tool.name}`,
      name: tool.name,
      description: tool.description,
      namespace: `${projectId}.${serverId}`,
      serverId: server.id,
      inputSchema: tool.schema
    };
    onTestTool(mcpTool);
  };

  // Load tools list when component mounts
  useEffect(() => {
    if (server && server.status === 'online') {
      loadTools();
    }
  }, [server?.status, projectId, serverId]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Available Tools</CardTitle>
            <CardDescription>
              List of MCP tools provided by this server.
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            onClick={loadTools}
            disabled={toolsLoading || server?.status !== 'online'}
          >
            <RotateCcw className={`h-4 w-4 mr-2 ${toolsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {server?.status !== 'online' ? (
          <div className="text-center py-8 text-muted-foreground">
            <Wrench className="h-12 w-12 mx-auto mb-4" />
            <p>Server is offline</p>
            <p className="text-sm mt-2">You can check the tool list after bringing the server online.</p>
          </div>
        ) : toolsLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Loading tool list...</p>
          </div>
        ) : tools.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Wrench className="h-12 w-12 mx-auto mb-4" />
            <p>No available tools</p>
            <p className="text-sm mt-2">This server provides no tools or the tool list cannot be loaded.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Total {tools.length} tools available.
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
                        <Badge variant="outline" className="text-xs">Tool</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {tool.description || 'No description provided.'}
                      </p>
                      
                      {tool.schema && (
                        <div className="space-y-2">
                          <h5 className="text-xs font-medium text-muted-foreground">Parameters</h5>
                          <div className="bg-muted p-3 rounded text-xs font-mono">
                            {tool.schema.properties ? (
                              <div className="space-y-1">
                                {Object.entries(tool.schema.properties).map(([key, prop]: [string, any]) => (
                                  <div key={key} className="flex items-center gap-2">
                                    <span className="text-blue-600">{key}</span>
                                    <span className="text-muted-foreground">:</span>
                                    <span className="text-green-600">{prop.type || 'any'}</span>
                                    {tool.schema.required?.includes(key) && (
                                      <Badge variant="destructive" className="text-xs px-1 py-0">Required</Badge>
                                    )}
                                    {prop.description && (
                                      <span className="text-muted-foreground text-xs">- {prop.description}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">No parameter information</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleTestTool(tool)}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Test
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
  );
}