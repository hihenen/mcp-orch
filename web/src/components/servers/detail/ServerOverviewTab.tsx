'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Shield, ShieldOff, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { ServerTabProps } from './types';
import { formatDateTime } from '@/lib/date-utils';

export function ServerOverviewTab({ server, projectId }: ServerTabProps) {
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
            Cline/Cursor Connection Information
          </CardTitle>
          <CardDescription>
            To connect this server from Cline or Cursor using MCP Orch SSE method, copy the settings below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-sm">SSE Endpoint</div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const endpoint = `http://localhost:8000/projects/${projectId}/servers/${server.name}/sse`;
                    navigator.clipboard.writeText(endpoint);
                    toast.success('Endpoint copied to clipboard.');
                  }}
                >
                  Copy
                </Button>
              </div>
              <div className="font-mono bg-muted p-3 rounded text-sm break-all">
                http://localhost:8000/projects/{projectId}/servers/{server.name}/sse
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-sm">MCP Proxy SSE Settings JSON</div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const mcpConfig = {
                      mcpServers: {
                        [server.name]: {
                          disabled: false,
                          timeout: 30,
                          url: `http://localhost:8000/projects/${projectId}/servers/${server.name}/sse`,
                          headers: {
                            Authorization: "Bearer YOUR_API_TOKEN"
                          },
                          type: "sse"
                        }
                      }
                    };
                    navigator.clipboard.writeText(JSON.stringify(mcpConfig, null, 2));
                    toast.success('MCP Proxy SSE settings copied to clipboard.');
                  }}
                >
                  Copy
                </Button>
              </div>
              <div className="font-mono bg-muted p-3 rounded text-xs overflow-auto max-h-48">
                <pre>{JSON.stringify({
                  mcpServers: {
                    [server.name]: {
                      disabled: false,
                      timeout: 30,
                      url: `http://localhost:8000/projects/${projectId}/servers/${server.name}/sse`,
                      headers: {
                        Authorization: "Bearer YOUR_API_TOKEN"
                      },
                      type: "sse"
                    }
                  }
                }, null, 2)}</pre>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-sm">Local Direct Installation JSON (Optional)</div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const mcpConfig = {
                      mcpServers: {
                        [server.name]: {
                          command: server.command,
                          args: server.args || [],
                          env: server.env || {}
                        }
                      }
                    };
                    navigator.clipboard.writeText(JSON.stringify(mcpConfig, null, 2));
                    toast.success('Local installation settings copied to clipboard.');
                  }}
                >
                  Copy
                </Button>
              </div>
              <div className="font-mono bg-muted p-3 rounded text-xs overflow-auto max-h-48">
                <pre>{JSON.stringify({
                  mcpServers: {
                    [server.name]: {
                      command: server.command,
                      args: server.args || [],
                      env: server.env || {}
                    }
                  }
                }, null, 2)}</pre>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}