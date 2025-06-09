'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  Server, 
  Settings,
  Edit,
  Trash2,
  Power,
  PowerOff
} from 'lucide-react';
import { useServerStore } from '@/stores/serverStore';
import { useProjectStore } from '@/stores/projectStore';
import { AddServerDialog } from '@/components/servers/AddServerDialog';
import Link from 'next/link';
import { toast } from 'sonner';

export default function ProjectServersPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  
  const { 
    servers, 
    loadServers, 
    isLoading 
  } = useServerStore();
  
  const {
    currentProject,
    loadProject
  } = useProjectStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingServer, setEditingServer] = useState<any>(null);
  const [projectServers, setProjectServers] = useState<any[]>([]);
  const [isLoadingProjectServers, setIsLoadingProjectServers] = useState(false);

  // 프로젝트별 서버 목록 로드
  const loadProjectServers = async () => {
    if (!projectId) return;
    
    setIsLoadingProjectServers(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/servers`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setProjectServers(data);
      } else {
        console.error('프로젝트 서버 로드 실패:', response.status);
        setProjectServers([]);
      }
    } catch (error) {
      console.error('프로젝트 서버 로드 오류:', error);
      setProjectServers([]);
    } finally {
      setIsLoadingProjectServers(false);
    }
  };

  // 페이지 로드 시 프로젝트 정보와 서버 목록 로드
  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
      loadProjectServers();
    }
  }, [projectId, loadProject]);

  // 서버 추가 핸들러
  const handleServerAdded = (serverConfig: any) => {
    console.log('새 서버 추가:', serverConfig);
    // 프로젝트별 서버 목록 새로고침
    loadProjectServers();
  };

  // 서버 수정 핸들러
  const handleServerUpdated = (serverConfig: any) => {
    console.log('서버 수정:', serverConfig);
    // 프로젝트별 서버 목록 새로고침
    loadProjectServers();
    setEditingServer(null);
  };

  // 서버 편집 시작
  const handleEditServer = (server: any) => {
    setEditingServer({
      id: server.id,
      name: server.name,
      description: server.description,
      transport: server.transportType || server.transport_type || 'stdio',
      command: server.command || '',
      args: server.args || [],
      env: server.env || {},
      cwd: server.cwd || ''
    });
  };

  // 서버 삭제 핸들러
  const handleDeleteServer = async (server: any) => {
    if (!confirm(`정말로 "${server.name}" 서버를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/servers?serverId=${server.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '서버 삭제 실패');
      }

      const data = await response.json();
      console.log('서버 삭제 성공:', data);
      
      // 프로젝트별 서버 목록 새로고침
      loadProjectServers();
      
      toast.success(`서버 삭제 완료: ${server.name} 서버가 삭제되었습니다.`);
    } catch (error) {
      console.error('서버 삭제 오류:', error);
      toast.error(`서버 삭제 실패: ${error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}`);
    }
  };

  // 서버 토글 핸들러
  const handleToggleServer = async (server: any) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/servers/${server.id}/toggle`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '서버 상태 변경 실패');
      }

      const data = await response.json();
      console.log('서버 토글 성공:', data);
      
      // 프로젝트별 서버 목록 새로고침
      loadProjectServers();
      
      toast.success(data.message);
    } catch (error) {
      console.error('서버 토글 오류:', error);
      toast.error(`서버 상태 변경 실패: ${error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}`);
    }
  };

  // 프로젝트별 서버 목록 필터링
  const filteredServers = projectServers.filter(server => 
    server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    server.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoadingProjectServers) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">서버 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 브레드크럼 */}
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span>/</span>
        <Link href={`/projects/${projectId}`} className="hover:text-foreground">
          {currentProject?.name || 'Project'}
        </Link>
        <span>/</span>
        <span className="text-foreground">Servers</span>
      </div>

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Servers</h1>
          <p className="text-muted-foreground mt-1">
            {currentProject?.name || 'Project'} 프로젝트의 MCP 서버를 관리하세요
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          서버 추가
        </Button>
      </div>

      {/* 검색 및 필터 */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="서버 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="outline">
          {filteredServers.length}개 서버
        </Badge>
      </div>

      {/* 서버 목록 */}
      {filteredServers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Server className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">서버가 없습니다</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery 
                ? '검색 조건에 맞는 서버가 없습니다.' 
                : '이 프로젝트에 아직 서버가 추가되지 않았습니다.'
              }
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                첫 번째 서버 추가
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredServers.map((server) => (
            <Card key={server.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{server.name}</CardTitle>
                      <Badge variant={server.status === 'online' ? 'default' : 'secondary'}>
                        {server.status === 'online' ? '온라인' : 
                         server.status === 'offline' ? '오프라인' :
                         server.status === 'connecting' ? '연결 중' : '에러'}
                      </Badge>
                      {server.disabled && (
                        <Badge variant="outline">비활성화</Badge>
                      )}
                    </div>
                    <CardDescription className="mt-1">
                      {server.description || '설명 없음'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleToggleServer(server)}
                      className={server.disabled ? 'text-green-600 hover:text-green-700' : 'text-orange-600 hover:text-orange-700'}
                      title={server.disabled ? '서버 활성화' : '서버 비활성화'}
                    >
                      {server.disabled ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditServer(server)}
                      title="서버 편집"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeleteServer(server)}
                      className="text-red-600 hover:text-red-700"
                      title="서버 삭제"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Link href={`/servers/${server.name}`}>
                      <Button variant="outline" size="sm" title="서버 상세보기">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div>타입: {server.transportType || server.transport_type || 'stdio'}</div>
                    <div>도구: {server.tools_count || server.availableTools || 0}개</div>
                    {server.last_connected && (
                      <div>마지막 연결: {new Date(server.last_connected).toLocaleString('ko-KR')}</div>
                    )}
                  </div>
                  
                  {server.lastError && (
                    <div className="text-xs text-red-500">
                      에러: {server.lastError}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 서버 추가 다이얼로그 */}
      <AddServerDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onServerAdded={handleServerAdded}
        projectId={projectId}
      />

      {/* 서버 편집 다이얼로그 */}
      <AddServerDialog
        open={!!editingServer}
        onOpenChange={(open) => !open && setEditingServer(null)}
        onServerAdded={handleServerAdded}
        onServerUpdated={handleServerUpdated}
        editServer={editingServer}
        projectId={projectId}
      />
    </div>
  );
}
