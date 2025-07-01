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
import { showDeleteConfirm } from '@/lib/dialog-utils';
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
        visibility: 'private' // Default value
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
        toast.success('Team settings have been saved.');
      } else {
        const errorText = await response.text();
        console.error('Failed to save team settings:', errorText);
        toast.error(`Failed to save settings: ${errorText}`);
      }
    } catch (error) {
      console.error('Error saving team settings:', error);
      toast.error('An error occurred while saving settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTeam = async () => {
    const confirmed = await showDeleteConfirm(
      settings.name,
      '팀'
    );
    
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        toast.success('Team has been deleted.');
        // Redirect to teams list page
        window.location.href = '/teams';
      } else {
        const errorText = await response.text();
        console.error('Failed to delete team:', errorText);
        toast.error(`Failed to delete team: ${errorText}`);
      }
    } catch (error) {
      console.error('Error deleting team:', error);
      toast.error('An error occurred while deleting the team.');
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
            <p className="text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      </TeamLayout>
    );
  }

  return (
    <TeamLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="h-5 w-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Team Settings</h3>
          </div>
          <p className="text-sm text-gray-700">
            Manage basic team information and settings.
          </p>
        </div>

        {/* Basic Settings */}
        {canAccess('owner') ? (
          <Card>
            <CardHeader>
              <CardTitle>Basic Settings</CardTitle>
              <CardDescription>You can modify the basic information of the team.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="teamName">Team Name</Label>
                <Input
                  id="teamName"
                  value={settings.name}
                  onChange={(e) => setSettings(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter team name"
                />
              </div>
              
              <div>
                <Label htmlFor="teamDescription">Team Description</Label>
                <Textarea
                  id="teamDescription"
                  value={settings.description}
                  onChange={(e) => setSettings(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter team description"
                  rows={3}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveSettings} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Basic Settings</CardTitle>
              <CardDescription>Basic team information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Team Name</Label>
                <p className="text-sm font-medium mt-1">{settings.name}</p>
              </div>
              
              <div>
                <Label>Team Description</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {settings.description || 'No description available.'}
                </p>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Owner permission is required to change team settings.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Danger Zone */}
        {canAccess('owner') && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-700">Danger Zone</CardTitle>
              <CardDescription>
                These actions cannot be undone. Please proceed with caution.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                  <h4 className="font-medium text-red-800 mb-2">Delete Team</h4>
                  <p className="text-sm text-red-700 mb-4">
                    Deleting the team will permanently delete all projects, members, servers, and API keys.
                    This action cannot be undone.
                  </p>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteTeam}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Team
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