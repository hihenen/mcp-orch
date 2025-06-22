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
  project_id: string;
  user_id?: string;
  user_name: string;
  action: string;
  description: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  metadata: Record<string, any>;
  context: Record<string, any>;
  target_type?: string;
  target_id?: string;
  created_at: string;
}

interface ActivitySummary {
  total_activities: number;
  today_activities: number;
  severity_breakdown: Record<string, number>;
  action_breakdown: Record<string, number>;
  project_id: string;
  generated_at: string;
}

// API call functions
const fetchActivities = async (projectId: string, params: {
  actionFilter?: string;
  severityFilter?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<ActivityItem[]> => {
  const searchParams = new URLSearchParams();
  if (params.actionFilter) searchParams.set('action_filter', params.actionFilter);
  if (params.severityFilter) searchParams.set('severity_filter', params.severityFilter);
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.offset) searchParams.set('offset', params.offset.toString());

  const response = await fetch(`/api/projects/${projectId}/activities?${searchParams.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch activities: ${response.statusText}`);
  }
  return response.json();
};

const fetchActivitySummary = async (projectId: string): Promise<ActivitySummary> => {
  const response = await fetch(`/api/projects/${projectId}/activities/summary`);
  if (!response.ok) {
    throw new Error(`Failed to fetch activity summary: ${response.statusText}`);
  }
  return response.json();
};

export default function ProjectActivityPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  
  const { 
    selectedProject,
    loadProject
  } = useProjectStore();

  // State management
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activitySummary, setActivitySummary] = useState<ActivitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activityFilter, setActivityFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');

  // Data loading function
  const loadActivitiesData = async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      setError(null);

      // Load activity data and summary data in parallel
      const [activitiesData, summaryData] = await Promise.all([
        fetchActivities(projectId, {
          actionFilter: activityFilter === 'all' ? undefined : activityFilter,
          limit: 100
        }),
        fetchActivitySummary(projectId)
      ]);

      setActivities(activitiesData);
      setActivitySummary(summaryData);
    } catch (err) {
      console.error('Failed to load activities:', err);
      setError(err instanceof Error ? err.message : 'Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  // Load data when page loads
  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
      loadActivitiesData();
    }
  }, [projectId, loadProject]);

  // Reload data when filter changes
  useEffect(() => {
    if (projectId && !loading) {
      loadActivitiesData();
    }
  }, [activityFilter]);

  // Return activity type icons and colors
  const getActivityIcon = (action: string) => {
    if (action.startsWith('server.')) {
      return { icon: Server, bgColor: 'bg-blue-100', iconColor: 'text-blue-600' };
    } else if (action.startsWith('member.')) {
      return { icon: Users, bgColor: 'bg-green-100', iconColor: 'text-green-600' };
    } else if (action.startsWith('project.')) {
      return { icon: Settings, bgColor: 'bg-orange-100', iconColor: 'text-orange-600' };
    } else if (action.startsWith('api_key.')) {
      return { icon: Key, bgColor: 'bg-purple-100', iconColor: 'text-purple-600' };
    } else if (action.startsWith('tool.')) {
      return { icon: Play, bgColor: 'bg-indigo-100', iconColor: 'text-indigo-600' };
    } else if (action.startsWith('session.')) {
      return { icon: RefreshCw, bgColor: 'bg-gray-100', iconColor: 'text-gray-600' };
    } else {
      return { icon: Activity, bgColor: 'bg-gray-100', iconColor: 'text-gray-600' };
    }
  };

  // Relative time display function
  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - activityTime.getTime()) / (1000 * 60));

    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInMinutes < 1440) { // 24 hours
      return `${Math.floor(diffInMinutes / 60)} hours ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)} days ago`;
    }
  };

  // Filtered activity list
  const filteredActivities = activities.filter((activity) => {
    const matchesSearch = activity.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         activity.user_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = activityFilter === 'all' || activity.action === activityFilter;
    
    let matchesTime = true;
    if (timeFilter !== 'all') {
      const now = new Date();
      const activityTime = new Date(activity.created_at);
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

  // Activity refresh handler
  const handleRefreshActivities = () => {
    loadActivitiesData();
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
            <Activity className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Project Activity</h3>
          </div>
          <p className="text-sm text-blue-700">
            View all project activities in chronological order.
            Important events such as member invitations, server additions, and configuration changes are recorded here.
          </p>
        </div>

        {/* Search and filter section */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by activity or user..."
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
                  <SelectItem value="all">All Activities</SelectItem>
                  <SelectItem value="server.created">Server Created</SelectItem>
                  <SelectItem value="server.deleted">Server Deleted</SelectItem>
                  <SelectItem value="member.invited">Member Invited</SelectItem>
                  <SelectItem value="project.settings_updated">Settings Updated</SelectItem>
                  <SelectItem value="api_key.created">API Key Created</SelectItem>
                  <SelectItem value="tool.executed">Tool Executed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefreshActivities}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Activity statistics */}
        {error ? (
          <div className="text-center py-8">
            <div className="text-red-600 mb-4">Error loading activities: {error}</div>
            <Button onClick={loadActivitiesData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Total Activities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '-' : (activitySummary?.total_activities || activities.length)}
                </div>
                <p className="text-sm text-muted-foreground">All activities</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '-' : (activitySummary?.today_activities || activities.filter(activity => {
                    const diffInHours = (new Date().getTime() - new Date(activity.created_at).getTime()) / (1000 * 60 * 60);
                    return diffInHours <= 24;
                  }).length)}
                </div>
                <p className="text-sm text-muted-foreground">Today's activities</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtered
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '-' : filteredActivities.length}
                </div>
                <p className="text-sm text-muted-foreground">Search results</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Activity list */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Log
            </CardTitle>
            <CardDescription>
              Recent changes and activity records for this project
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading activities...</p>
              </div>
            ) : filteredActivities.length > 0 ? (
              <div className="space-y-6">
                {filteredActivities.map((activity) => {
                  const { icon: IconComponent, bgColor, iconColor } = getActivityIcon(activity.action);
                  
                  return (
                    <div key={activity.id} className="flex items-start gap-4">
                      <div className={`w-8 h-8 ${bgColor} rounded-full flex items-center justify-center`}>
                        <IconComponent className={`h-4 w-4 ${iconColor}`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{activity.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {getRelativeTime(activity.created_at)} • {activity.user_name}
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
                      <p className="text-muted-foreground">No activities match your search criteria.</p>
                      <p className="text-sm text-muted-foreground">
                        Try a different search term or reset the filters.
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
                        Reset Filters
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-muted-foreground">No activity records yet.</p>
                      <p className="text-sm text-muted-foreground">
                        Activities will be recorded here when they occur in the project.
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