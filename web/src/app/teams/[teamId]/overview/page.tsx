'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { TeamLayout } from '@/components/teams/TeamLayout';
import { useTeamData } from '@/hooks/teams/useTeamData';
import { useTeamStore } from '@/stores/teamStore';
import { formatDate, getRelativeTime } from '@/utils/teamUtils';
import { 
  Users, 
  Server, 
  Wrench, 
  Key,
  Activity
} from 'lucide-react';

export default function TeamOverviewPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const { selectedTeam } = useTeamStore();
  
  console.log('🔍 [OVERVIEW_DEBUG] TeamOverviewPage rendered with teamId:', teamId);
  console.log('🔍 [OVERVIEW_DEBUG] selectedTeam from store:', selectedTeam);
  
  const {
    organization,
    members,
    servers,
    tools,
    apiKeys,
    activities,
    loading,
    loadAllData
  } = useTeamData(teamId);

  console.log('🔍 [OVERVIEW_DEBUG] useTeamData results:', {
    organization,
    membersCount: members?.length,
    serversCount: servers?.length,
    toolsCount: tools?.length,
    apiKeysCount: apiKeys?.length,
    activitiesCount: activities?.length,
    loading
  });

  useEffect(() => {
    console.log('🔍 [OVERVIEW_DEBUG] useEffect triggered with teamId:', teamId);
    if (teamId) {
      loadAllData();
    }
  }, [teamId, loadAllData]);



  if (loading) {
    return (
      <TeamLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-muted-foreground">팀 정보를 불러오는 중...</p>
          </div>
        </div>
      </TeamLayout>
    );
  }

  return (
    <TeamLayout>
      <div className="space-y-6">
        {/* 헤더 섹션 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">팀 개요</h3>
          </div>
          <p className="text-sm text-blue-700">
            {selectedTeam?.description || '팀의 전반적인 현황과 주요 정보를 한눈에 확인할 수 있습니다.'}
          </p>
        </div>

        {/* 통계 카드들 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Users className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{members.length}</p>
                  <p className="text-sm text-muted-foreground">멤버</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Server className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{servers.length}</p>
                  <p className="text-sm text-muted-foreground">서버</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Wrench className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{tools.length}</p>
                  <p className="text-sm text-muted-foreground">도구</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Key className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{apiKeys.length}</p>
                  <p className="text-sm text-muted-foreground">API 키</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 팀 정보 카드 */}
        {selectedTeam && (
          <Card>
            <CardHeader>
              <CardTitle>팀 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>팀 이름</Label>
                  <p className="text-sm font-medium">{selectedTeam.name}</p>
                </div>
                <div>
                  <Label>생성일</Label>
                  <p className="text-sm font-medium">{formatDate(selectedTeam.created_at)}</p>
                </div>
                <div className="md:col-span-2">
                  <Label>설명</Label>
                  <p className="text-sm font-medium">{selectedTeam.description || '설명이 없습니다.'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 최근 활동 */}
        <Card>
          <CardHeader>
            <CardTitle>최근 활동</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.user_name} • {getRelativeTime(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              {activities.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  최근 활동이 없습니다.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </TeamLayout>
  );
}