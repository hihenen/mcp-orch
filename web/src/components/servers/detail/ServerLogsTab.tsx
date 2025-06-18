'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogList } from '@/components/tool-call-logs';
import { ServerTabProps } from './types';

export function ServerLogsTab({ server, projectId, serverId }: ServerTabProps) {
  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <Card>
        <CardHeader>
          <CardTitle>서버 로그</CardTitle>
          <CardDescription>
            {server.name} 서버의 도구 호출 로그를 실시간으로 확인할 수 있습니다.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* 로그 리스트 */}
      <LogList 
        projectId={projectId}
        serverId={serverId}
      />
    </div>
  );
}