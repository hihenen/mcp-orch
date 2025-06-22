'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { TeamLayout } from '@/components/teams/TeamLayout';
import { useTeamData } from '@/hooks/teams/useTeamData';
import { useTeamStore } from '@/stores/teamStore';
import { formatDate, formatRelativeTime } from '@/lib/date-utils';
import { 
  Users, 
  Server, 
  Activity
} from 'lucide-react';

export default function TeamOverviewPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const { selectedTeam } = useTeamStore();
  
  const {
    organization,
    members,
    servers,
    activities,
    loading,
    loadAllData
  } = useTeamData(teamId);

  useEffect(() => {
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
            <p className="text-muted-foreground">Loading team information...</p>
          </div>
        </div>
      </TeamLayout>
    );
  }

  return (
    <TeamLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Team Overview</h3>
          </div>
          <p className="text-sm text-blue-700">
            {selectedTeam?.description || 'View comprehensive team status and key information at a glance.'}
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Users className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{members.length}</p>
                  <p className="text-sm text-muted-foreground">Members</p>
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
                  <p className="text-sm text-muted-foreground">Servers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Information Card */}
        {selectedTeam && (
          <Card>
            <CardHeader>
              <CardTitle>Team Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Team Name</Label>
                  <p className="text-sm font-medium">{selectedTeam.name}</p>
                </div>
                <div>
                  <Label>Created Date</Label>
                  <p className="text-sm font-medium">{formatDate(selectedTeam.created_at)}</p>
                </div>
                <div className="md:col-span-2">
                  <Label>Description</Label>
                  <p className="text-sm font-medium">{selectedTeam.description || 'No description available.'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.user_name} • {formatRelativeTime(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              {activities.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent activity.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </TeamLayout>
  );
}