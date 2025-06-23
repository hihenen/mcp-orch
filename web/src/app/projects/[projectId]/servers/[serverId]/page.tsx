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

  // Check edit permissions (Only Owner/Developer can edit)
  const canEditServer = currentUserRole === 'owner' || currentUserRole === 'developer';

  // Custom hooks 사용
  const { server, isLoading, loadServerDetail, handleServerUpdated, retryConnection } = useServerDetail({
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

  // Server update handler (including closing edit dialog)
  const handleServerUpdateComplete = async (updatedServerData: any) => {
    await handleServerUpdated(updatedServerData);
    setIsEditDialogOpen(false);
  };

  // Load project information when page loads
  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    }
  }, [projectId, loadProject]);

  // Initial loading state (only when basic information is not available)
  if (isLoading && !server) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="animate-pulse">
          {/* Server header skeleton */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="h-8 bg-gray-200 rounded w-48"></div>
              <div className="h-6 bg-gray-200 rounded w-20"></div>
            </div>
            <div className="flex space-x-2">
              <div className="h-10 bg-gray-200 rounded w-24"></div>
              <div className="h-10 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
          
          {/* Tab navigation skeleton */}
          <div className="flex space-x-4 mb-6">
            <div className="h-10 bg-gray-200 rounded w-20"></div>
            <div className="h-10 bg-gray-200 rounded w-20"></div>
            <div className="h-10 bg-gray-200 rounded w-24"></div>
            <div className="h-10 bg-gray-200 rounded w-16"></div>
            <div className="h-10 bg-gray-200 rounded w-16"></div>
          </div>
          
          {/* Content skeleton */}
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
        
        <div className="text-center text-sm text-muted-foreground mt-4">
          Loading server information...
        </div>
      </div>
    );
  }

  // When server cannot be found
  if (!server) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Server Not Found</h1>
        <p className="text-muted-foreground mb-6">The requested server does not exist or you don't have access to it.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Server header */}
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
        onRetryConnection={retryConnection}
      />

      {/* Tab navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="tools" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Tools
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Usage
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Tab content */}
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

      {/* Tool execution modal */}
      <ToolExecutionModal
        tool={selectedTool}
        isOpen={isToolModalOpen}
        onClose={handleCloseToolModal}
      />

      {/* Server edit dialog */}
      {server && (
        <AddServerDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onServerAdded={() => {}} // Not used in edit mode
          onServerUpdated={handleServerUpdateComplete}
          projectId={projectId}
          editServer={{
            id: server.id,
            name: server.name,
            description: server.description || '',
            transport: (server.transport_type as 'stdio' | 'sse') || 'stdio',
            compatibilityMode: (server.compatibility_mode as 'api_wrapper' | 'resource_connection') || 'api_wrapper',
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
