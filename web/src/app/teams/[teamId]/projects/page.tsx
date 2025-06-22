'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TeamLayout } from '@/components/teams/TeamLayout';
import { useTeamStore } from '@/stores/teamStore';
import { toast } from 'sonner';
import { 
  Users, 
  Server, 
  Settings, 
  Plus,
  FolderOpen
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  member_count: number;
  server_count: number;
}

export default function TeamProjectsPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const { selectedTeam, isTeamAdmin } = useTeamStore();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createProjectDialog, setCreateProjectDialog] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    if (teamId) {
      loadProjects();
    }
  }, [teamId]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      console.log(`🔍 Loading projects for team: ${teamId}`);
      
      const response = await fetch(`/api/teams/${teamId}/projects`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const projectData = await response.json();
        console.log(`✅ Successfully loaded ${projectData.length} projects`);
        setProjects(projectData);
      } else {
        const errorText = await response.text();
        console.error('Failed to load projects:', response.status, response.statusText, errorText);
        toast.error(`Failed to load projects: ${response.status} ${errorText}`);
        setProjects([]); // Set to empty array on error
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
      toast.error('Network error occurred while loading projects.');
      setProjects([]); // Set to empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) {
      toast.error('Please enter a project name.');
      return;
    }

    try {
      const response = await fetch(`/api/teams/${teamId}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newProject)
      });

      if (response.ok) {
        const createdProject = await response.json();
        setProjects(prev => [createdProject, ...prev]);
        setCreateProjectDialog(false);
        setNewProject({ name: '', description: '' });
        toast.success('Project has been created.');
      } else {
        const errorText = await response.text();
        console.error('Failed to create project:', errorText);
        toast.error(`Failed to create project: ${errorText}`);
      }
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('An error occurred while creating project.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US');
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
            <p className="text-muted-foreground">Loading projects...</p>
          </div>
        </div>
      </TeamLayout>
    );
  }

  return (
    <TeamLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <FolderOpen className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-green-900">Project Management</h3>
          </div>
          <p className="text-sm text-green-700">
            Manage ongoing team projects and create new projects.
          </p>
        </div>

        {/* Project List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Projects</CardTitle>
                <CardDescription>List of ongoing team projects</CardDescription>
              </div>
              {canAccess('developer') && (
                <Dialog open={createProjectDialog} onOpenChange={setCreateProjectDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create New Project
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Project</DialogTitle>
                      <DialogDescription>
                        Create a new project for this team.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="projectName">Project Name</Label>
                        <Input
                          id="projectName"
                          value={newProject.name}
                          onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter project name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="projectDescription">Description (Optional)</Label>
                        <Input
                          id="projectDescription"
                          value={newProject.description}
                          onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Enter project description"
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setCreateProjectDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateProject}>
                          Create
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {projects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project) => (
                  <Card key={project.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-lg">{project.name}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {project.description || 'No project description available.'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center space-x-4">
                            <span className="flex items-center">
                              <Users className="w-4 h-4 mr-1" />
                              {project.member_count} member{project.member_count !== 1 ? 's' : ''}
                            </span>
                            <span className="flex items-center">
                              <Server className="w-4 h-4 mr-1" />
                              {project.server_count} server{project.server_count !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <span>{formatDate(project.created_at)}</span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button size="sm" className="flex-1" asChild>
                            <Link href={`/projects/${project.id}/overview`}>
                              Open Project
                            </Link>
                          </Button>
                          {canAccess('owner') && (
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/projects/${project.id}/settings`}>
                                <Settings className="w-4 h-4" />
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FolderOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Projects</h3>
                <p className="text-muted-foreground mb-4">
                  Create a new project to start team collaboration.
                </p>
                {canAccess('developer') && (
                  <Button onClick={() => setCreateProjectDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Project
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Project Statistics */}
        {projects.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Project Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{projects.length}</p>
                  <p className="text-sm text-muted-foreground">Total Projects</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {projects.reduce((sum, p) => sum + p.member_count, 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Members</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {projects.reduce((sum, p) => sum + p.server_count, 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Servers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TeamLayout>
  );
}