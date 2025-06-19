'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { formatDate } from '@/lib/date-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Key,
  Plus,
  Download,
  Copy,
  RefreshCw,
  Trash,
  MoreHorizontal,
  AlertCircle,
  Calendar,
  Shield
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { ProjectLayout } from '@/components/projects/ProjectLayout';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export default function ProjectApiKeysPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  
  const { 
    selectedProject,
    projectApiKeys,
    loadProject,
    loadProjectApiKeys,
    createProjectApiKey,
    deleteProjectApiKey,
    getProjectClineConfig
  } = useProjectStore();

  // 상태 관리
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
  const [apiKeyData, setApiKeyData] = useState({
    name: '',
    description: '',
    expires_at: null as string | null
  });

  // 페이지 로드 시 데이터 로드
  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
      loadProjectApiKeys(projectId);
    }
  }, [projectId, loadProject, loadProjectApiKeys]);

  // API 키 생성 핸들러
  const handleCreateApiKey = async () => {
    if (!apiKeyData.name.trim()) {
      toast.error('API 키 이름을 입력해주세요.');
      return;
    }

    try {
      await createProjectApiKey(projectId, {
        name: apiKeyData.name,
        description: apiKeyData.description || undefined,
        expires_at: apiKeyData.expires_at
      });

      // 폼 초기화
      setApiKeyData({ name: '', description: '', expires_at: null });
      setIsApiKeyDialogOpen(false);
      
      toast.success('API 키가 성공적으로 생성되었습니다.');
    } catch (error) {
      console.error('API 키 생성 오류:', error);
      toast.error('API 키 생성에 실패했습니다.');
    }
  };

  // API 키 삭제 핸들러
  const handleDeleteApiKey = async (keyId: string, keyName: string) => {
    const confirmed = window.confirm(`정말로 "${keyName}" API 키를 삭제하시겠습니까?`);
    if (!confirmed) return;

    try {
      await deleteProjectApiKey(projectId, keyId);
      toast.success('API 키가 삭제되었습니다.');
    } catch (error) {
      console.error('API 키 삭제 오류:', error);
      toast.error('API 키 삭제에 실패했습니다.');
    }
  };

  // Cline 설정 다운로드 핸들러
  const handleDownloadClineConfig = async () => {
    try {
      const config = await getProjectClineConfig(projectId);
      const blob = new Blob([JSON.stringify(config, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedProject?.name || 'project'}-cline-config.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Cline 설정 파일이 다운로드되었습니다.');
    } catch (error) {
      console.error('Cline 설정 다운로드 오류:', error);
      toast.error('Cline 설정 다운로드에 실패했습니다.');
    }
  };

  // 키 복사 핸들러
  const handleCopyKey = (keyValue: string) => {
    navigator.clipboard.writeText(keyValue);
    toast.success('API 키가 클립보드에 복사되었습니다.');
  };

  if (!selectedProject) {
    return (
      <ProjectLayout>
        <div className="py-6">
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
      <div className="py-6 space-y-6">
        {/* 헤더 섹션 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Key className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">API Keys</h3>
          </div>
          <p className="text-sm text-blue-700">
            프로젝트별 API 키를 관리하고 Cline 설정을 생성하세요.
            API 키는 외부 애플리케이션에서 프로젝트의 MCP 서버에 안전하게 접근하기 위해 사용됩니다.
          </p>
        </div>

        {/* 액션 버튼들 */}
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">API Keys</h3>
            <p className="text-sm text-muted-foreground">
              프로젝트의 MCP 서버에 접근하기 위한 API 키들입니다
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadClineConfig}>
              <Download className="h-4 w-4 mr-2" />
              Cline 설정 다운로드
            </Button>
            <Dialog open={isApiKeyDialogOpen} onOpenChange={setIsApiKeyDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  API 키 생성
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>새 API 키 생성</DialogTitle>
                  <DialogDescription>
                    프로젝트의 MCP 서버에 접근하기 위한 새 API 키를 생성합니다.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="apiKeyName">API 키 이름</Label>
                    <Input
                      id="apiKeyName"
                      placeholder="예: Production Key"
                      value={apiKeyData.name}
                      onChange={(e) => setApiKeyData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="apiKeyDescription">설명 (선택사항)</Label>
                    <Textarea
                      id="apiKeyDescription"
                      placeholder="이 API 키의 용도를 설명해주세요..."
                      value={apiKeyData.description}
                      onChange={(e) => setApiKeyData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="apiKeyExpiration">만료일</Label>
                    <Select 
                      value={apiKeyData.expires_at || "never"} 
                      onValueChange={(value) => {
                        const expires_at = value === "never" ? null : value;
                        setApiKeyData(prev => ({ ...prev, expires_at }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="만료일을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="never">만료 안함 (Never expires)</SelectItem>
                        <SelectItem value={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}>
                          7일 후
                        </SelectItem>
                        <SelectItem value={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}>
                          30일 후
                        </SelectItem>
                        <SelectItem value={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}>
                          90일 후
                        </SelectItem>
                        <SelectItem value={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}>
                          1년 후
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsApiKeyDialogOpen(false)}>
                    취소
                  </Button>
                  <Button onClick={handleCreateApiKey} disabled={!apiKeyData.name.trim()}>
                    API 키 생성
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* API 키 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="h-4 w-4" />
                총 API 키
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projectApiKeys?.length || 0}</div>
              <p className="text-sm text-muted-foreground">생성된 키</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                활성 키
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {projectApiKeys?.filter(key => !key.expires_at || new Date(key.expires_at) > new Date()).length || 0}
              </div>
              <p className="text-sm text-muted-foreground">유효한 키</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                만료 예정
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {projectApiKeys?.filter(key => 
                  key.expires_at && 
                  new Date(key.expires_at) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) &&
                  new Date(key.expires_at) > new Date()
                ).length || 0}
              </div>
              <p className="text-sm text-muted-foreground">7일 내 만료</p>
            </CardContent>
          </Card>
        </div>

        {/* API 키 목록 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Keys
            </CardTitle>
            <CardDescription>
              프로젝트의 MCP 서버에 접근하기 위한 API 키들입니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            {projectApiKeys && projectApiKeys.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-4 font-medium text-sm text-gray-700">이름</th>
                      <th className="text-left p-4 font-medium text-sm text-gray-700">상태</th>
                      <th className="text-left p-4 font-medium text-sm text-gray-700">마지막 사용</th>
                      <th className="text-left p-4 font-medium text-sm text-gray-700">생성일</th>
                      <th className="text-right p-4 font-medium text-sm text-gray-700"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {projectApiKeys.map((apiKey) => {
                      const isExpired = apiKey.expires_at && new Date(apiKey.expires_at) <= new Date();
                      const isExpiringSoon = apiKey.expires_at && 
                        new Date(apiKey.expires_at) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) &&
                        new Date(apiKey.expires_at) > new Date();
                      
                      return (
                        <tr key={apiKey.id} className="hover:bg-gray-50">
                          <td className="p-4">
                            <div className="font-medium">{apiKey.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {apiKey.description || '설명 없음'}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {apiKey.expires_at 
                                ? `만료: ${formatDate(apiKey.expires_at)}`
                                : '만료 없음'
                              }
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge 
                              variant={isExpired ? "destructive" : isExpiringSoon ? "secondary" : "default"}
                              className={
                                isExpired 
                                  ? "bg-red-100 text-red-800" 
                                  : isExpiringSoon 
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-green-100 text-green-800"
                              }
                            >
                              {isExpired ? '만료됨' : isExpiringSoon ? '만료 예정' : '활성'}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="text-sm">
                              {apiKey.last_used_at 
                                ? formatDate(apiKey.last_used_at)
                                : '사용 안함'
                              }
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {apiKey.last_used_ip || '-'}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="text-sm">
                              {apiKey.created_at 
                                ? formatDate(apiKey.created_at)
                                : '-'
                              }
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleCopyKey(apiKey.key || apiKey.id)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  키 복사
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  키 재생성
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => handleDeleteApiKey(apiKey.id, apiKey.name)}
                                >
                                  <Trash className="h-4 w-4 mr-2" />
                                  키 삭제
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">API 키가 없습니다</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  첫 번째 API 키를 생성하여 MCP 서버에 접근하세요
                </p>
                <Dialog open={isApiKeyDialogOpen} onOpenChange={setIsApiKeyDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      첫 번째 API 키 생성
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>새 API 키 생성</DialogTitle>
                      <DialogDescription>
                        프로젝트의 MCP 서버에 접근하기 위한 새 API 키를 생성합니다.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="apiKeyName2">API 키 이름</Label>
                        <Input
                          id="apiKeyName2"
                          placeholder="예: Production Key"
                          value={apiKeyData.name}
                          onChange={(e) => setApiKeyData(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="apiKeyDescription2">설명 (선택사항)</Label>
                        <Textarea
                          id="apiKeyDescription2"
                          placeholder="이 API 키의 용도를 설명해주세요..."
                          value={apiKeyData.description}
                          onChange={(e) => setApiKeyData(prev => ({ ...prev, description: e.target.value }))}
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label htmlFor="apiKeyExpiration2">만료일</Label>
                        <Select 
                          value={apiKeyData.expires_at || "never"} 
                          onValueChange={(value) => {
                            const expires_at = value === "never" ? null : value;
                            setApiKeyData(prev => ({ ...prev, expires_at }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="만료일을 선택하세요" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="never">만료 안함 (Never expires)</SelectItem>
                            <SelectItem value={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}>
                              7일 후
                            </SelectItem>
                            <SelectItem value={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}>
                              30일 후
                            </SelectItem>
                            <SelectItem value={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}>
                              90일 후
                            </SelectItem>
                            <SelectItem value={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}>
                              1년 후
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsApiKeyDialogOpen(false)}>
                        취소
                      </Button>
                      <Button onClick={handleCreateApiKey} disabled={!apiKeyData.name.trim()}>
                        API 키 생성
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProjectLayout>
  );
}