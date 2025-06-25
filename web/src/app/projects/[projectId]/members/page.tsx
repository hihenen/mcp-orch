'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users, 
  UserPlus,
  Mail,
  ChevronDown,
  Shield,
  Crown,
  Code,
  FileText,
  MoreHorizontal,
  RefreshCw
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { ProjectMember, ProjectRole, InviteSource, TeamForInvite, TeamInviteRequest } from '@/types/project';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ProjectLayout } from '@/components/projects/ProjectLayout';

export default function ProjectMembersPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  
  const { 
    selectedProject,
    projectMembers,
    availableTeams,
    isLoadingAvailableTeams,
    loadProject,
    loadProjectMembers,
    loadAvailableTeams,
    addProjectMember,
    inviteTeamToProject,
    updateProjectMember,
    removeProjectMember
  } = useProjectStore();

  // State management
  const [memberFilter, setMemberFilter] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteTab, setInviteTab] = useState('member');
  
  // Individual member invite data
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'developer',
    inviteAs: 'individual',
    message: ''
  });

  // Team invite data
  const [teamInviteData, setTeamInviteData] = useState({
    teamId: '',
    role: 'developer',
    message: ''
  });

  // Load data when page loads
  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
      loadProjectMembers(projectId);
      loadAvailableTeams(projectId);
    }
  }, [projectId, loadProject, loadProjectMembers, loadAvailableTeams]);

  // Helper function to generate initials
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Invite tab change handler
  const handleInviteTabChange = (value: string) => {
    setInviteTab(value);
    if (value === 'team') {
      loadAvailableTeams(projectId);
    }
  };

  // Individual member invite handler
  const handleInviteMember = async () => {
    if (!inviteData.email.trim()) {
      toast.error('Please enter an email address.');
      return;
    }

    try {
      await addProjectMember(projectId, {
        email: inviteData.email.trim(),
        role: inviteData.role as ProjectRole,
        invited_as: inviteData.inviteAs as InviteSource,
        message: inviteData.message.trim() || undefined
      });

      toast.success(`Invitation sent to ${inviteData.email}.`);
      
      // Reset form
      setInviteData({
        email: '',
        role: 'developer',
        inviteAs: 'individual',
        message: ''
      });
      
      setIsInviteOpen(false);

      // Refresh member list
      loadProjectMembers(projectId);

    } catch (error) {
      console.error('Member invite failed:', error);
      toast.error('Failed to invite member. Please try again.');
    }
  };

  // Team invite handler
  const handleInviteTeam = async () => {
    if (!teamInviteData.teamId) {
      toast.error('Please select a team to invite.');
      return;
    }

    try {
      const teamInvite: TeamInviteRequest = {
        team_id: teamInviteData.teamId,
        role: teamInviteData.role as ProjectRole,
        invite_message: teamInviteData.message.trim() || undefined
      };

      const response = await inviteTeamToProject(projectId, teamInvite);
      
      if (response.added_members.length > 0) {
        toast.success(`Team invitation completed: ${response.added_members.length} members added. (${response.skipped_members.length} skipped)`);
      } else {
        toast.info('All team members are already participating in the project.');
      }

      // Reset form
      setTeamInviteData({
        teamId: '',
        role: 'developer',
        message: ''
      });
      
      setIsInviteOpen(false);

      // Refresh member list
      loadProjectMembers(projectId);

    } catch (error) {
      console.error('Team invite failed:', error);
      toast.error('Failed to invite team. Please try again.');
    }
  };

  // Member role change handler
  const handleRoleChange = async (memberId: string, newRole: string) => {
    // Convert string to enum
    const role = newRole === 'owner' ? ProjectRole.OWNER :
                 newRole === 'developer' ? ProjectRole.DEVELOPER :
                 ProjectRole.REPORTER;

    try {
      await updateProjectMember(projectId, memberId, {
        role: role
      });
      
      toast.success('Member role has been changed.');
      
      // Refresh member list
      loadProjectMembers(projectId);
      
    } catch (error) {
      console.error('Role change failed:', error);
      toast.error('Failed to change role.');
    }
  };

  // Member removal handler
  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from the project?`)) {
      return;
    }

    try {
      await removeProjectMember(projectId, memberId);
      
      toast.success(`${memberName} has been removed from the project.`);
      
      // Refresh member list
      loadProjectMembers(projectId);
      
    } catch (error) {
      console.error('Member removal failed:', error);
      toast.error('Failed to remove member.');
    }
  };

  // Group members by invitation method - simplified to Individual vs Team
  const individualMembers = projectMembers.filter(member => 
    (member.invited_as === InviteSource.INDIVIDUAL || member.invited_as === InviteSource.EXTERNAL) &&
    (memberFilter === '' || 
     member.user_name?.toLowerCase().includes(memberFilter.toLowerCase()) ||
     member.user_email?.toLowerCase().includes(memberFilter.toLowerCase()))
  );
  
  const teamMembers = projectMembers.filter(member => 
    member.invited_as === InviteSource.TEAM_MEMBER &&
    (memberFilter === '' || 
     member.user_name?.toLowerCase().includes(memberFilter.toLowerCase()) ||
     member.user_email?.toLowerCase().includes(memberFilter.toLowerCase()))
  );

  // Group team members by team for better organization
  const teamMembersByTeam = teamMembers.reduce((acc, member) => {
    const teamName = member.team_name || 'Unknown Team';
    if (!acc[teamName]) {
      acc[teamName] = [];
    }
    acc[teamName].push(member);
    return acc;
  }, {} as Record<string, typeof teamMembers>);

  return (
    <ProjectLayout>
      <div className="space-y-6">
        {/* 헤더 섹션 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Project Members</h3>
          </div>
          <p className="text-sm text-blue-700">
            Invite new members to the {selectedProject?.name} project or import from other groups.
            Visit the usage quotas page to manage seats for all members of subgroups and projects connected to this group.
          </p>
        </div>

        {/* 액션 버튼들 */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">{projectMembers.length} Members</h3>
          </div>
          <div className="flex gap-2">
            <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Members/Teams
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Invite Members/Teams</DialogTitle>
                  <DialogDescription>
                    Invite individual members or entire teams to the project.
                  </DialogDescription>
                </DialogHeader>
                
                <Tabs value={inviteTab} onValueChange={handleInviteTabChange} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="member" className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Invite Individual Member
                    </TabsTrigger>
                    <TabsTrigger value="team" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Invite Team
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="member" className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="user@example.com"
                        value={inviteData.email}
                        onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="role">Select Role</Label>
                      <Select
                        value={inviteData.role}
                        onValueChange={(value) => setInviteData(prev => ({ ...prev, role: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
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
                    </div>
                    <div>
                      <Label htmlFor="inviteAs">Invitation Method</Label>
                      <Select
                        value={inviteData.inviteAs}
                        onValueChange={(value) => setInviteData(prev => ({ ...prev, inviteAs: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="individual">Invite as Individual</SelectItem>
                          <SelectItem value="team_member">Invite as Team Member</SelectItem>
                          <SelectItem value="external">Invite as External Partner</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="member-message">Invitation Message (Optional)</Label>
                      <Textarea
                        id="member-message"
                        placeholder="Thank you for joining the project..."
                        value={inviteData.message}
                        onChange={(e) => setInviteData(prev => ({ ...prev, message: e.target.value }))}
                        rows={3}
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="team" className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="team">Select Team</Label>
                      <Select
                        value={teamInviteData.teamId}
                        onValueChange={(value) => setTeamInviteData(prev => ({ ...prev, teamId: value }))}
                        disabled={isLoadingAvailableTeams}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingAvailableTeams ? "Loading team list..." : "Select a team to invite"} />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingAvailableTeams ? (
                            <SelectItem value="loading" disabled>
                              <div className="flex items-center gap-2">
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                <span>Loading...</span>
                              </div>
                            </SelectItem>
                          ) : availableTeams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{team.name}</span>
                                <span className="text-sm text-muted-foreground ml-2">
                                  {team.member_count}명 • {team.user_role}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!isLoadingAvailableTeams && availableTeams.length === 0 && (
                        <p className="text-sm text-muted-foreground mt-1">
                          No teams available for invitation. Please join a team or create one first.
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="team-role">Role for Team Members</Label>
                      <Select
                        value={teamInviteData.role}
                        onValueChange={(value) => setTeamInviteData(prev => ({ ...prev, role: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
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
                    </div>
                    <div>
                      <Label htmlFor="team-message">Invitation Message (Optional)</Label>
                      <Textarea
                        id="team-message"
                        placeholder="Inviting the entire team to the project..."
                        value={teamInviteData.message}
                        onChange={(e) => setTeamInviteData(prev => ({ ...prev, message: e.target.value }))}
                        rows={3}
                      />
                    </div>
                    
                    {/* Team information preview */}
                    {teamInviteData.teamId && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">Selected Team Information</h4>
                        {(() => {
                          const selectedTeam = availableTeams.find(t => t.id === teamInviteData.teamId);
                          return selectedTeam ? (
                            <div className="text-sm text-blue-700">
                              <p><strong>{selectedTeam.name}</strong></p>
                              <p>{selectedTeam.member_count} members will be invited to the project.</p>
                              <p>Your current role: {selectedTeam.user_role}</p>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                    Cancel
                  </Button>
                  {inviteTab === 'member' ? (
                    <Button 
                      onClick={handleInviteMember} 
                      disabled={!inviteData.email.trim()}
                    >
                      Invite Member
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleInviteTeam} 
                      disabled={!teamInviteData.teamId}
                    >
                      Invite Team
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Member filter and search */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search members..."
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value)}
              className="w-64"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="account-sort">Account</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Sort <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>By Name</DropdownMenuItem>
                <DropdownMenuItem>By Email</DropdownMenuItem>
                <DropdownMenuItem>By Recent Activity</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Member section group display */}
        <div className="space-y-6">
          {/* Individual members section */}
          {individualMembers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Individual Members
                  <Badge variant="secondary" className="ml-2">
                    {individualMembers.length} members
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Members invited individually or as external partners
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-4 font-medium text-sm text-gray-700">Account</th>
                        <th className="text-left p-4 font-medium text-sm text-gray-700">Role</th>
                        <th className="text-left p-4 font-medium text-sm text-gray-700">Join Date</th>
                        <th className="text-left p-4 font-medium text-sm text-gray-700">Activity</th>
                        <th className="text-right p-4 font-medium text-sm text-gray-700"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {individualMembers.map((member) => (
                        <tr key={member.id} className="hover:bg-gray-50">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="text-sm">
                                  {getInitials(member.user_name || member.user_email || 'U')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{member.user_name || member.user_email || 'Unknown User'}</span>
                                  {member.is_current_user && (
                                    <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800">
                                      It's you
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {member.user_email || '@username'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <Select
                              value={member.role}
                              onValueChange={(value) => handleRoleChange(member.id, value)}
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
                            <p className="text-sm text-muted-foreground">
                              {new Date(member.joined_at).toLocaleDateString('ko-KR')}
                            </p>
                          </td>
                          <td className="p-4">
                            <p className="text-sm text-muted-foreground">
                              Recent Activity
                            </p>
                          </td>
                          <td className="p-4 text-right">
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
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => handleRemoveMember(member.id, member.user_name || member.user_email || 'Unknown User')}
                                >
                                  Remove Member
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Team members section */}
          {teamMembers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team Members
                  <Badge variant="secondary" className="ml-2">
                    {teamMembers.length} members from {Object.keys(teamMembersByTeam).length} teams
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Members who joined the project through team invitations
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-4">
                  {Object.entries(teamMembersByTeam).map(([teamName, members]) => (
                    <div key={teamName} className="border rounded-lg overflow-hidden">
                      {/* Team header */}
                      <div className="bg-blue-50 border-b px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-blue-900">{teamName}</span>
                          <Badge variant="outline" className="text-blue-700 border-blue-300">
                            {members.length} members
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Team members table */}
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              <th className="text-left p-4 font-medium text-sm text-gray-700">Account</th>
                              <th className="text-left p-4 font-medium text-sm text-gray-700">Role</th>
                              <th className="text-left p-4 font-medium text-sm text-gray-700">Join Date</th>
                              <th className="text-right p-4 font-medium text-sm text-gray-700"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {members.map((member) => (
                              <tr key={member.id} className="hover:bg-gray-50">
                                <td className="p-4">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                      <AvatarFallback className="text-sm">
                                        {getInitials(member.user_name || member.user_email || 'U')}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">{member.user_name || member.user_email || 'Unknown User'}</span>
                                        {member.is_current_user && (
                                          <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800">
                                            It's you
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-muted-foreground">
                                        {member.user_email || '@username'}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <Select
                                    value={member.role}
                                    onValueChange={(value) => handleRoleChange(member.id, value)}
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
                                  <p className="text-sm text-muted-foreground">
                                    {new Date(member.joined_at).toLocaleDateString('ko-KR')}
                                  </p>
                                </td>
                                <td className="p-4 text-right">
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
                                      <DropdownMenuItem 
                                        className="text-red-600"
                                        onClick={() => handleRemoveMember(member.id, member.user_name || member.user_email || 'Unknown User')}
                                      >
                                        Remove Member
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}


          {/* No members case */}
          {projectMembers.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Project Members</h3>
                <p className="text-muted-foreground mb-4">
                  Invite new members to start project collaboration.
                </p>
                <Button onClick={() => setIsInviteOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite First Member
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ProjectLayout>
  );
}
