'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { RotateCcw, Wrench, Play, Settings, CheckSquare, Square } from 'lucide-react';
import { ServerTabProps, Tool, MCPTool } from './types';
import { useToolPreferenceStore } from '@/stores/toolPreferenceStore';
import { toast } from 'sonner';

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
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  
  const { 
    isToolEnabled,
    updateToolPreference,
    updateToolPreferencesBulk,
    loadToolPreferences,
    isLoading: isPreferencesLoading
  } = useToolPreferenceStore();

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

  // 도구 상태 계산
  const enabledCount = tools.filter(tool => 
    isToolEnabled(projectId, serverId, tool.name)
  ).length;
  const totalCount = tools.length;
  const allEnabled = enabledCount === totalCount && totalCount > 0;
  const noneEnabled = enabledCount === 0;
  
  // 개별 도구 토글 핸들러
  const handleToggleTool = async (toolName: string, isEnabled: boolean) => {
    try {
      await updateToolPreference(projectId, serverId, toolName, isEnabled);
      toast.success(
        `Tool "${toolName}" ${isEnabled ? 'enabled' : 'disabled'} successfully`
      );
    } catch (error) {
      toast.error(
        `Failed to ${isEnabled ? 'enable' : 'disable'} tool "${toolName}"`
      );
    }
  };
  
  // 전체 토글 핸들러
  const handleToggleAll = async (enabled: boolean) => {
    if (tools.length === 0 || isBulkUpdating) return;
    
    setIsBulkUpdating(true);
    try {
      const preferences = tools.map(tool => ({
        server_id: serverId,
        tool_name: tool.name,
        is_enabled: enabled
      }));

      await updateToolPreferencesBulk(projectId, preferences);
      toast.success(
        `All tools ${enabled ? 'enabled' : 'disabled'} successfully`
      );
    } catch (error) {
      toast.error(
        `Failed to ${enabled ? 'enable' : 'disable'} all tools`
      );
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Load tools list when component mounts
  useEffect(() => {
    if (server && server.status === 'online') {
      loadTools();
    }
  }, [server?.status, projectId, serverId]);
  
  // Load tool preferences
  useEffect(() => {
    if (projectId) {
      loadToolPreferences(projectId, serverId);
    }
  }, [projectId, serverId, loadToolPreferences]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Available Tools ({enabledCount}/{totalCount} enabled)
            </CardTitle>
            <CardDescription>
              Manage tool preferences - disabled tools are hidden from MCP clients
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {tools.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleAll(true)}
                  disabled={allEnabled || isBulkUpdating || isPreferencesLoading || server?.status !== 'online'}
                >
                  <CheckSquare className="h-3 w-3 mr-1" />
                  All ON
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleAll(false)}
                  disabled={noneEnabled || isBulkUpdating || isPreferencesLoading || server?.status !== 'online'}
                >
                  <Square className="h-3 w-3 mr-1" />
                  All OFF
                </Button>
              </>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={loadTools}
              disabled={toolsLoading || server?.status !== 'online'}
            >
              <RotateCcw className={`h-4 w-4 mr-2 ${toolsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-blue-700 text-sm">
                <Settings className="h-4 w-4" />
                <span>Disabled tools are hidden from MCP clients but remain manageable here</span>
              </div>
            </div>
            
            <div className="grid gap-3">
              {tools.map((tool, index) => {
                const enabled = isToolEnabled(projectId, serverId, tool.name);
                const isDisabled = server?.status !== 'online' || isBulkUpdating || isPreferencesLoading;
                
                return (
                  <div 
                    key={index} 
                    className={`border rounded-lg p-4 transition-all ${
                      enabled 
                        ? 'hover:bg-muted/50' 
                        : 'bg-muted/30 hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Wrench className={`h-4 w-4 ${
                            enabled ? 'text-blue-600' : 'text-muted-foreground'
                          }`} />
                          <h4 className={`font-medium text-sm ${
                            enabled ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            {tool.name}
                          </h4>
                          <Badge 
                            variant={enabled ? "default" : "secondary"} 
                            className="text-xs"
                          >
                            {enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
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
                      
                      <div className="flex items-center gap-3 ml-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={enabled}
                            onCheckedChange={(checked) => handleToggleTool(tool.name, checked)}
                            disabled={isDisabled}
                            aria-label={`Toggle ${tool.name}`}
                          />
                          <span className="text-xs text-muted-foreground">
                            {enabled ? 'ON' : 'OFF'}
                          </span>
                        </div>
                        
                        {enabled && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleTestTool(tool)}
                            disabled={isDisabled}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Test
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}