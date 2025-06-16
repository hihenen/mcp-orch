'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft,
  RotateCcw,
  Play,
  Pause,
  Edit,
  Trash2
} from 'lucide-react';
import { ServerHeaderProps } from './types';

interface ExtendedServerHeaderProps extends ServerHeaderProps {
  selectedProjectName?: string;
}

export function ServerHeader({ 
  server, 
  projectId, 
  canEdit, 
  selectedProjectName,
  onToggleServer,
  onRestartServer,
  onDeleteServer,
  onRefreshStatus,
  onEditServer
}: ExtendedServerHeaderProps) {
  return (
    <div className="space-y-4">
      {/* 브레드크럼 */}
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span>/</span>
        <Link href={`/projects/${projectId}`} className="hover:text-foreground">
          {selectedProjectName || 'Project'}
        </Link>
        <span>/</span>
        <Link href={`/projects/${projectId}/servers`} className="hover:text-foreground">
          Servers
        </Link>
        <span>/</span>
        <span className="text-foreground">{server.name}</span>
      </div>

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/projects/${projectId}/servers`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              뒤로
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{server.name}</h1>
              <Badge variant={server.status === 'online' ? 'default' : 'secondary'}>
                {server.status === 'online' ? '온라인' : 
                 server.status === 'offline' ? '오프라인' :
                 server.status === 'connecting' ? '연결 중' : '에러'}
              </Badge>
              {server.disabled && (
                <Badge variant="outline">비활성화</Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              {server.description || '설명 없음'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={onRefreshStatus}
            className="text-blue-600 hover:text-blue-700"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            상태 새로고침
          </Button>
          <Button 
            variant="outline"
            onClick={onToggleServer}
            disabled={!canEdit}
            className={server.disabled ? 'text-green-600 hover:text-green-700' : 'text-orange-600 hover:text-orange-700'}
            title={!canEdit ? "서버를 제어할 권한이 없습니다. (Owner 또는 Developer만 가능)" : undefined}
          >
            {server.disabled ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
            {server.disabled ? '활성화' : '비활성화'}
          </Button>
          <Button 
            variant="outline" 
            onClick={onRestartServer}
            disabled={!canEdit}
            title={!canEdit ? "서버를 재시작할 권한이 없습니다. (Owner 또는 Developer만 가능)" : "서버 재시작"}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            재시작
          </Button>
          <Button 
            variant="outline"
            onClick={onEditServer}
            disabled={!canEdit}
            title={!canEdit ? "이 서버를 편집할 권한이 없습니다. (Owner 또는 Developer만 가능)" : "서버 설정 편집"}
          >
            <Edit className="h-4 w-4 mr-2" />
            편집
          </Button>
          <Button 
            variant="outline" 
            onClick={onDeleteServer}
            disabled={!canEdit}
            className="text-red-600 hover:text-red-700"
            title={!canEdit ? "이 서버를 삭제할 권한이 없습니다. (Owner 또는 Developer만 가능)" : "서버 삭제"}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            삭제
          </Button>
        </div>
      </div>
    </div>
  );
}