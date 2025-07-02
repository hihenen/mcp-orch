'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Users, 
  Search, 
  Plus, 
  Filter,
  ChevronLeft,
  ChevronRight,
  Settings,
  Trash2,
  Crown,
  X
} from 'lucide-react';
import { CreateTeamModal } from './components/CreateTeamModal';
import { EditTeamModal } from './components/EditTeamModal';
import { TransferOwnershipModal } from './components/TransferOwnershipModal';
import { formatDate } from '@/lib/date-utils';
import { showDeleteConfirm, showError } from '@/lib/dialog-utils';

interface AdminTeamResponse {
  id: string;
  name: string;
  description?: string;
  is_personal: boolean;
  is_active: boolean;
  plan: string;
  max_api_keys: number;
  max_members: number;
  created_at: string;
  updated_at: string;
  member_count: number;
  project_count: number;
  api_key_count: number;
  server_count: number;
  owner_name?: string;
  owner_email?: string;
}

interface AdminTeamListResponse {
  teams: AdminTeamResponse[];
  total: number;
  page: number;
  per_page: number;
}

export default function TeamsAdminPage() {
  const { data: session } = useSession();
  const router = useRouter();
  
  // State management
  const [teams, setTeams] = useState<AdminTeamResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination and filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTeams, setTotalTeams] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [perPage] = useState(20);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<AdminTeamResponse | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Fetch teams
  const fetchTeams = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const skip = (currentPage - 1) * perPage;
      const params = new URLSearchParams({
        skip: skip.toString(),
        limit: perPage.toString(),
        include_inactive: includeInactive.toString(),
      });
      
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }
      
      const response = await fetch(`/api/admin/teams?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to fetch teams');
      }
      
      const data: AdminTeamListResponse = await response.json();
      setTeams(data.teams);
      setTotalTeams(data.total);
      
    } catch (err) {
      console.error('Error fetching teams:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch teams');
    } finally {
      setLoading(false);
    }
  };

  // Effects
  useEffect(() => {
    if (session) {
      fetchTeams();
    }
  }, [session, currentPage, searchTerm, includeInactive]);

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
  const handleCreateTeam = () => {
    setShowCreateModal(true);
  };

  const handleEditTeam = (team: AdminTeamResponse) => {
    setSelectedTeam(team);
    setShowEditModal(true);
  };

  const handleTransferOwnership = (team: AdminTeamResponse) => {
    setSelectedTeam(team);
    setShowTransferModal(true);
  };

  const handleDeleteTeam = async (team: AdminTeamResponse) => {
    const confirmed = await showDeleteConfirm(
      team.name,
      '팀'
    );
    
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/teams/${team.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to delete team');
      }

      // Refresh teams list
      fetchTeams();
    } catch (err) {
      console.error('Error deleting team:', err);
      await showError(err instanceof Error ? err.message : '팀 삭제에 실패했습니다.');
    }
  };

  const onTeamCreated = () => {
    setShowCreateModal(false);
    fetchTeams();
  };

  const onTeamUpdated = () => {
    setShowEditModal(false);
    setSelectedTeam(null);
    fetchTeams();
  };

  const onOwnershipTransferred = () => {
    setShowTransferModal(false);
    setSelectedTeam(null);
    fetchTeams();
  };

  // Pagination calculations
  const totalPages = Math.ceil(totalTeams / perPage);
  const startItem = (currentPage - 1) * perPage + 1;
  const endItem = Math.min(currentPage * perPage, totalTeams);

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
          <h1 className="text-2xl font-bold text-foreground">Teams Management</h1>
          <p className="text-muted-foreground">
            Manage all teams, members, and settings across the platform
          </p>
        </div>
        <Button onClick={handleCreateTeam} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Team
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTeams}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Teams</CardTitle>
            <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teams.filter(t => t.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Personal Teams</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teams.filter(t => t.is_personal).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organization Teams</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teams.filter(t => !t.is_personal).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search teams by name or description..."
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
            <div className="flex gap-2">
              <Select
                value={includeInactive ? 'all' : 'active'}
                onValueChange={(value) => setIncludeInactive(value === 'all')}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="all">All Teams</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teams Table */}
      <Card>
        <CardHeader>
          <CardTitle>Teams List</CardTitle>
          <CardDescription>
            {totalTeams > 0 && (
              `Showing ${startItem} to ${endItem} of ${totalTeams} teams`
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
              <Button onClick={fetchTeams} variant="outline">
                Try Again
              </Button>
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'No teams found matching your search' : 'No teams found'}
              </p>
              {!searchTerm && (
                <Button onClick={handleCreateTeam}>
                  Create Your First Team
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Projects</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.map((team) => (
                    <TableRow key={team.id}>
                      <TableCell>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{team.name}</span>
                            {team.is_personal && (
                              <Badge variant="outline" className="text-xs">
                                Personal
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            ID: {team.id}
                          </div>
                          {team.description && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {team.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{team.owner_name || 'Unknown'}</div>
                          <div className="text-sm text-muted-foreground">
                            {team.owner_email || 'No email'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {team.member_count} / {team.max_members}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{team.project_count}</div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={team.is_active ? "default" : "secondary"}
                          className={team.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                        >
                          {team.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(team.created_at)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTeam(team)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTransferOwnership(team)}
                            title="Transfer Ownership"
                          >
                            <Crown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTeam(team)}
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
                    Showing {startItem} to {endItem} of {totalTeams} teams
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
      <CreateTeamModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onTeamCreated={onTeamCreated}
      />

      {selectedTeam && (
        <>
          <EditTeamModal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedTeam(null);
            }}
            team={selectedTeam}
            onTeamUpdated={onTeamUpdated}
          />

          <TransferOwnershipModal
            isOpen={showTransferModal}
            onClose={() => {
              setShowTransferModal(false);
              setSelectedTeam(null);
            }}
            team={selectedTeam}
            onOwnershipTransferred={onOwnershipTransferred}
          />
        </>
      )}
    </div>
  );
}