'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { ServerTabProps } from './types';

interface ServerSettingsTabProps extends ServerTabProps {
  onEditServer: () => void;
  onDeleteServer: () => void;
}

export function ServerSettingsTab({ 
  server, 
  canEdit, 
  onEditServer, 
  onDeleteServer 
}: ServerSettingsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>서버 설정</CardTitle>
        <CardDescription>
          서버 구성을 수정하고 관리할 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">서버 편집</h4>
              <p className="text-sm text-muted-foreground">
                서버 설정을 수정합니다.
              </p>
            </div>
            <Button 
              variant="outline"
              onClick={onEditServer}
              disabled={!canEdit}
              title={!canEdit ? "이 서버를 편집할 권한이 없습니다. (Owner 또는 Developer만 가능)" : "서버 설정 편집"}
            >
              <Edit className="h-4 w-4 mr-2" />
              편집
            </Button>
          </div>
          
          <div className="border-t pt-4">
            <h4 className="font-medium text-red-600 mb-2">위험 구역</h4>
            <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
              <div>
                <h5 className="font-medium">서버 삭제</h5>
                <p className="text-sm text-muted-foreground">
                  이 서버를 영구적으로 삭제합니다. 이 작업은 되돌릴 수 없습니다.
                </p>
              </div>
              <Button 
                variant="destructive" 
                onClick={onDeleteServer}
                disabled={!canEdit}
                title={!canEdit ? "이 서버를 삭제할 권한이 없습니다. (Owner 또는 Developer만 가능)" : "서버 삭제"}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                삭제
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}