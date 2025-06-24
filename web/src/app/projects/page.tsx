'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/date-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  FolderOpen, 
  Users, 
  Server, 
  Calendar,
  MoreHorizontal,
  Settings,
  Trash2,
  ChevronDown
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { useTeamStore } from '@/stores/teamStore';
import { Project } from '@/types/project';
import Link from 'next/link';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ProjectsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const { 
    projects, 
    loadProjects, 
    createProject, 
    deleteProject,
    isLoading 
  } = useProjectStore();
  
  const { 
    userTeams: teams, 
    loadUserTeams: loadTeams 
  } = useTeamStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    team_id: ''
  });

  // Login status check and redirect
  useEffect(() => {
    if (status === 'loading') return; // Wait if loading
    
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    
    // Load projects and teams only when logged in
    if (status === 'authenticated') {
      loadProjects();
      loadTeams();
    }
  }, [status, router, loadProjects, loadTeams]);

  // Set default team_id to "personal" when teams are loaded and user has no teams
  useEffect(() => {
    if (teams.length === 0 && newProject.team_id === '') {
      setNewProject(prev => ({ ...prev, team_id: 'personal' }));
    }
  }, [teams, newProject.team_id]);

  // Loading or unauthenticated cases
  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {status === 'loading' ? 'Checking authentication...' : 'Redirecting to login...'}
          </p>
        </div>
      </div>
    );
  }

  // Search filtering
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Auto-generate slug

  const handleCreateProject = async () => {
    try {
      // Convert "personal" value to empty string for personal project
      const projectData = {
        ...newProject,
        team_id: newProject.team_id === 'personal' ? '' : newProject.team_id
      };
      await createProject(projectData);
      setIsCreateDialogOpen(false);
      setNewProject({ name: '', description: '', team_id: '' });
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      try {
        await deleteProject(projectId);
      } catch (error) {
        console.error('Failed to delete project:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Manage your projects and configure MCP servers
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Create a new project to manage your MCP servers.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  value={newProject.name}
                  onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Frontend Dashboard"
                />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={newProject.description}
                  onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter a brief description of your project"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="team">Team (Optional)</Label>
                <Select
                  value={newProject.team_id}
                  onValueChange={(value) => setNewProject(prev => ({ ...prev, team_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={teams.length === 0 ? "Create as Personal Project" : "Select a team or create as personal project"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Create as Personal Project</SelectItem>
                    {teams.length > 0 && teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {teams.length === 0 
                    ? "You are not a member of any teams. The project will be created as personal."
                    : "If no team is selected, the project will be created as personal and you can invite members later."
                  }
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateProject}
                disabled={!newProject.name}
              >
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="outline">
          {filteredProjects.length} projects
        </Badge>
      </div>

      {/* Project List */}
      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Projects</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery ? 'No projects match your search criteria.' : 'Create your first project to get started.'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create New Project
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {project.description || 'No description'}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/projects/${project.id}`}>
                          <Settings className="h-4 w-4 mr-2" />
                          Manage Project
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => handleDeleteProject(project.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Project
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {project.member_count || 1} members
                    </div>
                    <div className="flex items-center gap-1">
                      <Server className="h-4 w-4" />
                      {project.server_count || 0} servers
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatDate(project.created_at)}
                  </div>

                  <div className="pt-2">
                    <Link href={`/projects/${project.id}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        Open Project
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Statistics Cards */}
      {projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projects.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {projects.reduce((sum, p) => sum + (p.member_count || 1), 0)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Servers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {projects.reduce((sum, p) => sum + (p.server_count || 0), 0)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
