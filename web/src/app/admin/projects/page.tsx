'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  FolderOpen, 
  Search, 
  Plus, 
  Filter,
  ChevronLeft,
  ChevronRight,
  Settings,
  Trash2,
  Crown,
  Server,
  Users,
  Shield,
  Globe,
  X,
  Key
} from 'lucide-react';
import { CreateProjectModal } from './components/CreateProjectModal';
import { EditProjectModal } from './components/EditProjectModal';
import { TransferOwnershipModal } from './components/TransferOwnershipModal';
import { formatDate } from '@/lib/date-utils';

interface AdminProjectResponse {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  jwt_auth_required: boolean;
  allowed_ip_ranges?: string[];
  member_count: number;
  server_count: number;
  api_key_count: number;
  creator_name?: string;
  creator_email?: string;
  owner_name?: string;
  owner_email?: string;
}

interface AdminProjectListResponse {
  projects: AdminProjectResponse[];
  total: number;
  page: number;
  per_page: number;
}

export default function ProjectsAdminPage() {
  const { data: session } = useSession();
  const router = useRouter();
  
  // State management
  const [projects, setProjects] = useState<AdminProjectResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination and filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProjects, setTotalProjects] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [perPage] = useState(20);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<AdminProjectResponse | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Fetch projects
  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const skip = (currentPage - 1) * perPage;
      const params = new URLSearchParams({
        skip: skip.toString(),
        limit: perPage.toString(),
      });
      
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }
      
      const response = await fetch(`/api/admin/projects?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to fetch projects');
      }
      
      const data: AdminProjectListResponse = await response.json();
      setProjects(data.projects);
      setTotalProjects(data.total);
      
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  // Effects
  useEffect(() => {
    if (session) {
      fetchProjects();
    }
  }, [session, currentPage, searchTerm]);

  // Search functions
  const handleSearch = () => {
    setSearchTerm(searchInput);
    setCurrentPage(1); // Reset to first page on search
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  // Event handlers
  const handleCreateProject = () => {
    setShowCreateModal(true);
  };

  const handleEditProject = (project: AdminProjectResponse) => {
    setSelectedProject(project);
    setShowEditModal(true);
  };

  const handleTransferOwnership = (project: AdminProjectResponse) => {
    setSelectedProject(project);
    setShowTransferModal(true);
  };

  const handleDeleteProject = async (project: AdminProjectResponse) => {
    if (!confirm(`Are you sure you want to permanently delete project "${project.name}"? This action cannot be undone and will remove all associated data.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/projects/${project.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to delete project');
      }

      // Refresh projects list
      fetchProjects();
    } catch (err) {
      console.error('Error deleting project:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete project');
    }
  };

  const onProjectCreated = () => {
    setShowCreateModal(false);
    fetchProjects();
  };

  const onProjectUpdated = () => {
    setShowEditModal(false);
    setSelectedProject(null);
    fetchProjects();
  };

  const onOwnershipTransferred = () => {
    setShowTransferModal(false);
    setSelectedProject(null);
    fetchProjects();
  };

  // Statistics calculations
  const totalMembers = projects.reduce((sum, p) => sum + p.member_count, 0);
  const totalServers = projects.reduce((sum, p) => sum + p.server_count, 0);
  const totalApiKeys = projects.reduce((sum, p) => sum + p.api_key_count, 0);
  const securedProjects = projects.filter(p => p.jwt_auth_required).length;

  // Pagination calculations
  const totalPages = Math.ceil(totalProjects / perPage);
  const startItem = (currentPage - 1) * perPage + 1;
  const endItem = Math.min(currentPage * perPage, totalProjects);

  if (!session) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projects Management</h1>
          <p className="text-muted-foreground">
            Manage all projects, members, servers, and security settings across the platform
          </p>
        </div>
        <Button onClick={handleCreateProject} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Project
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProjects}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMembers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MCP Servers</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalServers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Keys</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalApiKeys}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Search & Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects by name and description..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  className="pl-8 pr-10"
                />
                {searchInput && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <Button
              onClick={handleSearch}
              variant="default"
              size="default"
              className="px-4"
            >
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Projects Table */}
      <Card>
        <CardHeader>
          <CardTitle>Projects List</CardTitle>
          <CardDescription>
            {totalProjects > 0 && (
              `Showing ${startItem} to ${endItem} of ${totalProjects} projects`
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={fetchProjects} variant="outline">
                Try Again
              </Button>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'No projects found matching your search' : 'No projects found'}
              </p>
              {!searchTerm && (
                <Button onClick={handleCreateProject}>
                  Create Your First Project
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Servers</TableHead>
                    <TableHead>API Keys</TableHead>
                    <TableHead>Security</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{project.name}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            ID: {project.id}
                          </div>
                          {project.description && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {project.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{project.owner_name || 'Unknown'}</div>
                          <div className="text-sm text-muted-foreground">
                            {project.owner_email || 'No email'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{project.member_count}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{project.server_count}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{project.api_key_count}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {project.jwt_auth_required && (
                            <Badge variant="outline" className="text-xs bg-green-100 text-green-800">
                              <Shield className="h-3 w-3 mr-1" />
                              JWT Auth
                            </Badge>
                          )}
                          {!project.jwt_auth_required && (
                            <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800">
                              <Shield className="h-3 w-3 mr-1" />
                              No Auth
                            </Badge>
                          )}
                          {project.allowed_ip_ranges && project.allowed_ip_ranges.length > 0 && (
                            <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800">
                              <Globe className="h-3 w-3 mr-1" />
                              IP Restricted
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(project.created_at)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditProject(project)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTransferOwnership(project)}
                            title="Transfer Ownership"
                          >
                            <Crown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteProject(project)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {startItem} to {endItem} of {totalProjects} projects
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + Math.max(1, currentPage - 2);
                        if (page > totalPages) return null;
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="w-8 h-8 p-0"
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onProjectCreated={onProjectCreated}
      />

      {selectedProject && (
        <>
          <EditProjectModal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedProject(null);
            }}
            project={selectedProject}
            onProjectUpdated={onProjectUpdated}
          />

          <TransferOwnershipModal
            isOpen={showTransferModal}
            onClose={() => {
              setShowTransferModal(false);
              setSelectedProject(null);
            }}
            project={selectedProject}
            onOwnershipTransferred={onOwnershipTransferred}
          />
        </>
      )}
    </div>
  );
}