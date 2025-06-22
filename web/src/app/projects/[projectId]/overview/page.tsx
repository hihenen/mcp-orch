'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Activity,
  Server,
  Users,
  Calendar,
  CheckCircle,
  Clock,
  UserPlus,
  Settings,
  RefreshCw,
  Plus,
  Trash,
  Key,
  AlertCircle
} from 'lucide-react';
import { useProjectStore, ProjectActivity } from '@/stores/projectStore';
import { ProjectLayout } from '@/components/projects/ProjectLayout';
import { formatDate, formatRelativeTime } from '@/lib/date-utils';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getRoleBadgeColor(role: string): string {
  switch (role?.toLowerCase()) {
    case 'owner':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'developer':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'reporter':
      return 'bg-gray-50 text-gray-700 border-gray-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

function getActivityIcon(action: string) {
  const actionType = action.toLowerCase();
  
  if (actionType.includes('server')) {
    if (actionType.includes('created')) return <Plus className="h-3 w-3" />;
    if (actionType.includes('deleted')) return <Trash className="h-3 w-3" />;
    return <Server className="h-3 w-3" />;
  }
  
  if (actionType.includes('member')) {
    return <UserPlus className="h-3 w-3" />;
  }
  
  if (actionType.includes('api_key')) {
    return <Key className="h-3 w-3" />;
  }
  
  if (actionType.includes('tool')) {
    return <Activity className="h-3 w-3" />;
  }
  
  return <Activity className="h-3 w-3" />;
}

function getActivityColor(severity: string): string {
  switch (severity) {
    case 'success':
      return 'bg-green-500';
    case 'warning':
      return 'bg-yellow-500';
    case 'error':
      return 'bg-red-500';
    case 'info':
    default:
      return 'bg-blue-500';
  }
}

export default function ProjectOverviewPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  
  const { 
    selectedProject, 
    projectMembers, 
    projectServers,
    loadProject, 
    loadProjectMembers,
    loadProjectServers,
    loadRecentProjectActivities,
    refreshProjectServers,
    isLoading 
  } = useProjectStore();
  
  // Recent activity data state
  const [recentActivities, setRecentActivities] = useState<ProjectActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  useEffect(() => {
    if (projectId) {
      console.log('🔵 Overview page - Data loading started:', projectId);
      
      loadProject(projectId).then(() => {
        console.log('✅ loadProject completed');
      }).catch(err => {
        console.error('❌ loadProject failed:', err);
      });
      
      loadProjectMembers(projectId).then(() => {
        console.log('✅ loadProjectMembers completed');
      }).catch(err => {
        console.error('❌ loadProjectMembers failed:', err);
      });
      
      loadProjectServers(projectId).then(() => {
        console.log('✅ loadProjectServers completed');
      }).catch(err => {
        console.error('❌ loadProjectServers failed:', err);
      });
      
      // Load recent activity data
      setActivitiesLoading(true);
      loadRecentProjectActivities(projectId).then((activities) => {
        console.log('✅ loadRecentProjectActivities completed:', activities.length, 'items');
        setRecentActivities(activities);
        setActivitiesLoading(false);
      }).catch(err => {
        console.error('❌ loadRecentProjectActivities failed:', err);
        setActivitiesLoading(false);
      });
      
      // loadProjectTools removed - Performance optimization by disabling real-time tool query per server
      // Tool count uses cached information from server list
      console.log('ℹ️ Overview page: Real-time tool load skipped (performance optimization)');
    }
  }, [projectId, loadProject, loadProjectMembers, loadProjectServers, loadRecentProjectActivities]);

  if (isLoading) {
    return (
      <ProjectLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading project information...</p>
          </div>
        </div>
      </ProjectLayout>
    );
  }

  // Data state logging at render time
  console.log('🔍 Overview rendering state:', {
    selectedProject: !!selectedProject,
    projectMembers: projectMembers ? projectMembers.length : 'undefined',
    projectServers: projectServers ? projectServers.length : 'undefined', 
    totalTools: projectServers ? projectServers.reduce((total, server) => total + (server.tools_count || 0), 0) : 0,
    isLoading
  });

  if (!selectedProject) {
    return (
      <ProjectLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Project not found.</p>
        </div>
      </ProjectLayout>
    );
  }

  return (
    <ProjectLayout>
      <div className="container py-6 space-y-6">
        {/* Header Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Project Overview</h3>
          </div>
          <p className="text-sm text-blue-700">
            {selectedProject.description || 'View comprehensive project status and key information at a glance.'}
          </p>
        </div>

        {/* Main Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Project Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Project Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Created Date
                </p>
                <p className="text-sm text-muted-foreground ml-6">
                  {formatDate(selectedProject.created_at)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Status
                </p>
                <div className="ml-6">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Active
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Server Status Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Server Status
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      await refreshProjectServers(projectId);
                    } catch (error) {
                      console.error('Server refresh failed:', error);
                    }
                  }}
                  className="text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Active Servers</span>
                <span className="text-sm font-medium">
                  {projectServers ? projectServers.filter(s => !s.disabled).length : 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Disabled Servers</span>
                <span className="text-sm font-medium">
                  {projectServers ? projectServers.filter(s => s.disabled).length : 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Total Tools</span>
                <span className="text-sm font-medium">
                  {projectServers ? 
                    projectServers.reduce((total, server) => 
                      total + (server.tools_count || 0), 0
                    ) : 0}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Team Members Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {projectMembers ? projectMembers.slice(0, 3).map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getInitials(member.user_name || member.user_email || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {member.user_name || member.user_email || 'Unknown User'}
                      </p>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getRoleBadgeColor(member.role)}`}
                      >
                        {member.role}
                      </Badge>
                    </div>
                  </div>
                )) : []}
                {projectMembers && projectMembers.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{projectMembers.length - 3} more
                  </p>
                )}
                {(!projectMembers || projectMembers.length === 0) && (
                  <p className="text-xs text-muted-foreground">No members yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest project changes and events</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = `/projects/${projectId}/activity`}
                className="text-xs"
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {activitiesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                <p className="ml-3 text-sm text-muted-foreground">Loading activities...</p>
              </div>
            ) : recentActivities.length > 0 ? (
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`w-2 h-2 ${getActivityColor(activity.severity)} rounded-full mt-2`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {getActivityIcon(activity.action)}
                        <p className="text-sm truncate">{activity.description}</p>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(activity.created_at)}
                        </p>
                        {activity.user_name && (
                          <p className="text-xs text-muted-foreground">
                            by {activity.user_name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Recent Activity</h3>
                <p className="text-sm text-muted-foreground">
                  Project activities will appear here as they happen
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = `/projects/${projectId}/members`}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <UserPlus className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Invite Members</p>
                  <p className="text-xs text-muted-foreground">Add new team members</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = `/projects/${projectId}/servers`}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Server className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Manage Servers</p>
                  <p className="text-xs text-muted-foreground">Add/manage MCP servers</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tools page temporarily disabled */}
          {/* <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = `/projects/${projectId}/tools`}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Activity className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Run Tools</p>
                  <p className="text-xs text-muted-foreground">Use MCP tools</p>
                </div>
              </div>
            </CardContent>
          </Card> */}

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = `/projects/${projectId}/settings`}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Settings className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Settings</p>
                  <p className="text-xs text-muted-foreground">Manage project settings</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProjectLayout>
  );
}
