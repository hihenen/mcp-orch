'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogList } from '@/components/tool-call-logs';
import { ServerConnectionLogs } from './ServerConnectionLogs';
import { ServerTabProps } from './types';
import { Network, Wrench } from 'lucide-react';

export function ServerLogsTab({ server, projectId, serverId }: ServerTabProps) {
  const [activeLogTab, setActiveLogTab] = useState('connection');

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Server Logs</CardTitle>
          <CardDescription>
            View connection logs and tool call logs for {server.name} server.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Log Tabs */}
      <Tabs value={activeLogTab} onValueChange={setActiveLogTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="connection" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            Connection Logs
          </TabsTrigger>
          <TabsTrigger value="tools" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Tool Call Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connection" className="space-y-4">
          <ServerConnectionLogs 
            projectId={projectId}
            serverId={serverId}
          />
        </TabsContent>

        <TabsContent value="tools" className="space-y-4">
          <LogList 
            projectId={projectId}
            serverId={serverId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}