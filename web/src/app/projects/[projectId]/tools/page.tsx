'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Wrench, 
  Play,
  Settings,
  Filter,
  RefreshCw,
  Server
} from 'lucide-react';
import { useToolStore } from '@/stores/toolStore';
import { useProjectStore } from '@/stores/projectStore';
import { ToolExecutionModal } from '@/components/tools/ToolExecutionModal';
import { ProjectLayout } from '@/components/projects/ProjectLayout';
import { toast } from 'sonner';

export default function ProjectToolsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  
  const { 
    tools, 
    loadTools, 
    isLoading 
  } = useToolStore();
  
  const {
    selectedProject,
    projectTools,
    loadProject,
    loadProjectServers,
    loadProjectTools
  } = useProjectStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTool, setSelectedTool] = useState<any>(null);
  const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);

  // State management
  const [serverFilter, setServerFilter] = useState('all');

  // Load project information and tools list when page loads
  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
      loadProjectServers(projectId);
      loadProjectTools(projectId);
      loadTools();
    }
  }, [projectId, loadProject, loadProjectServers, loadProjectTools, loadTools]);

  // Search filtering - using projectTools
  const filteredTools = projectTools ? projectTools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (tool.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesServer = serverFilter === 'all' || tool.serverId === serverFilter;
    return matchesSearch && matchesServer;
  }) : [];

  // Group tools by server
  const toolsByServer = filteredTools.reduce((acc, tool) => {
    if (!acc[tool.serverId]) {
      acc[tool.serverId] = [];
    }
    acc[tool.serverId].push(tool);
    return acc;
  }, {} as Record<string, typeof projectTools>);

  // Get unique server list
  const uniqueServers = projectTools ? Array.from(new Set(projectTools.map(tool => tool.serverId))) : [];

  // Tools refresh handler
  const handleRefreshTools = async () => {
    try {
      await loadProjectServers(projectId);
      toast.success('Tools list has been refreshed.');
    } catch (error) {
      toast.error('Failed to refresh tools list.');
    }
  };

  const handleExecuteTool = (tool: any) => {
    setSelectedTool(tool);
    setIsExecutionModalOpen(true);
  };

  if (!selectedProject) {
    return (
      <ProjectLayout>
        <div className="py-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading project...</p>
          </div>
        </div>
      </ProjectLayout>
    );
  }

  return (
    <ProjectLayout>
      <div className="py-6 space-y-6">
        {/* Header Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Project Tools</h3>
          </div>
          <p className="text-sm text-blue-700">
            You can view and execute all tools provided by MCP servers connected to the project.
            Each tool performs specific functions and is executed with appropriate input parameters.
          </p>
        </div>

        {/* Search and filter section */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by tool name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={serverFilter}
                onChange={(e) => setServerFilter(e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="all">All Servers</option>
                {uniqueServers.map((serverId) => (
                  <option key={serverId} value={serverId}>{serverId}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefreshTools}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Tools statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Total Tools
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projectTools ? projectTools.length : 0}</div>
              <p className="text-sm text-muted-foreground">Available tools</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Server className="h-4 w-4" />
                Active Servers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uniqueServers.length}</div>
              <p className="text-sm text-muted-foreground">Connected servers</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtered Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredTools.length}</div>
              <p className="text-sm text-muted-foreground">Search results</p>
            </CardContent>
          </Card>
        </div>

        {/* Tools list */}
        {Object.keys(toolsByServer).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(toolsByServer).map(([serverId, tools]) => (
              <div key={serverId} className="space-y-4">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-sm font-medium">
                    {serverId}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {tools.length} tools
                  </span>
                </div>
                
                <Card>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {tools.map((tool, index) => (
                        <div key={`${tool.serverId}-${tool.name}-${index}`} className="p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium text-base">{tool.name}</h4>
                                <Badge variant="secondary" className="text-xs">
                                  {tool.serverId}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">
                                {tool.description || 'No description provided.'}
                              </p>
                              {tool.inputSchema && (
                                <div className="text-xs text-muted-foreground">
                                  <span className="font-medium">Input parameters:</span>
                                  {Object.keys(tool.inputSchema?.properties || {}).length > 0
                                    ? ` ${Object.keys(tool.inputSchema?.properties || {}).join(', ')}`
                                    : ' None'
                                  }
                                </div>
                              )}
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleExecuteTool(tool)}
                              className="ml-4"
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Execute
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <div className="space-y-2">
                {searchQuery || serverFilter !== 'all' ? (
                  <>
                    <p className="text-muted-foreground">No tools match your search criteria.</p>
                    <p className="text-sm text-muted-foreground">
                      Try different search terms or reset the filters.
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSearchQuery('');
                        setServerFilter('all');
                      }}
                      className="mt-4"
                    >
                      Reset Filters
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground">No tools available yet.</p>
                    <p className="text-sm text-muted-foreground">
                      Add MCP servers to your project to use tools.
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tool execution modal */}
        {selectedTool && (
          <ToolExecutionModal
            isOpen={isExecutionModalOpen}
            onClose={() => {
              setIsExecutionModalOpen(false);
              setSelectedTool(null);
            }}
            tool={selectedTool}
          />
        )}
      </div>
    </ProjectLayout>
  );
}
