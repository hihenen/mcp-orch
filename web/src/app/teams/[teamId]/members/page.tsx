'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TeamLayout } from '@/components/teams/TeamLayout';
import { useTeamStore } from '@/stores/teamStore';
import { toast } from 'sonner';
import { 
  Users, 
  UserPlus, 
  Crown,
  Code,
  FileText,
  Shield,
  Mail,
  MoreHorizontal,
  ChevronDown,
  Trash2
} from 'lucide-react';

interface TeamMember {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: string;
  joined_at: string;
  is_current_user?: boolean;
  avatar_url?: string;
}

export default function TeamMembersPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const { selectedTeam } = useTeamStore();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberFilter, setMemberFilter] = useState('');
  const [inviteMemberDialog, setInviteMemberDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('reporter');

  useEffect(() => {
    if (teamId) {
      loadMembers();
    }
  }, [teamId]);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/teams/${teamId}/members`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const memberData = await response.json();
        setMembers(memberData);
      } else {
        console.error('Failed to load members:', response.status, response.statusText);
        // Demo data
        const demoMembers: TeamMember[] = [
          {
            id: '1',
            user_id: '1',
            name: 'John Doe',
            email: 'john.doe@example.com',
            role: 'owner',
            joined_at: '2025-06-01T10:00:00Z',
            is_current_user: true
          },
          {
            id: '2',
            user_id: '2', 
            name: 'Jane Smith',
            email: 'jane.smith@example.com',
            role: 'developer',
            joined_at: '2025-06-02T11:30:00Z',
            is_current_user: false
          },
          {
            id: '3',
            user_id: '3',
            name: 'Bob Wilson',
            email: 'bob.wilson@example.com', 
            role: 'reporter',
            joined_at: '2025-06-03T09:00:00Z',
            is_current_user: false
          }
        ];
        setMembers(demoMembers);
      }
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address.');
      return;
    }

    try {
      const response = await fetch(`/api/teams/${teamId}/members/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole
        })
      });

      if (response.ok) {
        toast.success('Team member invitation has been sent.');
        setInviteMemberDialog(false);
        setInviteEmail('');
        setInviteRole('reporter');
        loadMembers();
      } else {
        const errorText = await response.text();
        console.error('Failed to invite member:', errorText);
        toast.error(`Failed to invite team member: ${errorText}`);
      }
    } catch (error) {
      console.error('Error inviting member:', error);
      toast.error('An error occurred while inviting team member.');
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/members/${memberId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          role: newRole
        })
      });

      if (response.ok) {
        const member = members.find(m => m.user_id === memberId);
        const memberName = member?.name || member?.email || 'Member';
        toast.success(`${memberName}'s role has been changed to ${newRole}.`);
        loadMembers();
      } else {
        const errorText = await response.text();
        console.error('Failed to update member role:', errorText);
        toast.error(`Failed to change role: ${errorText}`);
      }
    } catch (error) {
      console.error('Error updating member role:', error);
      toast.error('An error occurred while changing role.');
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from the team?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/teams/${teamId}/members/${memberId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        toast.success(`${memberName} has been removed from the team.`);
        loadMembers();
      } else {
        const errorText = await response.text();
        console.error('Failed to remove member:', errorText);
        toast.error(`Failed to remove member: ${errorText}`);
      }
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('An error occurred while removing member.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const canAccess = (requiredRole: 'owner' | 'developer' | 'reporter') => {
    if (!selectedTeam?.role) return false;
    const roleHierarchy = { owner: 3, developer: 2, reporter: 1 };
    const userRoleLevel = roleHierarchy[selectedTeam.role.toLowerCase() as keyof typeof roleHierarchy] || 0;
    return userRoleLevel >= roleHierarchy[requiredRole];
  };

  const filteredMembers = members.filter(member => 
    memberFilter === '' || 
    member.name?.toLowerCase().includes(memberFilter.toLowerCase()) ||
    member.email?.toLowerCase().includes(memberFilter.toLowerCase())
  );

  if (loading) {
    return (
      <TeamLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading team member information...</p>
          </div>
        </div>
      </TeamLayout>
    );
  }

  return (
    <TeamLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-purple-900">Team Member Management</h3>
          </div>
          <p className="text-sm text-purple-700">
            Invite team members and manage their roles. Currently {members.length} member{members.length !== 1 ? 's' : ''} participating in the team.
          </p>
        </div>

        {/* Team Member Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>{members.length} member{members.length !== 1 ? 's' : ''}</CardDescription>
              </div>
              {canAccess('owner') && (
                <Dialog open={inviteMemberDialog} onOpenChange={setInviteMemberDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Invite Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite Team Member</DialogTitle>
                      <DialogDescription>
                        Invite a new team member.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="inviteEmail">Email</Label>
                        <Input
                          id="inviteEmail"
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="Enter email address to invite"
                        />
                      </div>
                      <div>
                        <Label htmlFor="inviteRole">Role</Label>
                        <Select value={inviteRole} onValueChange={setInviteRole}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owner">Owner</SelectItem>
                            <SelectItem value="developer">Developer</SelectItem>
                            <SelectItem value="reporter">Reporter</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setInviteMemberDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleInviteMember}>
                          Send Invitation
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Member Search */}
            <div className="flex items-center space-x-2 mb-6">
              <div className="flex-1">
                <Input
                  placeholder="Search members..."
                  value={memberFilter}
                  onChange={(e) => setMemberFilter(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <Button variant="outline" size="sm">
                Sort <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </div>

            {/* Member Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-4 font-medium text-sm text-gray-700">Account</th>
                    <th className="text-left p-4 font-medium text-sm text-gray-700">Source</th>
                    <th className="text-left p-4 font-medium text-sm text-gray-700">Role</th>
                    <th className="text-left p-4 font-medium text-sm text-gray-700">Joined</th>
                    <th className="text-left p-4 font-medium text-sm text-gray-700">Activity</th>
                    <th className="text-right p-4 font-medium text-sm text-gray-700"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={member.avatar_url} />
                            <AvatarFallback className="text-sm">
                              {getInitials(member.name || member.email || 'U')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{member.name || member.email || 'Unknown User'}</span>
                              {member.is_current_user && (
                                <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800">
                                  It's you
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {member.email || '@username'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          <p className="text-muted-foreground">Direct team invitation</p>
                          <p className="text-xs text-muted-foreground">
                            {selectedTeam?.name}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <Select
                          value={member.role}
                          onValueChange={(value) => handleRoleChange(member.user_id, value)}
                          disabled={!canAccess('owner') || member.role === 'owner'}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue>
                              <div className="flex items-center gap-2">
                                {member.role === 'owner' && <Crown className="h-4 w-4 text-red-600" />}
                                {member.role === 'developer' && <Code className="h-4 w-4 text-blue-600" />}
                                {member.role === 'reporter' && <FileText className="h-4 w-4 text-gray-600" />}
                                <span className="capitalize">{member.role}</span>
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owner">
                              <div className="flex items-center gap-2">
                                <Crown className="h-4 w-4 text-red-600" />
                                <span>Owner</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="developer">
                              <div className="flex items-center gap-2">
                                <Code className="h-4 w-4 text-blue-600" />
                                <span>Developer</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="reporter">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-gray-600" />
                                <span>Reporter</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-muted-foreground">
                          <p>{formatDate(member.joined_at || new Date().toISOString())}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-muted-foreground">
                          <p>Recent Activity</p>
                          <p className="text-xs">Active Status</p>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        {canAccess('owner') && member.role !== 'owner' && !member.is_current_user && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Shield className="h-4 w-4 mr-2" />
                                Edit Permissions
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Mail className="h-4 w-4 mr-2" />
                                Re-invite
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => handleRemoveMember(member.user_id, member.name || member.email)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove from Team
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </TeamLayout>
  );
}