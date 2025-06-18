'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TeamLayout } from '@/components/teams/TeamLayout';
import { useTeamStore } from '@/stores/teamStore';
import { toast } from 'sonner';
import { 
  Settings, 
  Save,
  Trash2,
  AlertTriangle
} from 'lucide-react';

interface TeamSettings {
  name: string;
  description: string;
  visibility: 'public' | 'private';
}

export default function TeamSettingsPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const { selectedTeam } = useTeamStore();

  const [settings, setSettings] = useState<TeamSettings>({
    name: '',
    description: '',
    visibility: 'private'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (teamId) {
      loadTeamSettings();
    }
  }, [teamId]);

  useEffect(() => {
    if (selectedTeam) {
      setSettings({
        name: selectedTeam.name,
        description: selectedTeam.description || '',
        visibility: 'private' // 기본값
      });
    }
  }, [selectedTeam]);

  const loadTeamSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/teams/${teamId}/settings`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const settingsData = await response.json();
        setSettings(settingsData);
      } else {
        console.error('Failed to load team settings:', response.status);
      }
    } catch (error) {
      console.error('Failed to load team settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/teams/${teamId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        toast.success('팀 설정이 저장되었습니다.');
      } else {
        const errorText = await response.text();
        console.error('Failed to save team settings:', errorText);
        toast.error(`설정 저장에 실패했습니다: ${errorText}`);
      }
    } catch (error) {
      console.error('Error saving team settings:', error);
      toast.error('설정 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTeam = async () => {
    const confirmMessage = `정말로 "${settings.name}" 팀을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며 모든 데이터가 영구적으로 삭제됩니다.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        toast.success('팀이 삭제되었습니다.');
        // 팀 목록 페이지로 리다이렉트
        window.location.href = '/teams';
      } else {
        const errorText = await response.text();
        console.error('Failed to delete team:', errorText);
        toast.error(`팀 삭제에 실패했습니다: ${errorText}`);
      }
    } catch (error) {
      console.error('Error deleting team:', error);
      toast.error('팀 삭제 중 오류가 발생했습니다.');
    }
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
            <p className="text-muted-foreground">설정을 불러오는 중...</p>
          </div>
        </div>
      </TeamLayout>
    );
  }

  return (
    <TeamLayout>
      <div className="space-y-6">
        {/* 헤더 섹션 */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="h-5 w-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">팀 설정</h3>
          </div>
          <p className="text-sm text-gray-700">
            팀의 기본 정보와 설정을 관리할 수 있습니다.
          </p>
        </div>

        {/* 기본 설정 */}
        {canAccess('owner') ? (
          <Card>
            <CardHeader>
              <CardTitle>기본 설정</CardTitle>
              <CardDescription>팀의 기본 정보를 수정할 수 있습니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="teamName">팀 이름</Label>
                <Input
                  id="teamName"
                  value={settings.name}
                  onChange={(e) => setSettings(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="팀 이름을 입력하세요"
                />
              </div>
              
              <div>
                <Label htmlFor="teamDescription">팀 설명</Label>
                <Textarea
                  id="teamDescription"
                  value={settings.description}
                  onChange={(e) => setSettings(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="팀에 대한 설명을 입력하세요"
                  rows={3}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveSettings} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? '저장 중...' : '설정 저장'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>기본 설정</CardTitle>
              <CardDescription>팀의 기본 정보입니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>팀 이름</Label>
                <p className="text-sm font-medium mt-1">{settings.name}</p>
              </div>
              
              <div>
                <Label>팀 설명</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {settings.description || '설명이 없습니다.'}
                </p>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  팀 설정을 변경하려면 Owner 권한이 필요합니다.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* 위험 구역 */}
        {canAccess('owner') && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-700">위험 구역</CardTitle>
              <CardDescription>
                이 작업들은 되돌릴 수 없습니다. 신중하게 진행하세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                  <h4 className="font-medium text-red-800 mb-2">팀 삭제</h4>
                  <p className="text-sm text-red-700 mb-4">
                    팀을 삭제하면 모든 프로젝트, 멤버, 서버, API 키가 영구적으로 삭제됩니다.
                    이 작업은 되돌릴 수 없습니다.
                  </p>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteTeam}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    팀 삭제
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TeamLayout>
  );
}