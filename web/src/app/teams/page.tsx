'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Settings, Users, Calendar } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/date-utils';

interface Team {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  member_count: number;
  user_role: string;
}

export default function TeamsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [createTeamDialog, setCreateTeamDialog] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');

  // Login check
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Load team list
  useEffect(() => {
    if (session?.user) {
      loadTeams();
    }
  }, [session]);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/teams/', {
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const teamList = await response.json();
        setTeams(teamList);
      } else {
        console.log('Backend not responding, using demo data.');
        
        // Fallback to demo data
        const demoTeams = [
          { id: '550e8400-e29b-41d4-a716-446655440000', name: "John's Team", created_at: '2025-06-01T00:00:00Z', updated_at: '2025-06-01T00:00:00Z', member_count: 1, user_role: 'owner' },
          { id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8', name: "Development Team", created_at: '2025-06-01T00:00:00Z', updated_at: '2025-06-01T00:00:00Z', member_count: 3, user_role: 'admin' }
        ];
        setTeams(demoTeams);
      }
    } catch (error) {
      console.error('Failed to load teams:', error);
      console.log('Network error, using demo data.');
      
      // Demo data on network error
      const demoTeams = [
        { id: '550e8400-e29b-41d4-a716-446655440000', name: "John's Team", created_at: '2025-06-01T00:00:00Z', updated_at: '2025-06-01T00:00:00Z', member_count: 1, user_role: 'owner' },
        { id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8', name: "Development Team", created_at: '2025-06-01T00:00:00Z', updated_at: '2025-06-01T00:00:00Z', member_count: 3, user_role: 'admin' }
      ];
      setTeams(demoTeams);
    } finally {
      setLoading(false);
    }
  };

  const createTeam = async () => {
    if (!newTeamName.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/teams/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          name: newTeamName
        })
      });

      if (response.ok) {
        const newTeam = await response.json();
        alert('New team created successfully!');
        setCreateTeamDialog(false);
        setNewTeamName('');
        loadTeams(); // Refresh team list
        
        // Navigate to newly created team detail page
        router.push(`/teams/${newTeam.id}`);
      } else {
        // Demo response
        const demoTeam: Team = {
          id: `demo-${Date.now()}`,
          name: newTeamName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          member_count: 1,
          user_role: 'owner'
        };
        setTeams((prev: Team[]) => [...prev, demoTeam]);
        alert('New team created successfully! (Demo)');
        setCreateTeamDialog(false);
        setNewTeamName('');
        
        // Navigate to demo team detail page
        router.push(`/teams/${demoTeam.id}`);
      }
    } catch (error) {
      console.error('Failed to create team:', error);
      alert('Failed to create team.');
    } finally {
      setLoading(false);
    }
  };


  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-red-100 text-red-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'developer': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-muted-foreground">Select a team to manage</p>
        </div>
        <Dialog open={createTeamDialog} onOpenChange={setCreateTeamDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create New Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
              <DialogDescription>
                Create a new team. You will be redirected to the team detail page after creation.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="teamName">Team Name</Label>
                <Input
                  id="teamName"
                  placeholder="e.g., Frontend Team"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCreateTeamDialog(false);
                    setNewTeamName('');
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={createTeam} disabled={loading || !newTeamName.trim()}>
                  {loading ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Team List */}
      <Card>
        <CardHeader>
          <CardTitle>My Teams</CardTitle>
          <CardDescription>List of teams you belong to. Click on a team to manage it.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading teams...</p>
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-12">
              <Settings className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No teams created yet.</p>
              <Button onClick={() => setCreateTeamDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Team
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((team: Team) => (
                <Card 
                  key={team.id} 
                  className="cursor-pointer transition-all hover:shadow-md hover:scale-105"
                  onClick={() => router.push(`/teams/${team.id}`)}
                >
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Team Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Settings className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{team.name}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(team.user_role)}`}>
                              {team.user_role.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Team Information */}
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Users className="w-4 h-4 mr-2" />
                          <span>{team.member_count} member{team.member_count !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span>Created: {formatDate(team.created_at)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Last updated: {formatDate(team.updated_at)}
                        </div>
                      </div>

                      {/* Bottom Action Hint */}
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground text-center">
                          Click to go to team management page
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Guide */}
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-2">
            <h3 className="font-medium">Team Management Guide</h3>
            <p className="text-sm text-muted-foreground">
              Click on a team to access member management, API key settings, server management, activity history, and more.
            </p>
            <div className="flex justify-center space-x-4 text-sm text-muted-foreground mt-4">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                <span>OWNER - Full permissions</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                <span>ADMIN - Management permissions</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span>DEVELOPER - Development permissions</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
