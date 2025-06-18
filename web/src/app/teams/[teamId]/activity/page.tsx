'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TeamLayout } from '@/components/teams/TeamLayout';
import { 
  Activity, 
  Users,
  Server,
  Wrench,
  Settings
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  user_name: string;
  timestamp: string;
}

export default function TeamActivityPage() {
  const params = useParams();
  const teamId = params.teamId as string;

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (teamId) {
      loadActivities();
    }
  }, [teamId]);

  const loadActivities = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/teams/${teamId}/activity`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const activityData = await response.json();
        setActivities(activityData);
      } else {
        // 데모 데이터
        const demoActivities: ActivityItem[] = [
          {
            id: '1',
            type: 'member_joined',
            description: 'Bob Wilson joined the team as Reporter',
            user_name: 'Bob Wilson',
            timestamp: '2025-06-03T09:00:00Z'
          },
          {
            id: '2',
            type: 'server_added',
            description: 'AWS Server was added to the team',
            user_name: 'John Doe',
            timestamp: '2025-06-02T16:30:00Z'
          },
          {
            id: '3',
            type: 'tool_executed',
            description: 'Read Excel Sheet tool was executed 5 times',
            user_name: 'Jane Smith',
            timestamp: '2025-06-02T14:20:00Z'
          },
          {
            id: '4',
            type: 'project_created',
            description: 'New project "Data Analysis" was created',
            user_name: 'John Doe',
            timestamp: '2025-06-01T10:00:00Z'
          }
        ];
        setActivities(demoActivities);
      }
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'member_joined':
      case 'member_left':
        return <Users className="h-4 w-4 text-blue-500" />;
      case 'server_added':
      case 'server_removed':
        return <Server className="h-4 w-4 text-green-500" />;
      case 'tool_executed':
        return <Wrench className="h-4 w-4 text-orange-500" />;
      case 'settings_changed':
        return <Settings className="h-4 w-4 text-purple-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <TeamLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-muted-foreground">활동 정보를 불러오는 중...</p>
          </div>
        </div>
      </TeamLayout>
    );
  }

  return (
    <TeamLayout>
      <div className="space-y-6">
        {/* 헤더 섹션 */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-5 w-5 text-indigo-600" />
            <h3 className="font-semibold text-indigo-900">팀 활동</h3>
          </div>
          <p className="text-sm text-indigo-700">
            팀에서 발생한 모든 활동을 시간순으로 확인할 수 있습니다.
          </p>
        </div>

        {/* 활동 피드 */}
        <Card>
          <CardHeader>
            <CardTitle>최근 활동</CardTitle>
            <CardDescription>팀의 모든 활동 기록</CardDescription>
          </CardHeader>
          <CardContent>
            {activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50">
                    <div className="mt-1">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{activity.description}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-muted-foreground font-medium">
                          {activity.user_name}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(activity.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Activity className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">활동이 없습니다</h3>
                <p className="text-muted-foreground">
                  팀에서 활동이 시작되면 여기에 표시됩니다.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TeamLayout>
  );
}