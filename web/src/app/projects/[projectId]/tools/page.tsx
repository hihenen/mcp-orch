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

  // 상태 관리
  const [serverFilter, setServerFilter] = useState('all');

  // 페이지 로드 시 프로젝트 정보와 도구 목록 로드
  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
      loadProjectServers(projectId);
      loadProjectTools(projectId);
      loadTools();
    }
  }, [projectId, loadProject, loadProjectServers, loadProjectTools, loadTools]);

  // 검색 필터링 - projectTools 사용
  const filteredTools = projectTools ? projectTools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (tool.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesServer = serverFilter === 'all' || tool.serverId === serverFilter;
    return matchesSearch && matchesServer;
  }) : [];

  // 서버별 도구 그룹핑
  const toolsByServer = filteredTools.reduce((acc, tool) => {
    if (!acc[tool.serverId]) {
      acc[tool.serverId] = [];
    }
    acc[tool.serverId].push(tool);
    return acc;
  }, {} as Record<string, typeof projectTools>);

  // 고유 서버 목록 가져오기
  const uniqueServers = projectTools ? Array.from(new Set(projectTools.map(tool => tool.serverId))) : [];

  // 도구 새로고침 핸들러
  const handleRefreshTools = async () => {
    try {
      await loadProjectServers(projectId);
      toast.success('도구 목록이 새로고침되었습니다.');
    } catch (error) {
      toast.error('도구 목록 새로고침에 실패했습니다.');
    }
  };

  const handleExecuteTool = (tool: any) => {
    setSelectedTool(tool);
    setIsExecutionModalOpen(true);
  };

  if (!selectedProject) {
    return (
      <ProjectLayout>
        <div className="container py-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">프로젝트를 로드하는 중...</p>
          </div>
        </div>
      </ProjectLayout>
    );
  }

  return (
    <ProjectLayout>
      <div className="container py-6 space-y-6">
        {/* 헤더 섹션 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">프로젝트 도구</h3>
          </div>
          <p className="text-sm text-blue-700">
            프로젝트에 연결된 MCP 서버들이 제공하는 모든 도구를 확인하고 실행할 수 있습니다.
            각 도구는 특정 기능을 수행하며, 적절한 입력 매개변수를 통해 실행됩니다.
          </p>
        </div>

        {/* 검색 및 필터 섹션 */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="도구 이름 또는 설명으로 검색..."
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
                <option value="all">모든 서버</option>
                {uniqueServers.map((serverId) => (
                  <option key={serverId} value={serverId}>{serverId}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefreshTools}>
              <RefreshCw className="h-4 w-4 mr-2" />
              새로고침
            </Button>
          </div>
        </div>

        {/* 도구 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                총 도구
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projectTools ? projectTools.length : 0}</div>
              <p className="text-sm text-muted-foreground">사용 가능한 도구</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Server className="h-4 w-4" />
                활성 서버
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uniqueServers.length}</div>
              <p className="text-sm text-muted-foreground">연결된 서버</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
                필터된 결과
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredTools.length}</div>
              <p className="text-sm text-muted-foreground">검색 결과</p>
            </CardContent>
          </Card>
        </div>

        {/* 도구 목록 */}
        {Object.keys(toolsByServer).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(toolsByServer).map(([serverId, tools]) => (
              <div key={serverId} className="space-y-4">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-sm font-medium">
                    {serverId}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {tools.length}개 도구
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
                                {tool.description || '설명이 제공되지 않았습니다.'}
                              </p>
                              {tool.inputSchema && (
                                <div className="text-xs text-muted-foreground">
                                  <span className="font-medium">입력 매개변수:</span>
                                  {Object.keys(tool.inputSchema.properties || {}).length > 0 
                                    ? ` ${Object.keys(tool.inputSchema.properties).join(', ')}`
                                    : ' 없음'
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
                              실행
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
                    <p className="text-muted-foreground">검색 조건에 맞는 도구가 없습니다.</p>
                    <p className="text-sm text-muted-foreground">
                      다른 검색어를 시도하거나 필터를 재설정해보세요.
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSearchQuery('');
                        setServerFilter('all');
                      }}
                      className="mt-4"
                    >
                      필터 초기화
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground">아직 사용 가능한 도구가 없습니다.</p>
                    <p className="text-sm text-muted-foreground">
                      프로젝트에 MCP 서버를 추가하여 도구를 사용할 수 있습니다.
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 도구 실행 모달 */}
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
