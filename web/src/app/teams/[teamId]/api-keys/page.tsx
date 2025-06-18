'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TeamLayout } from '@/components/teams/TeamLayout';
import { useTeamStore } from '@/stores/teamStore';
import { toast } from 'sonner';
import { 
  Key, 
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  is_active: boolean;
  expires_at?: string;
  created_at: string;
  last_used_at?: string;
}

export default function TeamApiKeysPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const { selectedTeam } = useTeamStore();

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createKeyDialog, setCreateKeyDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showFullKey, setShowFullKey] = useState<string | null>(null);

  useEffect(() => {
    if (teamId) {
      loadApiKeys();
    }
  }, [teamId]);

  const loadApiKeys = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/teams/${teamId}/api-keys`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const keyData = await response.json();
        setApiKeys(keyData);
      } else {
        // 데모 데이터
        const demoKeys: ApiKey[] = [
          {
            id: '1',
            name: 'Development Key',
            key_prefix: 'mcp_abc123',
            is_active: true,
            expires_at: undefined,
            created_at: '2025-06-01T10:00:00Z',
            last_used_at: '2025-06-03T15:30:00Z'
          },
          {
            id: '2',
            name: 'Production Key', 
            key_prefix: 'mcp_def456',
            is_active: true,
            expires_at: '2025-12-31T23:59:59Z',
            created_at: '2025-06-02T14:00:00Z',
            last_used_at: undefined
          }
        ];
        setApiKeys(demoKeys);
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('API 키 이름을 입력해주세요.');
      return;
    }

    try {
      const response = await fetch(`/api/teams/${teamId}/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newKeyName
        })
      });

      if (response.ok) {
        const newKey = await response.json();
        toast.success('API 키가 생성되었습니다.');
        setCreateKeyDialog(false);
        setNewKeyName('');
        setShowFullKey(newKey.key); // 새로 생성된 키는 전체를 보여줌
        loadApiKeys();
      } else {
        const errorText = await response.text();
        console.error('Failed to create API key:', errorText);
        toast.error(`API 키 생성에 실패했습니다: ${errorText}`);
      }
    } catch (error) {
      console.error('Error creating API key:', error);
      toast.error('API 키 생성 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteApiKey = async (keyId: string, keyName: string) => {
    if (!confirm(`정말로 "${keyName}" API 키를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/teams/${teamId}/api-keys/${keyId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        toast.success('API 키가 삭제되었습니다.');
        loadApiKeys();
      } else {
        const errorText = await response.text();
        console.error('Failed to delete API key:', errorText);
        toast.error(`API 키 삭제에 실패했습니다: ${errorText}`);
      }
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast.error('API 키 삭제 중 오류가 발생했습니다.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('클립보드에 복사되었습니다.');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const canAccess = (requiredRole: 'owner' | 'developer' | 'reporter') => {
    if (!selectedTeam?.role) return false;
    const roleHierarchy = { owner: 3, developer: 2, reporter: 1 };
    const userRoleLevel = roleHierarchy[selectedTeam.role.toLowerCase() as keyof typeof roleHierarchy] || 0;
    return userRoleLevel >= roleHierarchy[requiredRole];
  };

  if (loading) {
    return (
      <TeamLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-muted-foreground">API 키 정보를 불러오는 중...</p>
          </div>
        </div>
      </TeamLayout>
    );
  }

  return (
    <TeamLayout>
      <div className="space-y-6">
        {/* 헤더 섹션 */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Key className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-purple-900">API 키 관리</h3>
          </div>
          <p className="text-sm text-purple-700">
            MCP 서비스에 접근하기 위한 API 키를 생성하고 관리할 수 있습니다.
          </p>
        </div>

        {/* API 키 목록 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>API 키 목록</CardTitle>
                <CardDescription>생성된 API 키 {apiKeys.length}개</CardDescription>
              </div>
              {canAccess('developer') && (
                <Dialog open={createKeyDialog} onOpenChange={setCreateKeyDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      새 API 키 생성
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>새 API 키 생성</DialogTitle>
                      <DialogDescription>
                        새로운 API 키를 생성합니다.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="keyName">API 키 이름</Label>
                        <Input
                          id="keyName"
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                          placeholder="예: Production API Key"
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setCreateKeyDialog(false)}>
                          취소
                        </Button>
                        <Button onClick={handleCreateApiKey}>
                          생성
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {apiKeys.length > 0 ? (
              <div className="space-y-4">
                {apiKeys.map((apiKey) => (
                  <Card key={apiKey.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-medium">{apiKey.name}</h3>
                          {apiKey.is_active ? (
                            <Badge className="bg-green-100 text-green-800">활성</Badge>
                          ) : (
                            <Badge variant="secondary">비활성</Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 mb-2">
                          <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                            {showFullKey === apiKey.id ? showFullKey : `${apiKey.key_prefix}...`}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowFullKey(showFullKey === apiKey.id ? null : apiKey.id)}
                          >
                            {showFullKey === apiKey.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(showFullKey === apiKey.id ? showFullKey : `${apiKey.key_prefix}...`)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>생성일: {formatDate(apiKey.created_at)}</p>
                          {apiKey.last_used_at && (
                            <p>마지막 사용: {formatDate(apiKey.last_used_at)}</p>
                          )}
                          {apiKey.expires_at && (
                            <p>만료일: {formatDate(apiKey.expires_at)}</p>
                          )}
                        </div>
                      </div>
                      {canAccess('developer') && (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteApiKey(apiKey.id, apiKey.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Key className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">API 키가 없습니다</h3>
                <p className="text-muted-foreground mb-4">
                  새로운 API 키를 생성하여 MCP 서비스를 사용하세요.
                </p>
                {canAccess('developer') && (
                  <Button onClick={() => setCreateKeyDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    첫 번째 API 키 생성
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TeamLayout>
  );
}