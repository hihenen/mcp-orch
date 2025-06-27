'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Server,
  Settings,
  CheckCircle,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

interface McpServerModeSettings {
  unified_mcp_enabled: boolean;
}

interface McpServerModeSectionProps {
  projectId: string;
}

export function McpServerModeSection({ projectId }: McpServerModeSectionProps) {
  const [settings, setSettings] = useState<McpServerModeSettings>({
    unified_mcp_enabled: false  // 베타 기능이므로 기본 비활성화
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // MCP 서버 모드 설정 로드
  useEffect(() => {
    loadMcpServerModeSettings();
  }, [projectId]);

  const loadMcpServerModeSettings = async () => {
    try {
      setIsLoading(true);
      // 기존 security API를 활용하여 unified_mcp_enabled 값만 추출
      const response = await fetch(`/api/projects/${projectId}/security`);
      
      if (response.ok) {
        const data = await response.json();
        setSettings({
          unified_mcp_enabled: data.unified_mcp_enabled ?? false  // 베타 기능이므로 기본 비활성화
        });
      } else {
        console.error('Failed to load MCP server mode settings');
      }
    } catch (error) {
      console.error('MCP server mode settings load error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveMcpServerModeSettings = async () => {
    try {
      setIsSaving(true);
      
      // 기존 보안 설정을 먼저 로드
      const currentResponse = await fetch(`/api/projects/${projectId}/security`);
      if (!currentResponse.ok) {
        throw new Error('Failed to load current settings');
      }
      
      const currentSettings = await currentResponse.json();
      
      // MCP 모드 설정만 업데이트하고 나머지 보안 설정은 유지
      const updatedSettings = {
        ...currentSettings,
        unified_mcp_enabled: settings.unified_mcp_enabled
      };
      
      const response = await fetch(`/api/projects/${projectId}/security`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedSettings),
      });

      if (response.ok) {
        toast.success('MCP server mode settings have been saved.');
      } else {
        const error = await response.text();
        toast.error(`Failed to save MCP server mode settings: ${error}`);
      }
    } catch (error) {
      console.error('MCP server mode settings save error:', error);
      toast.error('An error occurred while saving MCP server mode settings.');
    } finally {
      setIsSaving(false);
    }
  };

  // 설정 변경 시 자동 저장
  useEffect(() => {
    if (!isLoading) {
      const timeoutId = setTimeout(() => {
        saveMcpServerModeSettings();
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [settings, isLoading]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            MCP Server Operation Mode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading settings...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          MCP Server Operation Mode
        </CardTitle>
        <CardDescription>
          Configure how MCP servers operate within your project. Choose between unified or individual server management modes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Unified MCP Server 모드 설정 */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Server Management Mode
          </h4>
          
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Server className="h-5 w-5 text-green-600" />
              <div>
                <div className="flex items-center gap-2">
                  <Label className="font-medium">Unified MCP Server Mode</Label>
                  <Badge variant="outline" className="text-xs bg-orange-50 border-orange-200 text-orange-800">
                    BETA
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Enable unified MCP server mode for streamlined server management. When enabled, all project servers are accessible through a single unified endpoint. <strong>This is a beta feature.</strong>
                </p>
              </div>
            </div>
            <Switch
              checked={settings.unified_mcp_enabled}
              onCheckedChange={(checked: boolean) => 
                setSettings(prev => ({ ...prev, unified_mcp_enabled: checked }))
              }
            />
          </div>
        </div>

        {/* 현재 모드 상태 안내 */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Current Operation Mode</h4>
              <div className="text-sm text-blue-700 mt-2 space-y-1">
                <div className="flex items-center gap-2">
                  <span>MCP Server Mode:</span>
                  <Badge variant={settings.unified_mcp_enabled ? "default" : "secondary"}>
                    {settings.unified_mcp_enabled ? "Unified" : "Individual"}
                  </Badge>
                </div>
                <div className="mt-2 text-xs">
                  {settings.unified_mcp_enabled ? (
                    <>
                      <strong>Unified Mode:</strong> All project servers are accessible through a single SSE endpoint.
                      Tools are namespaced with format: 'server_name.tool_name'
                    </>
                  ) : (
                    <>
                      <strong>Individual Mode:</strong> Each server runs as a separate connection.
                      Traditional MCP client configuration with individual server entries.
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 모드별 특징 안내 */}
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-green-900">Mode Benefits</h4>
              <div className="text-sm text-green-700 mt-2">
                {settings.unified_mcp_enabled ? (
                  <ul className="space-y-1">
                    <li>• <strong>Single Connection:</strong> Access all servers through one endpoint</li>
                    <li>• <strong>Error Isolation:</strong> Individual server failures won't affect others</li>
                    <li>• <strong>Resource Efficiency:</strong> Reduced connection overhead</li>
                    <li>• <strong>Centralized Management:</strong> Unified monitoring and control</li>
                    <li>• <strong>Tool Namespacing:</strong> Clear tool organization with server prefixes</li>
                  </ul>
                ) : (
                  <ul className="space-y-1">
                    <li>• <strong>Direct Access:</strong> Direct communication with each server</li>
                    <li>• <strong>Standard MCP:</strong> Traditional MCP client configuration</li>
                    <li>• <strong>Server Independence:</strong> Each server operates independently</li>
                    <li>• <strong>Granular Control:</strong> Fine-grained per-server configuration</li>
                    <li>• <strong>Compatibility:</strong> Works with all standard MCP clients</li>
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 저장 상태 표시 */}
        {isSaving && (
          <div className="flex items-center justify-center py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              Saving settings...
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}