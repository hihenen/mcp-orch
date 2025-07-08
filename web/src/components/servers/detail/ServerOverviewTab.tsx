'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Shield, ShieldOff, ShieldCheck, Monitor, Zap, Download, Copy, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ServerTabProps } from './types';
import { formatDateTime } from '@/lib/date-utils';

// 동적 base URL 생성 헬퍼 함수 (백엔드 API URL 사용)
const getServerBaseUrl = () => {
  return process.env.NEXT_PUBLIC_MCP_API_URL || 'http://localhost:8000';
};

export function ServerOverviewTab({ server, projectId }: ServerTabProps) {
  const [activeConnectionTab, setActiveConnectionTab] = useState('sse');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
      toast.success(`${fieldName} copied to clipboard`);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Server Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Server Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium text-muted-foreground">Transport Type</div>
                <div>{server.transport_type || 'stdio'}</div>
              </div>
              <div>
                <div className="font-medium text-muted-foreground">Tool Count</div>
                <div>{server.tools_count || 0} tools</div>
              </div>
              <div>
                <div className="font-medium text-muted-foreground">Status</div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    server.status === 'online' ? 'bg-green-500' :
                    server.status === 'offline' ? 'bg-gray-500' :
                    server.status === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  {server.status === 'online' ? 'Online' : 
                   server.status === 'offline' ? 'Offline' :
                   server.status === 'connecting' ? 'Connecting' : 'Error'}
                </div>
              </div>
              <div>
                <div className="font-medium text-muted-foreground">JWT Authentication</div>
                <div className="flex items-center gap-2">
                  {server.jwt_auth_required === null ? (
                    <>
                      <Shield className="h-4 w-4 text-blue-500" />
                      <span>Project Default</span>
                    </>
                  ) : server.jwt_auth_required ? (
                    <>
                      <ShieldCheck className="h-4 w-4 text-green-500" />
                      <span>Required</span>
                    </>
                  ) : (
                    <>
                      <ShieldOff className="h-4 w-4 text-orange-500" />
                      <span>Disabled</span>
                    </>
                  )}
                  {server.computed_jwt_auth_required !== undefined && (
                    <span className="text-xs text-muted-foreground ml-1">
                      (Effective: {server.computed_jwt_auth_required ? 'Required' : 'Disabled'})
                    </span>
                  )}
                </div>
              </div>
              <div>
                <div className="font-medium text-muted-foreground">Last Connected</div>
                <div>
                  {server.last_connected 
                    ? formatDateTime(server.last_connected)
                    : 'No connection history'
                  }
                </div>
              </div>
            </div>
            
            {server.lastError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="font-medium text-red-800 text-sm">Recent Error</div>
                <div className="text-red-700 text-sm mt-1">{server.lastError}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configuration Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <div>
                <div className="font-medium text-muted-foreground">Connection Mode</div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Resource Connection
                  </span>
                  <span className="text-xs text-muted-foreground">
                    (MCP Standard Mode)
                  </span>
                </div>
              </div>

              {server.command && (
                <div>
                  <div className="font-medium text-muted-foreground">Command</div>
                  <div className="font-mono bg-muted p-2 rounded text-xs">
                    {server.command}
                  </div>
                </div>
              )}
              
              {server.args && server.args.length > 0 && (
                <div>
                  <div className="font-medium text-muted-foreground">Arguments</div>
                  <div className="font-mono bg-muted p-2 rounded text-xs">
                    {server.args.join(' ')}
                  </div>
                </div>
              )}
              
              {server.cwd && (
                <div>
                  <div className="font-medium text-muted-foreground">Working Directory</div>
                  <div className="font-mono bg-muted p-2 rounded text-xs">
                    {server.cwd}
                  </div>
                </div>
              )}
              
              {server.env && Object.keys(server.env).length > 0 && (
                <div>
                  <div className="font-medium text-muted-foreground">Environment Variables</div>
                  <div className="font-mono bg-muted p-2 rounded text-xs space-y-1">
                    {Object.entries(server.env).map(([key, value]) => (
                      <div key={key}>
                        <span className="text-blue-600">{key}</span>=
                        <span className="text-green-600">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cline/Cursor Connection Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Connection Information
          </CardTitle>
          <CardDescription>
            Choose your preferred connection method. Each tab provides the complete setup for that connection type.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={activeConnectionTab} onValueChange={setActiveConnectionTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sse" className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                SSE
              </TabsTrigger>
              <TabsTrigger value="streamable" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Streamable HTTP
              </TabsTrigger>
              <TabsTrigger value="local" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Local Direct
              </TabsTrigger>
            </TabsList>

            {/* SSE Tab */}
            <TabsContent value="sse" className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">SSE Connection (Traditional)</span>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Widely Supported
                  </span>
                </div>
                
                {/* SSE Endpoint */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Endpoint URL</label>
                  <div className="flex items-center gap-2 p-3 bg-white rounded-lg border">
                    <code className="flex-1 text-sm font-mono text-gray-800">
                      {getServerBaseUrl()}/projects/{projectId}/servers/{server.name}/sse
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(`${getServerBaseUrl()}/projects/${projectId}/servers/${server.name}/sse`, 'SSE endpoint')}
                    >
                      {copiedField === 'SSE endpoint' ? (
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
                    <pre className="text-xs font-mono bg-white p-4 rounded-lg border overflow-x-auto max-h-48">
{JSON.stringify({
  mcpServers: {
    [server.name]: {
      disabled: false,
      timeout: 30,
      url: `${getServerBaseUrl()}/projects/${projectId}/servers/${server.name}/sse`,
      headers: {
        Authorization: "Bearer YOUR_API_TOKEN"
      },
      type: "sse"
    }
  }
}, null, 2)}</pre>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const config = {
                          mcpServers: {
                            [server.name]: {
                              disabled: false,
                              timeout: 30,
                              url: `${getServerBaseUrl()}/projects/${projectId}/servers/${server.name}/sse`,
                              headers: {
                                Authorization: "Bearer YOUR_API_TOKEN"
                              },
                              type: "sse"
                            }
                          }
                        };
                        copyToClipboard(JSON.stringify(config, null, 2), 'SSE configuration');
                      }}
                      className="absolute top-2 right-2"
                    >
                      {copiedField === 'SSE configuration' ? (
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
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Claude Code Optimized
                  </span>
                </div>
                
                {/* Streamable HTTP Endpoint */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Endpoint URL</label>
                  <div className="flex items-center gap-2 p-3 bg-white rounded-lg border">
                    <code className="flex-1 text-sm font-mono text-gray-800">
                      {getServerBaseUrl()}/projects/{projectId}/servers/{server.name}/mcp
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(`${getServerBaseUrl()}/projects/${projectId}/servers/${server.name}/mcp`, 'Streamable HTTP endpoint')}
                    >
                      {copiedField === 'Streamable HTTP endpoint' ? (
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
                    <pre className="text-xs font-mono bg-white p-4 rounded-lg border overflow-x-auto max-h-48">
{JSON.stringify({
  mcpServers: {
    [`${server.name}-streamable`]: {
      disabled: false,
      timeout: 30,
      url: `${getServerBaseUrl()}/projects/${projectId}/servers/${server.name}/mcp`,
      headers: {
        Authorization: "Bearer YOUR_API_TOKEN"
      },
      type: "streamable-http"
    }
  }
}, null, 2)}</pre>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const config = {
                          mcpServers: {
                            [`${server.name}-streamable`]: {
                              disabled: false,
                              timeout: 30,
                              url: `${getServerBaseUrl()}/projects/${projectId}/servers/${server.name}/mcp`,
                              headers: {
                                Authorization: "Bearer YOUR_API_TOKEN"
                              },
                              type: "streamable-http"
                            }
                          }
                        };
                        copyToClipboard(JSON.stringify(config, null, 2), 'Streamable HTTP configuration');
                      }}
                      className="absolute top-2 right-2"
                    >
                      {copiedField === 'Streamable HTTP configuration' ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Local Direct Tab */}
            <TabsContent value="local" className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-blue-900">Local Direct Installation</span>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    No Proxy
                  </span>
                </div>
                
                {/* Local Direct Configuration */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Direct MCP Configuration JSON</label>
                  <div className="relative">
                    <pre className="text-xs font-mono bg-white p-4 rounded-lg border overflow-x-auto max-h-48">
{JSON.stringify({
  mcpServers: {
    [server.name]: {
      command: server.command,
      args: server.args || [],
      env: server.env || {}
    }
  }
}, null, 2)}</pre>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const config = {
                          mcpServers: {
                            [server.name]: {
                              command: server.command,
                              args: server.args || [],
                              env: server.env || {}
                            }
                          }
                        };
                        copyToClipboard(JSON.stringify(config, null, 2), 'Local direct configuration');
                      }}
                      className="absolute top-2 right-2"
                    >
                      {copiedField === 'Local direct configuration' ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="text-sm text-purple-800">
                    <p className="font-medium mb-2">Local Direct Installation Notes:</p>
                    <ul className="text-xs space-y-1">
                      <li>• Requires the MCP server to be installed locally on your machine</li>
                      <li>• No authentication or proxy - direct connection to the server process</li>
                      <li>• Best performance but requires manual server installation and maintenance</li>
                    </ul>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          
          {/* General Connection Guide */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <div className="font-medium text-sm text-blue-900 mb-2">Connection Method Comparison</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-blue-800">
              <div>
                <div className="font-medium flex items-center gap-1">
                  <Monitor className="h-3 w-3" />
                  SSE
                </div>
                <div>• Traditional streaming</div>
                <div>• Widely supported</div>
                <div>• Reliable fallback</div>
              </div>
              <div>
                <div className="font-medium flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Streamable HTTP
                </div>
                <div>• Modern HTTP streaming</div>
                <div>• Claude Code optimized</div>
                <div>• Better performance</div>
              </div>
              <div>
                <div className="font-medium flex items-center gap-1">
                  <Download className="h-3 w-3" />
                  Local Direct
                </div>
                <div>• No proxy required</div>
                <div>• Maximum performance</div>
                <div>• Manual installation</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}