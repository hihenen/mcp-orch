'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TeamLayout } from '@/components/teams/TeamLayout';
import { 
  Wrench, 
  Play,
  Search
} from 'lucide-react';

interface TeamTool {
  id: string;
  name: string;
  server_name: string;
  description?: string;
  usage_count: number;
}

export default function TeamToolsPage() {
  const params = useParams();
  const teamId = params.teamId as string;

  const [tools, setTools] = useState<TeamTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (teamId) {
      loadTools();
    }
  }, [teamId]);

  const loadTools = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/teams/${teamId}/tools`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const toolData = await response.json();
        setTools(toolData);
      } else {
        // 데모 데이터
        const demoTools: TeamTool[] = [
          {
            id: '1',
            name: 'Read Excel Sheet',
            server_name: 'Excel Server',
            description: 'Read data from Excel files',
            usage_count: 25
          },
          {
            id: '2',
            name: 'List S3 Buckets',
            server_name: 'AWS Server',
            description: 'List all S3 buckets in the account',
            usage_count: 12
          },
          {
            id: '3',
            name: 'Create EC2 Instance',
            server_name: 'AWS Server',
            description: 'Create new EC2 instances',
            usage_count: 8
          }
        ];
        setTools(demoTools);
      }
    } catch (error) {
      console.error('Failed to load tools:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTools = tools.filter(tool =>
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.server_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tool.description && tool.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <TeamLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-muted-foreground">도구 정보를 불러오는 중...</p>
          </div>
        </div>
      </TeamLayout>
    );
  }

  return (
    <TeamLayout>
      <div className="space-y-6">
        {/* 헤더 섹션 */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="h-5 w-5 text-orange-600" />
            <h3 className="font-semibold text-orange-900">사용 가능한 도구</h3>
          </div>
          <p className="text-sm text-orange-700">
            MCP 서버에서 제공하는 도구들을 검색하고 실행할 수 있습니다.
          </p>
        </div>

        {/* 검색 및 필터 */}
        <Card>
          <CardHeader>
            <CardTitle>도구 검색</CardTitle>
            <CardDescription>사용할 도구를 검색하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="도구 이름, 서버, 설명으로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline">필터</Button>
            </div>
          </CardContent>
        </Card>

        {/* 도구 목록 */}
        <Card>
          <CardHeader>
            <CardTitle>도구 목록</CardTitle>
            <CardDescription>등록된 도구 {filteredTools.length}개</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredTools.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTools.map((tool) => (
                  <Card key={tool.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium">{tool.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {tool.description || '설명이 없습니다.'}
                          </p>
                        </div>
                        <Button size="sm" variant="outline">
                          <Play className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{tool.server_name}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {tool.usage_count}회 사용
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Wrench className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {searchQuery ? '검색 결과가 없습니다' : '사용 가능한 도구가 없습니다'}
                </h3>
                <p className="text-muted-foreground">
                  {searchQuery ? '다른 키워드로 검색해보세요.' : 'MCP 서버를 추가하면 도구를 사용할 수 있습니다.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TeamLayout>
  );
}