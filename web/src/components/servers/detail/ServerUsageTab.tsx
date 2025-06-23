'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw } from 'lucide-react';
import { ServerTabProps } from './types';

interface UsageSession {
  id: string;
  client_name: string;
  status: 'active' | 'inactive';
  last_activity: string;
  created_at: string;
}

interface UsageStats {
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  average_response_time: number;
}

interface ToolCall {
  id: string;
  tool_name: string;
  client_name: string;
  status: 'success' | 'error';
  response_time: number;
  called_at: string;
  error_message?: string;
}

export function ServerUsageTab({ server, projectId, serverId }: ServerTabProps) {
  const [sessions, setSessions] = useState<UsageSession[]>([]);
  const [stats, setStats] = useState<UsageStats>({
    total_calls: 0,
    successful_calls: 0,
    failed_calls: 0,
    average_response_time: 0
  });
  const [recentCalls, setRecentCalls] = useState<ToolCall[]>([]);
  const [loading, setLoading] = useState(false);

  // Load usage data
  const loadUsageData = async () => {
    if (!projectId || !serverId) return;
    
    setLoading(true);
    try {
      // Load sessions
      const sessionsResponse = await fetch(`/api/projects/${projectId}/servers/${serverId}/sessions`, {
        credentials: 'include'
      });
      
      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json();
        setSessions(sessionsData);
      }

      // Load statistics
      const statsResponse = await fetch(`/api/projects/${projectId}/servers/${serverId}/stats`, {
        credentials: 'include'
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Load recent tool calls
      const callsResponse = await fetch(`/api/projects/${projectId}/servers/${serverId}/calls?limit=10`, {
        credentials: 'include'
      });
      
      if (callsResponse.ok) {
        const callsData = await callsResponse.json();
        setRecentCalls(callsData);
      }
    } catch (error) {
      console.error('Failed to load usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour ago`;
    return `${diffDays} day ago`;
  };

  // Load data when component mounts
  useEffect(() => {
    if (server && server.status === 'online') {
      loadUsageData();
    }
  }, [server?.status, projectId, serverId]);

  if (server?.status !== 'online') {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <div className="text-lg font-medium mb-2">Server Offline</div>
        <p>Usage statistics are only available when the server is online.</p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Usage Statistics</h2>
        <Button 
          variant="outline" 
          size="sm"
          onClick={loadUsageData}
          disabled={loading}
        >
          <RotateCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Client Sessions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Client Sessions</CardTitle>
            <CardDescription>
              Information about currently connected client sessions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-4 text-muted-foreground">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto mb-2"></div>
                  <p className="text-sm">Loading sessions...</p>
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-sm">No active sessions</p>
                </div>
              ) : (
                <>
                  {sessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          session.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                        }`}></div>
                        <div>
                          <div className="font-medium text-sm">{session.client_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {session.status === 'active' ? 'Active' : 'Inactive'} - {formatTimeAgo(session.last_activity)}
                          </div>
                        </div>
                      </div>
                      <Badge 
                        variant={session.status === 'active' ? 'outline' : 'secondary'} 
                        className="text-xs"
                      >
                        {session.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  ))}
                  
                  <div className="text-center py-4 text-muted-foreground">
                    <p className="text-sm">Total {sessions.length} session(s)</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Usage Statistics Card */}
        <Card>
          <CardHeader>
            <CardTitle>Usage Statistics</CardTitle>
            <CardDescription>
              Tool call and usage pattern statistics.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-4 text-muted-foreground">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto mb-2"></div>
                  <p className="text-sm">Loading statistics...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{stats.total_calls}</div>
                    <div className="text-sm text-blue-600">Total Calls</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{stats.successful_calls}</div>
                    <div className="text-sm text-green-600">Success</div>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{stats.failed_calls}</div>
                    <div className="text-sm text-red-600">Failed</div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {stats.average_response_time > 0 ? `${stats.average_response_time.toFixed(1)}s` : 'N/A'}
                    </div>
                    <div className="text-sm text-purple-600">Avg Response</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tool Calls */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Tool Calls</CardTitle>
          <CardDescription>
            Recent tool call history and execution details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-4 text-muted-foreground">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto mb-2"></div>
                <p className="text-sm">Loading recent calls...</p>
              </div>
            ) : recentCalls.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <p className="text-sm">No recent tool calls</p>
              </div>
            ) : (
              <>
                {recentCalls.map((call) => (
                  <div key={call.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        call.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <div>
                        <div className="font-medium text-sm">{call.tool_name}</div>
                        <div className="text-xs text-muted-foreground">
                          Called by {call.client_name} - {formatTimeAgo(call.called_at)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          call.status === 'success' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {call.status === 'success' ? 'Success' : 'Failed'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {call.status === 'success' 
                          ? `${call.response_time.toFixed(1)}s`
                          : call.error_message || 'Error'
                        }
                      </span>
                    </div>
                  </div>
                ))}
                
                <div className="text-center py-4 border-t">
                  <Button variant="outline" size="sm">
                    View More Logs
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}