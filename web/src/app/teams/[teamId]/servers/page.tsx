'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TeamLayout } from '@/components/teams/TeamLayout';
import { 
  Server, 
  Play,
  Square,
  RotateCcw,
  Plus
} from 'lucide-react';

interface TeamServer {
  id: string;
  name: string;
  description?: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  disabled: boolean;
  status: string;
}

export default function TeamServersPage() {
  const params = useParams();
  const teamId = params.teamId as string;

  const [servers, setServers] = useState<TeamServer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (teamId) {
      loadServers();
    }
  }, [teamId]);

  const loadServers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/teams/${teamId}/servers`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const serverData = await response.json();
        setServers(serverData);
      } else {
        // 데모 데이터
        const demoServers: TeamServer[] = [
          {
            id: '1',
            name: 'Excel Server',
            description: 'Excel 파일 처리 서버',
            command: 'node',
            args: ['excel-server.js'],
            env: {},
            disabled: false,
            status: 'running'
          },
          {
            id: '2',
            name: 'AWS Server', 
            description: 'AWS 리소스 관리 서버',
            command: 'python',
            args: ['aws-server.py'],
            env: {},
            disabled: false,
            status: 'running'
          }
        ];
        setServers(demoServers);
      }
    } catch (error) {
      console.error('Failed to load servers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, disabled: boolean) => {
    if (disabled) {
      return <Badge variant="secondary">비활성화</Badge>;
    }
    
    switch (status) {
      case 'running':
        return <Badge className="bg-green-100 text-green-800">실행 중</Badge>;
      case 'stopped':
        return <Badge variant="destructive">중지됨</Badge>;
      case 'error':
        return <Badge variant="destructive">오류</Badge>;
      default:
        return <Badge variant="secondary">알 수 없음</Badge>;
    }
  };

  if (loading) {
    return (
      <TeamLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-muted-foreground">서버 정보를 불러오는 중...</p>
          </div>
        </div>
      </TeamLayout>
    );
  }

  return (
    <TeamLayout>
      <div className="space-y-6">
        {/* 헤더 섹션 */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Server className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-green-900">MCP 서버 관리</h3>
          </div>
          <p className="text-sm text-green-700">
            팀에서 사용하는 MCP 서버를 관리하고 상태를 모니터링할 수 있습니다.
          </p>
        </div>

        {/* 서버 목록 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>서버 목록</CardTitle>
                <CardDescription>등록된 MCP 서버 {servers.length}개</CardDescription>
              </div>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                새 서버 추가
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {servers.length > 0 ? (
              <div className="space-y-4">
                {servers.map((server) => (
                  <Card key={server.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Server className="h-8 w-8 text-blue-500" />
                        <div>
                          <h3 className="font-medium">{server.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {server.description || '설명이 없습니다.'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {server.command} {server.args.join(' ')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(server.status, server.disabled)}
                        <div className="flex space-x-1">
                          <Button size="sm" variant="outline">
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Square className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Server className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">등록된 서버가 없습니다</h3>
                <p className="text-muted-foreground mb-4">
                  새로운 MCP 서버를 추가하여 시작하세요.
                </p>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  첫 번째 서버 추가
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TeamLayout>
  );
}