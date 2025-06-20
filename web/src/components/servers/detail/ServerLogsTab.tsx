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
      {/* 헤더 */}
      <Card>
        <CardHeader>
          <CardTitle>서버 로그</CardTitle>
          <CardDescription>
            {server.name} 서버의 연결 로그와 도구 호출 로그를 확인할 수 있습니다.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* 로그 탭 */}
      <Tabs value={activeLogTab} onValueChange={setActiveLogTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="connection" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            연결 로그
          </TabsTrigger>
          <TabsTrigger value="tools" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            도구 호출 로그
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