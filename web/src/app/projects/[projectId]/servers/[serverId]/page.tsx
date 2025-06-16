'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Server, Settings, Activity, Wrench, FileText } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { ToolExecutionModal } from '@/components/tools/ToolExecutionModal';
import { AddServerDialog } from '@/components/servers/AddServerDialog';

// 분리된 컴포넌트들 및 hooks import
import {
  ServerHeader,
  ServerOverviewTab,
  ServerToolsTab,
  ServerUsageTab,
  ServerLogsTab,
  ServerSettingsTab,
  useServerDetail,
  useServerActions,
  useServerTools,
  ServerDetail,
  MCPTool
} from '@/components/servers/detail';

export default function ProjectServerDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const serverId = params.serverId as string;
  
  const { selectedProject, loadProject, currentUserRole } = useProjectStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // 편집 권한 확인 (Owner/Developer만 편집 가능)
  const canEditServer = currentUserRole === 'Owner' || currentUserRole === 'Developer';
  
  // 디버깅: 권한 상태 로깅
  console.log('🔍 권한 디버깅:', {
    currentUserRole,
    canEditServer,
    selectedProject: selectedProject?.name,
    projectId
  });

  // Custom hooks 사용
  const { server, isLoading, loadServerDetail, handleServerUpdated } = useServerDetail({
    projectId,
    serverId
  });

  const { 
    handleToggleServer,
    handleRestartServer,
    handleRefreshStatus,
    handleDeleteServer
  } = useServerActions({
    projectId,
    server,
    onServerUpdated: loadServerDetail
  });

  const {
    selectedTool,
    isToolModalOpen,
    handleTestTool,
    handleCloseToolModal
  } = useServerTools();

  // 서버 업데이트 핸들러 (편집 다이얼로그 닫기 포함)
  const handleServerUpdateComplete = async (updatedServerData: any) => {
    await handleServerUpdated(updatedServerData);
    setIsEditDialogOpen(false);
  };

  // 페이지 로드 시 프로젝트 정보 로드
  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    }
  }, [projectId, loadProject]);

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // 서버를 찾을 수 없는 경우
  if (!server) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">서버를 찾을 수 없습니다</h1>
        <p className="text-muted-foreground mb-6">요청하신 서버가 존재하지 않거나 접근 권한이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 서버 헤더 */}
      <ServerHeader
        server={server}
        projectId={projectId}
        canEdit={canEditServer}
        selectedProjectName={selectedProject?.name}
        onToggleServer={handleToggleServer}
        onRestartServer={handleRestartServer}
        onDeleteServer={handleDeleteServer}
        onRefreshStatus={handleRefreshStatus}
        onEditServer={() => setIsEditDialogOpen(true)}
      />

      {/* 탭 네비게이션 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            개요
          </TabsTrigger>
          <TabsTrigger value="tools" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            도구
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            사용 현황
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            로그
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            설정
          </TabsTrigger>
        </TabsList>

        {/* 탭 컨텐츠 */}
        <TabsContent value="overview">
          <ServerOverviewTab
            server={server}
            projectId={projectId}
            serverId={serverId}
            canEdit={canEditServer}
            onServerUpdate={handleServerUpdated}
          />
        </TabsContent>

        <TabsContent value="tools">
          <ServerToolsTab
            server={server}
            projectId={projectId}
            serverId={serverId}
            canEdit={canEditServer}
            onTestTool={handleTestTool}
          />
        </TabsContent>

        <TabsContent value="usage">
          <ServerUsageTab
            server={server}
            projectId={projectId}
            serverId={serverId}
            canEdit={canEditServer}
          />
        </TabsContent>

        <TabsContent value="logs">
          <ServerLogsTab
            server={server}
            projectId={projectId}
            serverId={serverId}
            canEdit={canEditServer}
          />
        </TabsContent>

        <TabsContent value="settings">
          <ServerSettingsTab
            server={server}
            projectId={projectId}
            serverId={serverId}
            canEdit={canEditServer}
            onEditServer={() => setIsEditDialogOpen(true)}
            onDeleteServer={handleDeleteServer}
          />
        </TabsContent>
      </Tabs>

      {/* 도구 실행 모달 */}
      <ToolExecutionModal
        tool={selectedTool}
        isOpen={isToolModalOpen}
        onClose={handleCloseToolModal}
      />

      {/* 서버 편집 다이얼로그 */}
      {server && (
        <AddServerDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onServerAdded={() => {}} // 편집 모드에서는 사용되지 않음
          onServerUpdated={handleServerUpdateComplete}
          projectId={projectId}
          editServer={{
            id: server.id,
            name: server.name,
            description: server.description || '',
            transport: (server.transportType as 'stdio' | 'sse') || 'stdio',
            command: server.command || '',
            args: server.args || [],
            env: server.env || {},
            cwd: server.cwd || ''
          }}
        />
      )}
    </div>
  );
}