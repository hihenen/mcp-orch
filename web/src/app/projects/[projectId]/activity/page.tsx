'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Activity,
  Search,
  Filter,
  Calendar,
  Server,
  Users,
  Settings,
  Key,
  RefreshCw,
  UserPlus,
  Trash,
  Edit,
  Play,
  Download
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { ProjectLayout } from '@/components/projects/ProjectLayout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ActivityItem {
  id: string;
  type: 'server_added' | 'server_removed' | 'member_invited' | 'member_removed' | 'member_role_changed' | 'settings_changed' | 'api_key_created' | 'api_key_deleted' | 'tool_executed';
  description: string;
  user_name: string;
  timestamp: string;
  details?: any;
}

// 모스 데이터 (추후 실제 API로 대체)
const mockActivityData: ActivityItem[] = [
  {
    id: '1',
    type: 'server_added',
    description: "새 MCP 서버 'excel-server'가 추가되었습니다",
    user_name: 'Admin',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2시간 전
  },
  {
    id: '2',
    type: 'member_invited',
    description: "새 멤버 'john@example.com'이 Developer 역할로 초대되었습니다",
    user_name: 'Owner',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1일 전
  },
  {
    id: '3',
    type: 'settings_changed',
    description: '프로젝트 설정이 업데이트되었습니다',
    user_name: 'Maintainer',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3일 전
  },
  {
    id: '4',
    type: 'api_key_created',
    description: "새 API 키 'Production Key'가 생성되었습니다",
    user_name: 'Developer',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5일 전
  },
  {
    id: '5',
    type: 'tool_executed',
    description: "도구 'file-analyzer'가 실행되었습니다",
    user_name: 'Developer',
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7일 전
  },
  {
    id: '6',
    type: 'member_role_changed',
    description: "'jane@example.com'의 역할이 Reporter에서 Developer로 변경되었습니다",
    user_name: 'Owner',
    timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10일 전
  },
];

export default function ProjectActivityPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  
  const { 
    selectedProject,
    loadProject
  } = useProjectStore();

  // 상태 관리
  const [activities, setActivities] = useState<ActivityItem[]>(mockActivityData);
  const [searchQuery, setSearchQuery] = useState('');
  const [activityFilter, setActivityFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');

  // 페이지 로드 시 데이터 로드
  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
      // TODO: 실제 활동 데이터 로드 API 호출
      // loadProjectActivities(projectId);
    }
  }, [projectId, loadProject]);

  // 활동 타입별 아이콘 및 색상 반환
  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'server_added':
      case 'server_removed':
        return { icon: Server, bgColor: 'bg-blue-100', iconColor: 'text-blue-600' };
      case 'member_invited':
      case 'member_removed':
      case 'member_role_changed':
        return { icon: Users, bgColor: 'bg-green-100', iconColor: 'text-green-600' };
      case 'settings_changed':
        return { icon: Settings, bgColor: 'bg-orange-100', iconColor: 'text-orange-600' };
      case 'api_key_created':
      case 'api_key_deleted':
        return { icon: Key, bgColor: 'bg-purple-100', iconColor: 'text-purple-600' };
      case 'tool_executed':
        return { icon: Play, bgColor: 'bg-indigo-100', iconColor: 'text-indigo-600' };
      default:
        return { icon: Activity, bgColor: 'bg-gray-100', iconColor: 'text-gray-600' };
    }
  };

  // 상대적 시간 표시 함수
  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - activityTime.getTime()) / (1000 * 60));

    if (diffInMinutes < 60) {
      return `${diffInMinutes}분 전`;
    } else if (diffInMinutes < 1440) { // 24시간
      return `${Math.floor(diffInMinutes / 60)}시간 전`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}일 전`;
    }
  };

  // 필터링된 활동 목록
  const filteredActivities = activities.filter((activity) => {
    const matchesSearch = activity.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         activity.user_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = activityFilter === 'all' || activity.type === activityFilter;
    
    let matchesTime = true;
    if (timeFilter !== 'all') {
      const now = new Date();
      const activityTime = new Date(activity.timestamp);
      const diffInHours = (now.getTime() - activityTime.getTime()) / (1000 * 60 * 60);
      
      switch (timeFilter) {
        case 'today':
          matchesTime = diffInHours <= 24;
          break;
        case 'week':
          matchesTime = diffInHours <= 24 * 7;
          break;
        case 'month':
          matchesTime = diffInHours <= 24 * 30;
          break;
      }
    }
    
    return matchesSearch && matchesType && matchesTime;
  });

  // 활동 새로고침 핸들러
  const handleRefreshActivities = () => {
    // TODO: 실제 API 호출로 대체
    setActivities([...mockActivityData]);
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
            <Activity className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">프로젝트 활동</h3>
          </div>
          <p className="text-sm text-blue-700">
            프로젝트에서 일어난 모든 활동을 시간순으로 확인할 수 있습니다.
            멤버 초대, 서버 추가, 설정 변경 등의 중요한 이벤트들이 기록됩니다.
          </p>
        </div>

        {/* 검색 및 필터 섹션 */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="활동 내용 또는 사용자로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={activityFilter} onValueChange={setActivityFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 활동</SelectItem>
                  <SelectItem value="server_added">서버 추가</SelectItem>
                  <SelectItem value="member_invited">멤버 초대</SelectItem>
                  <SelectItem value="settings_changed">설정 변경</SelectItem>
                  <SelectItem value="api_key_created">API 키 생성</SelectItem>
                  <SelectItem value="tool_executed">도구 실행</SelectItem>
                </SelectContent>
              </Select>
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 기간</SelectItem>
                  <SelectItem value="today">오늘</SelectItem>
                  <SelectItem value="week">지난 주</SelectItem>
                  <SelectItem value="month">지난 달</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefreshActivities}>
              <RefreshCw className="h-4 w-4 mr-2" />
              새로고침
            </Button>
          </div>
        </div>

        {/* 활동 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                총 활동
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activities.length}</div>
              <p className="text-sm text-muted-foreground">전체 활동</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                오늘
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {activities.filter(activity => {
                  const diffInHours = (new Date().getTime() - new Date(activity.timestamp).getTime()) / (1000 * 60 * 60);
                  return diffInHours <= 24;
                }).length}
              </div>
              <p className="text-sm text-muted-foreground">오늘의 활동</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
                필터 결과
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredActivities.length}</div>
              <p className="text-sm text-muted-foreground">검색 결과</p>
            </CardContent>
          </Card>
        </div>

        {/* 활동 목록 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              활동 기록
            </CardTitle>
            <CardDescription>
              프로젝트의 최근 변경사항과 활동 기록입니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredActivities.length > 0 ? (
              <div className="space-y-6">
                {filteredActivities.map((activity) => {
                  const { icon: IconComponent, bgColor, iconColor } = getActivityIcon(activity.type);
                  
                  return (
                    <div key={activity.id} className="flex items-start gap-4">
                      <div className={`w-8 h-8 ${bgColor} rounded-full flex items-center justify-center`}>
                        <IconComponent className={`h-4 w-4 ${iconColor}`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{activity.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {getRelativeTime(activity.timestamp)} • {activity.user_name}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <div className="space-y-2">
                  {searchQuery || activityFilter !== 'all' || timeFilter !== 'all' ? (
                    <>
                      <p className="text-muted-foreground">검색 조건에 맞는 활동이 없습니다.</p>
                      <p className="text-sm text-muted-foreground">
                        다른 검색어를 시도하거나 필터를 재설정해보세요.
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setSearchQuery('');
                          setActivityFilter('all');
                          setTimeFilter('all');
                        }}
                        className="mt-4"
                      >
                        필터 초기화
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-muted-foreground">아직 활동 기록이 없습니다.</p>
                      <p className="text-sm text-muted-foreground">
                        프로젝트에서 활동이 시작되면 여기에 기록됩니다.
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProjectLayout>
  );
}