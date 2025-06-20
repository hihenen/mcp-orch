'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { formatDateTime } from '@/lib/date-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  Search, 
  Server, 
  Settings,
  Edit,
  Trash2,
  Power,
  PowerOff,
  MoreHorizontal,
  RefreshCw,
  Clock
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { AddServerDialog } from '@/components/servers/AddServerDialog';
import { ServerDetailModal } from '@/components/servers/ServerDetailModal';
import { DeleteServerDialog } from '@/components/servers/DeleteServerDialog';
import { ProjectLayout } from '@/components/projects/ProjectLayout';
import Link from 'next/link';
import { toast } from 'sonner';

export default function ProjectServersPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  
  const {
    selectedProject,
    projectServers,
    loadProject,
    loadProjectServers,
    refreshProjectServers,
    refreshSingleProjectServer,
    isLoading
  } = useProjectStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingServer, setEditingServer] = useState<any>(null);
  const [selectedServer, setSelectedServer] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [deletingServer, setDeletingServer] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshingServerId, setRefreshingServerId] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // 페이지 로드 시 프로젝트 정보와 서버 목록 로드
  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
      loadProjectServers(projectId);
    }
  }, [projectId, loadProject, loadProjectServers]);

  // 서버 추가 핸들러
  const handleServerAdded = (serverConfig: any) => {
    console.log('새 서버 추가:', serverConfig);
    // 프로젝트별 서버 목록 새로고침
    loadProjectServers(projectId);
  };

  // 서버 수정 핸들러
  const handleServerUpdated = (serverConfig: any) => {
    console.log('서버 수정:', serverConfig);
    // 프로젝트별 서버 목록 새로고침
    loadProjectServers(projectId);
    setEditingServer(null);
  };

  // 서버 편집 시작
  const handleEditServer = (server: any) => {
    console.log('🔍 handleEditServer received server:', server);
    console.log('🔍 server.server_type:', server.server_type);
    console.log('🔍 server.transport_type:', server.transport_type);
    
    const editingServerData = {
      id: server.id,
      name: server.name,
      description: server.description,
      transport: server.transportType || server.transport_type || 'stdio',
      server_type: server.server_type || 'api_wrapper',
      command: server.command || '',
      args: server.args || [],
      env: server.env || {},
      cwd: server.cwd || ''
    };
    
    console.log('🔍 Setting editingServer to:', editingServerData);
    setEditingServer(editingServerData);
  };

  // 서버 삭제 다이얼로그 열기
  const handleDeleteServer = (server: any) => {
    setDeletingServer(server);
    setShowDeleteDialog(true);
  };

  // 실제 서버 삭제 실행
  const confirmDeleteServer = async () => {
    if (!deletingServer) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/servers?serverId=${deletingServer.id}`, {
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
      loadProjectServers(projectId);
      
      toast.success(`서버 삭제 완료: ${deletingServer.name} 서버가 삭제되었습니다.`);
      
      // 상태 초기화
      setDeletingServer(null);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('서버 삭제 오류:', error);
      toast.error(`서버 삭제 실패: ${error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}`);
    } finally {
      setIsDeleting(false);
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
      loadProjectServers(projectId);
      
      toast.success(data.message);
    } catch (error) {
      console.error('서버 토글 오류:', error);
      toast.error(`서버 상태 변경 실패: ${error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}`);
    }
  };

  // 서버 상세 보기 핸들러 (프로젝트 컨텍스트 유지)
  const handleShowServerDetail = (server: any) => {
    window.location.href = `/projects/${projectId}/servers/${server.id}`;
  };

  // 서버 상세 모달에서 서버 업데이트 핸들러
  const handleServerUpdatedFromModal = () => {
    loadProjectServers(projectId);
  };

  // 전체 서버 새로고침 핸들러
  const handleRefreshAllServers = async () => {
    setIsRefreshing(true);
    try {
      const data = await refreshProjectServers(projectId);
      
      // 서버 목록 새로고침
      await loadProjectServers(projectId);
      setLastRefresh(new Date());
      
      toast.success(`${data.message || '모든 서버 상태가 새로고침되었습니다.'}`);
    } catch (error) {
      console.error('전체 서버 새로고침 오류:', error);
      toast.error(`서버 새로고침 실패: ${error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  // 개별 서버 새로고침 핸들러
  const handleRefreshServer = async (server: any) => {
    setRefreshingServerId(server.id);
    try {
      const data = await refreshSingleProjectServer(projectId, server.id);
      
      // 서버 목록 새로고침
      await loadProjectServers(projectId);
      
      toast.success(`${server.name} 서버 상태가 새로고침되었습니다.`);
    } catch (error) {
      console.error('서버 새로고침 오류:', error);
      toast.error(`서버 새로고침 실패: ${error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}`);
    } finally {
      setRefreshingServerId(null);
    }
  };

  // 프로젝트별 서버 목록 필터링
  const filteredServers = (projectServers || []).filter(server => 
    server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    server.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <ProjectLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-muted-foreground">서버 목록을 불러오는 중...</p>
          </div>
        </div>
      </ProjectLayout>
    );
  }

  return (
    <ProjectLayout>
      <div className="space-y-6">
        {/* 페이지 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Servers</h1>
            <p className="text-muted-foreground mt-1">
              프로젝트의 MCP 서버를 관리하세요
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
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {filteredServers.length}개 서버
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAllServers}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? '새로고침 중...' : '전체 새로고침'}
          </Button>
        </div>
      </div>

      {/* 마지막 새로고침 시간 표시 */}
      {lastRefresh && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          마지막 새로고침: {formatDateTime(lastRefresh)}
        </div>
      )}

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
            <Card 
              key={server.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleShowServerDetail(server)}
            >
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRefreshServer(server);
                      }}
                      disabled={refreshingServerId === server.id}
                      title="서버 상태 새로고침"
                    >
                      <RefreshCw className={`h-4 w-4 ${refreshingServerId === server.id ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleServer(server);
                      }}
                      className={server.disabled ? 'text-green-600 hover:text-green-700' : 'text-orange-600 hover:text-orange-700'}
                      title={server.disabled ? '서버 활성화' : '서버 비활성화'}
                    >
                      {server.disabled ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                          title="서버 옵션"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShowServerDetail(server);
                          }}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          상세보기
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditServer(server);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          편집
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteServer(server);
                          }}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div>타입: {server.transportType || server.transport_type || 'stdio'}</div>
                    <div>도구: {server.tools_count || server.availableTools || 0}개</div>
                    {server.last_connected && (
                      <div>마지막 연결: {formatDateTime(server.last_connected)}</div>
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

      {/* 서버 상세 모달 */}
      <ServerDetailModal
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        server={selectedServer}
        projectId={projectId}
        onServerUpdated={handleServerUpdatedFromModal}
        onEditServer={(server) => {
          setShowDetailModal(false);
          handleEditServer(server);
        }}
        onDeleteServer={(server) => {
          setShowDetailModal(false);
          handleDeleteServer(server);
        }}
      />

      {/* 서버 삭제 확인 다이얼로그 */}
      <DeleteServerDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        server={deletingServer}
        onConfirm={confirmDeleteServer}
        isDeleting={isDeleting}
      />
      </div>
    </ProjectLayout>
  );
}
