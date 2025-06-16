'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ServerTabProps } from './types';

export function ServerLogsTab({ server }: ServerTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>서버 로그</CardTitle>
        <CardDescription>
          서버 실행 및 오류 로그를 확인할 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <div className="text-4xl mb-4">📄</div>
          <p>로그 시스템 구현 예정</p>
          <p className="text-sm mt-2">서버 로그 수집 및 표시 기능이 곧 추가될 예정입니다.</p>
        </div>
      </CardContent>
    </Card>
  );
}