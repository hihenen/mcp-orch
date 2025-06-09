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
  Filter
} from 'lucide-react';
import { useToolStore } from '@/stores/toolStore';
import { useProjectStore } from '@/stores/projectStore';
import { ToolExecutionModal } from '@/components/tools/ToolExecutionModal';
import Link from 'next/link';

export default function ProjectToolsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  
  const { 
    tools, 
    loadTools, 
    isLoading 
  } = useToolStore();
  
  const {
    currentProject,
    loadProject
  } = useProjectStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTool, setSelectedTool] = useState<any>(null);
  const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);

  // 페이지 로드 시 프로젝트 정보와 도구 목록 로드
  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
      loadTools();
    }
  }, [projectId, loadProject, loadTools]);

  // 검색 필터링 (현재는 모든 도구 표시, 추후 프로젝트별 필터링 구현)
  const filteredTools = tools.filter(tool => 
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.serverName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExecuteTool = (tool: any) => {
    setSelectedTool(tool);
    setIsExecutionModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">도구 목록을 불러오는 중...</p>
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
        <span className="text-foreground">Tools</span>
      </div>

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tools</h1>
          <p className="text-muted-foreground mt-1">
            {currentProject?.name || 'Project'} 프로젝트의 MCP 도구를 실행하세요
          </p>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="도구 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="outline">
          {filteredTools.length}개 도구
        </Badge>
      </div>

      {/* 도구 목록 */}
      {filteredTools.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">도구가 없습니다</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery 
                ? '검색 조건에 맞는 도구가 없습니다.' 
                : '이 프로젝트에 사용할 수 있는 도구가 없습니다.'
              }
            </p>
            <Link href={`/projects/${projectId}/servers`}>
              <Button>
                <Settings className="h-4 w-4 mr-2" />
                서버 관리로 이동
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTools.map((tool) => (
            <Card key={tool.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{tool.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {tool.description || '설명 없음'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {tool.serverName || tool.serverId}
                    </Badge>
                    {tool.namespace && (
                      <Badge variant="secondary" className="text-xs">
                        {tool.namespace}
                      </Badge>
                    )}
                  </div>
                  
                  {tool.parameters && tool.parameters.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      매개변수: {tool.parameters.length}개
                    </div>
                  )}

                  <div className="pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => handleExecuteTool(tool)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      실행
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 도구 실행 모달 */}
      {selectedTool && (
        <ToolExecutionModal
          tool={selectedTool}
          isOpen={isExecutionModalOpen}
          onClose={() => {
            setIsExecutionModalOpen(false);
            setSelectedTool(null);
          }}
        />
      )}
    </div>
  );
}
