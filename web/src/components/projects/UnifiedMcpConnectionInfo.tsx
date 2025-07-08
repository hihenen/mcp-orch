'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Copy, 
  CheckCircle, 
  Link, 
  Globe, 
  Code, 
  InfoIcon,
  Monitor,
  Zap,
  Download
} from 'lucide-react';

interface UnifiedConnectionInfo {
  project_id: string;
  project_name: string;
  unified_mcp_enabled: boolean;
  sse_endpoint: string;
  streamable_http_endpoint: string;
  cline_config: {
    mcpServers: Record<string, {
      type: string;
      url: string;
      headers: Record<string, string>;
    }>;
  };
  instructions: {
    setup: string;
    note: string;
    namespace_info: string;
    connection_types: string;
  };
}

interface UnifiedMcpConnectionInfoProps {
  projectId: string;
  unified_mcp_enabled?: boolean;
}

export function UnifiedMcpConnectionInfo({ projectId, unified_mcp_enabled }: UnifiedMcpConnectionInfoProps) {
  const [connectionInfo, setConnectionInfo] = useState<UnifiedConnectionInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('sse');

  useEffect(() => {
    if (projectId && unified_mcp_enabled) {
      loadConnectionInfo();
    }
  }, [projectId, unified_mcp_enabled]);

  // unified 모드가 비활성화된 경우 컴포넌트를 렌더링하지 않음
  if (!unified_mcp_enabled) {
    return null;
  }

  const loadConnectionInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/projects/${projectId}/unified-connection`);
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Failed to load connection info');
      }

      const data = await response.json();
      setConnectionInfo(data);
    } catch (err) {
      console.error('Error loading unified connection info:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const formatJson = (obj: any) => {
    return JSON.stringify(obj, null, 2);
  };

  if (loading) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <p className="ml-3 text-sm text-blue-700">Loading unified connection info...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert className="border-yellow-200 bg-yellow-50">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={loadConnectionInfo}
              className="ml-2 text-yellow-700 border-yellow-300 hover:bg-yellow-100"
            >
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (!connectionInfo) {
    return null;
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-blue-900">Unified MCP Server Connection</CardTitle>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Enabled
          </Badge>
        </div>
        <CardDescription className="text-blue-700">
          Connect Cline or Cursor to all project servers through a single unified endpoint
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Type Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sse" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              SSE
            </TabsTrigger>
            <TabsTrigger value="streamable" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Streamable HTTP
            </TabsTrigger>
          </TabsList>

          {/* SSE Tab */}
          <TabsContent value="sse" className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">SSE Connection (Traditional)</span>
                <Badge variant="outline" className="text-xs">Widely Supported</Badge>
              </div>
              
              {/* SSE Endpoint */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Endpoint URL</label>
                <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-blue-200">
                  <code className="flex-1 text-sm font-mono text-gray-800">
                    {connectionInfo.sse_endpoint}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(connectionInfo.sse_endpoint, 'sse_endpoint')}
                    className="text-blue-600 border-blue-300 hover:bg-blue-100"
                  >
                    {copiedField === 'sse_endpoint' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* SSE Configuration */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">MCP Configuration JSON</label>
                <div className="relative">
                  <pre className="text-xs font-mono bg-white p-4 rounded-lg border border-blue-200 overflow-x-auto max-h-48">
{JSON.stringify({
  mcpServers: {
    [`${connectionInfo.project_name}-unified-sse`]: {
      type: "sse",
      url: connectionInfo.sse_endpoint,
      headers: {
        "Authorization": "Bearer YOUR_API_TOKEN"
      }
    }
  }
}, null, 2)}</pre>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(JSON.stringify({
                      mcpServers: {
                        [`${connectionInfo.project_name}-unified-sse`]: {
                          type: "sse",
                          url: connectionInfo.sse_endpoint,
                          headers: {
                            "Authorization": "Bearer YOUR_API_TOKEN"
                          }
                        }
                      }
                    }, null, 2), 'sse_config')}
                    className="absolute top-2 right-2 text-blue-600 border-blue-300 hover:bg-blue-100"
                  >
                    {copiedField === 'sse_config' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Streamable HTTP Tab */}
          <TabsContent value="streamable" className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-blue-900">Streamable HTTP Connection (Modern)</span>
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">Claude Code Optimized</Badge>
              </div>
              
              {/* Streamable HTTP Endpoint */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Endpoint URL</label>
                <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-blue-200">
                  <code className="flex-1 text-sm font-mono text-gray-800">
                    {connectionInfo.streamable_http_endpoint}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(connectionInfo.streamable_http_endpoint, 'streamable_endpoint')}
                    className="text-blue-600 border-blue-300 hover:bg-blue-100"
                  >
                    {copiedField === 'streamable_endpoint' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Streamable HTTP Configuration */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">MCP Configuration JSON</label>
                <div className="relative">
                  <pre className="text-xs font-mono bg-white p-4 rounded-lg border border-blue-200 overflow-x-auto max-h-48">
{JSON.stringify({
  mcpServers: {
    [`${connectionInfo.project_name}-unified-streamable`]: {
      type: "streamable-http",
      url: connectionInfo.streamable_http_endpoint,
      headers: {
        "Authorization": "Bearer YOUR_API_TOKEN"
      }
    }
  }
}, null, 2)}</pre>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(JSON.stringify({
                      mcpServers: {
                        [`${connectionInfo.project_name}-unified-streamable`]: {
                          type: "streamable-http",
                          url: connectionInfo.streamable_http_endpoint,
                          headers: {
                            "Authorization": "Bearer YOUR_API_TOKEN"
                          }
                        }
                      }
                    }, null, 2), 'streamable_config')}
                    className="absolute top-2 right-2 text-blue-600 border-blue-300 hover:bg-blue-100"
                  >
                    {copiedField === 'streamable_config' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

        </Tabs>

        {/* General Instructions */}
        <Alert className="border-blue-200 bg-white">
          <InfoIcon className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <div className="space-y-2">
              <p className="font-medium">{connectionInfo.instructions.setup}</p>
              <p className="text-sm">{connectionInfo.instructions.note}</p>
              <p className="text-sm">{connectionInfo.instructions.namespace_info}</p>
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-1">Connection Type Guide:</p>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li><strong>SSE:</strong> Traditional real-time streaming, widely supported by all MCP clients</li>
                  <li><strong>Streamable HTTP:</strong> Modern HTTP-based streaming, optimized for Claude Code</li>
                </ul>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = `/projects/${projectId}/servers`}
            className="text-blue-600 border-blue-300 hover:bg-blue-100"
          >
            View Servers
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = `/projects/${projectId}/settings`}
            className="text-blue-600 border-blue-300 hover:bg-blue-100"
          >
            MCP Settings
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = `/projects/${projectId}/api-keys`}
            className="text-blue-600 border-blue-300 hover:bg-blue-100"
          >
            API Keys
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}