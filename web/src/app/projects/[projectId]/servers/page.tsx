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
  Clock,
  Shield,
  ShieldOff,
  ShieldCheck
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { AddServerDialog } from '@/components/servers/AddServerDialog';
import { ServerDetailModal } from '@/components/servers/ServerDetailModal';
import { DeleteServerDialog } from '@/components/servers/DeleteServerDialog';
import { ProjectLayout } from '@/components/projects/ProjectLayout';
import { UnifiedMcpConnectionInfo } from '@/components/projects/UnifiedMcpConnectionInfo';
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

  // Load project information and server list when page loads
  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
      loadProjectServers(projectId);
    }
  }, [projectId, loadProject, loadProjectServers]);

  // Server addition handler
  const handleServerAdded = (serverConfig: any) => {
    console.log('New server added:', serverConfig);
    // Refresh project-specific server list
    loadProjectServers(projectId);
  };

  // Server update handler
  const handleServerUpdated = (serverConfig: any) => {
    console.log('Server updated:', serverConfig);
    // Refresh project-specific server list
    loadProjectServers(projectId);
    setEditingServer(null);
  };

  // Start server editing
  const handleEditServer = (server: any) => {
    console.log('🔍 handleEditServer received server:', server);
    console.log('🔍 server.compatibility_mode:', server.compatibility_mode);
    console.log('🔍 server.transport_type:', server.transport_type);
    
    const editingServerData = {
      id: server.id,
      name: server.name,
      description: server.description,
      transport: server.transportType || server.transport_type || 'stdio',
      compatibility_mode: server.compatibility_mode || 'api_wrapper',
      serverType: server.compatibility_mode || 'api_wrapper',  // 프론트엔드 필드도 추가
      command: server.command || '',
      args: server.args || [],
      jwt_auth_required: server.jwt_auth_required ?? null,
      env: server.env || {},
      cwd: server.cwd || ''
    };
    
    console.log('🔍 Setting editingServer to:', editingServerData);
    console.log('🔍 editingServerData.compatibility_mode:', editingServerData.compatibility_mode);
    console.log('🔍 editingServerData.serverType:', editingServerData.serverType);
    setEditingServer(editingServerData);
  };

  // Open server deletion dialog
  const handleDeleteServer = (server: any) => {
    setDeletingServer(server);
    setShowDeleteDialog(true);
  };

  // Execute actual server deletion
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
        throw new Error(errorData.error || 'Server deletion failed');
      }

      const data = await response.json();
      console.log('Server deletion successful:', data);
      
      // Refresh project-specific server list
      loadProjectServers(projectId);
      
      toast.success(`Server deletion completed: ${deletingServer.name} server has been deleted.`);
      
      // Reset state
      setDeletingServer(null);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Server deletion error:', error);
      toast.error(`Server deletion failed: ${error instanceof Error ? error.message : 'An unknown error occurred.'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Server toggle handler
  const handleToggleServer = async (server: any) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/servers/${server.id}/toggle`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server status change failed');
      }

      const data = await response.json();
      console.log('Server toggle successful:', data);
      
      // 프로젝트별 서버 목록 새로고침
      loadProjectServers(projectId);
      
      toast.success(data.message);
    } catch (error) {
      console.error('Server toggle error:', error);
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
              Manage your project's MCP servers
            </p>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Server
          </Button>
        </div>

        {/* Unified MCP Connection Info Section */}
        <UnifiedMcpConnectionInfo 
          projectId={projectId} 
          unified_mcp_enabled={selectedProject?.unified_mcp_enabled}
        />

      {/* 검색 및 필터 */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search servers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {filteredServers.length} servers
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAllServers}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh All'}
          </Button>
        </div>
      </div>

      {/* 마지막 새로고침 시간 표시 */}
      {lastRefresh && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          Last refresh: {formatDateTime(lastRefresh)}
        </div>
      )}

      {/* 서버 목록 */}
      {filteredServers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Server className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Servers</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery 
                ? 'No servers match your search criteria.' 
                : 'No servers have been added to this project yet.'
              }
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Server
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
                        {server.status === 'online' ? 'Online' : 
                         server.status === 'offline' ? 'Offline' :
                         server.status === 'error' ? 'Error' :
                         server.status === 'disabled' ? 'Disabled' :
                         server.status === 'starting' ? 'Starting' :
                         server.status === 'stopping' ? 'Stopping' : 'Unknown'}
                      </Badge>
                      {server.disabled && (
                        <Badge variant="outline">Disabled</Badge>
                      )}
                    </div>
                    <CardDescription className="mt-1">
                      {server.description || 'No description'}
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
                      title="Refresh server status"
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
                      title={server.disabled ? 'Enable server' : 'Disable server'}
                    >
                      {server.disabled ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                          title="Server options"
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
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditServer(server);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteServer(server);
                          }}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div>Type: {(server as any).transport_type || 'stdio'}</div>
                    <div>Tools: {server.tools_count || (server as any).availableTools || 0}</div>
                    <div className="flex items-center gap-1">
                      {(server as any).jwt_auth_required === null ? (
                        <Shield className="h-3 w-3 text-blue-500" title="JWT Authentication: Project Default" />
                      ) : (server as any).jwt_auth_required ? (
                        <ShieldCheck className="h-3 w-3 text-green-500" title="JWT Authentication: Required" />
                      ) : (
                        <ShieldOff className="h-3 w-3 text-orange-500" title="JWT Authentication: Disabled" />
                      )}
                      <span className="text-xs">
                        {(server as any).jwt_auth_required === null ? 'Default' : 
                         (server as any).jwt_auth_required ? 'Auth' : 'No Auth'}
                      </span>
                    </div>
                    {(server as any).last_connected && (
                      <div>Last connected: {formatDateTime((server as any).last_connected)}</div>
                    )}
                  </div>
                  
                  {(server as any).lastError && (
                    <div className="text-xs text-red-500">
                      Error: {(server as any).lastError}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add server dialog */}
      <AddServerDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onServerAdded={handleServerAdded}
        projectId={projectId}
      />

      {/* Edit server dialog */}
      <AddServerDialog
        open={!!editingServer}
        onOpenChange={(open) => !open && setEditingServer(null)}
        onServerAdded={handleServerAdded}
        onServerUpdated={handleServerUpdated}
        editServer={editingServer}
        projectId={projectId}
      />

      {/* Server detail modal */}
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

      {/* Server deletion confirmation dialog */}
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
