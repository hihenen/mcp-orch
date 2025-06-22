'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Users, 
  Search, 
  UserPlus, 
  Settings,
  MoreHorizontal,
  Calendar,
  Mail,
  User,
  Edit,
  Trash2,
  Trash,
  X
} from 'lucide-react';
import { UserEditModal } from '@/components/admin/UserEditModal';
import { formatDateTime } from '@/lib/date-utils';

interface UserData {
  id: string;
  name: string | null;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive';
  created_at: string;
  last_login_at: string | null;
  projects_count: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal state management
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Checkbox selection state management
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Define fetchUsers function first
  const fetchUsers = async () => {
    setIsLoading(true);
    
    try {
      const queryParams = new URLSearchParams({
        skip: '0',
        limit: '100',
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`/api/admin/users?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Failed to load user list:', error);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load initial data on component mount
  useEffect(() => {
    fetchUsers();
  }, [searchTerm]);

  // No filtering needed as search is already handled by API
  const filteredUsers = users;

  // User handling functions
  const handleAddUser = () => {
    setEditingUser(null);
    setEditModalOpen(true);
  };

  const handleEditUser = (user: UserData) => {
    setEditingUser(user);
    setEditModalOpen(true);
  };

  const handleDeleteUser = (user: UserData) => {
    setDeletingUser(user);
    setDeleteDialogOpen(true);
  };

  const handleUserSaved = () => {
    setEditModalOpen(false);
    setEditingUser(null);
    // Refresh user list
    fetchUsers();
  };

  // Search execution function
  const handleSearch = () => {
    setSearchTerm(searchInput);
  };

  // Handle Enter key
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchInput('');
    setSearchTerm('');
  };

  const handleToggleRole = async (user: UserData) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const isDowngrading = user.role === 'admin' && newRole === 'user';
    
    // Preventing self-admin privilege removal is handled by server if needed
    if (isDowngrading) {
      const confirmed = window.confirm(
        `Remove admin privileges for ${user.name || user.email}?\n` +
        'This action will be applied immediately.'
      );
      if (!confirmed) return;
    }

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          is_admin: newRole === 'admin'
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user role');
      }

      // Refresh user list
      fetchUsers();
    } catch (error) {
      console.error('Failed to change role:', error);
      alert(error instanceof Error ? error.message : 'Failed to change role.');
    }
  };

  const handleToggleStatus = async (user: UserData) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    const isDeactivating = user.status === 'active' && newStatus === 'inactive';
    
    if (isDeactivating) {
      const confirmed = window.confirm(
        `Deactivate ${user.name || user.email} account?\n` +
        'Deactivated users cannot log in.'
      );
      if (!confirmed) return;
    }

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          is_active: newStatus === 'active'
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user status');
      }

      // Refresh user list
      fetchUsers();
    } catch (error) {
      console.error('Failed to change status:', error);
      alert(error instanceof Error ? error.message : 'Failed to change status.');
    }
  };

  const confirmDeleteUser = async () => {
    if (!deletingUser) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/users/${deletingUser.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user');
      }

      // Remove from user list
      setUsers(users.filter(u => u.id !== deletingUser.id));
      setDeleteDialogOpen(false);
      setDeletingUser(null);
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete user.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Checkbox-related handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allUserIds = new Set(users.map(user => user.id));
      setSelectedUsers(allUserIds);
    } else {
      setSelectedUsers(new Set());
    }
  };

  // Function to select only test accounts
  const handleSelectTestUsers = () => {
    const testUserIds = new Set(
      users
        .filter(user => user.email.includes('test') && user.email.includes('@example.com'))
        .map(user => user.id)
    );
    setSelectedUsers(testUserIds);
  };

  // Calculate test account count
  const testUsersCount = users.filter(user => 
    user.email.includes('test') && user.email.includes('@example.com')
  ).length;

  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSelectedUsers = new Set(selectedUsers);
    if (checked) {
      newSelectedUsers.add(userId);
    } else {
      newSelectedUsers.delete(userId);
    }
    setSelectedUsers(newSelectedUsers);
  };

  const handleBulkDelete = () => {
    if (selectedUsers.size === 0) {
      alert('Please select users to delete.');
      return;
    }
    setBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    setIsBulkDeleting(true);
    const selectedUserIds = Array.from(selectedUsers);

    try {
      const response = await fetch('/api/admin/users/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          user_ids: selectedUserIds
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Bulk delete failed');
      }

      const result = await response.json();
      
      // Remove successfully deleted users from list
      if (result.successful_deletions.length > 0) {
        setUsers(users.filter(u => !result.successful_deletions.includes(u.id)));
        setSelectedUsers(new Set());
      }

      // Display result message
      if (result.failed_deletions.length > 0) {
        const failedMessages = result.failed_deletions.map((failed: any) => 
          `${failed.user_email || failed.user_id}: ${failed.error}`
        );
        alert(`Some user deletions failed:\n${failedMessages.join('\n')}\n\nSuccessful: ${result.successful_deletions.length} users`);
      } else {
        alert(`${result.successful_deletions.length} users were successfully deleted.`);
      }

      setBulkDeleteDialogOpen(false);
    } catch (error) {
      console.error('Bulk delete failed:', error);
      alert(error instanceof Error ? error.message : 'An error occurred during bulk deletion.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Calculate select all state
  const isAllSelected = users.length > 0 && selectedUsers.size === users.length;
  const isPartiallySelected = selectedUsers.size > 0 && selectedUsers.size < users.length;


  const getRoleBadge = (role: string) => {
    if (role === 'admin') {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200">
          <Settings className="h-3 w-3 mr-1" />
          Admin
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        <User className="h-3 w-3 mr-1" />
        User
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          Active
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        Inactive
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">User Management</h2>
            <p className="text-muted-foreground">Manage system user accounts</p>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="h-12 w-12 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">User Management</h2>
          <p className="text-muted-foreground">Manage system user accounts</p>
        </div>
        <div className="flex gap-2">
          {testUsersCount > 0 && (
            <Button 
              onClick={handleSelectTestUsers}
              variant="outline"
              className="border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              🧪 Select {testUsersCount} test accounts
            </Button>
          )}
          {selectedUsers.size > 0 && (
            <Button 
              onClick={handleBulkDelete}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash className="h-4 w-4 mr-2" />
              Delete {selectedUsers.size} selected
            </Button>
          )}
          <Button onClick={handleAddUser}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">
              All registered users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently active users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.role === 'admin').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Users with admin privileges
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Signups</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => {
                const createdDate = new Date(u.created_at);
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                return createdDate > oneWeekAgo;
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Joined in last 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>User List</CardTitle>
          <CardDescription>
            Manage all users registered in the system. Click on roles and status to change them directly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                className="pl-9 pr-10"
              />
              {searchInput && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-9 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
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

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all users"
                      className={isPartiallySelected ? 'data-[state=checked]:bg-primary/50' : ''}
                    />
                  </TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Projects</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.has(user.id)}
                        onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                        aria-label={`Select ${user.name || user.email}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium">{user.name || 'No name'}</div>
                          <div className="text-sm text-muted-foreground flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getRoleBadge(user.role)}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleRole(user)}
                          className="h-6 px-2 text-xs"
                        >
                          {user.role === 'admin' ? '↓ User' : '↑ Admin'}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(user.status)}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(user)}
                          className="h-6 px-2 text-xs"
                        >
                          {user.status === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {user.projects_count} projects
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {formatDateTime(user.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {user.last_login_at ? formatDateTime(user.last_login_at) : 'None'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditUser(user)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteUser(user)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No search results found.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Edit/Add Modal */}
      <UserEditModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        user={editingUser}
        onSaved={handleUserSaved}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm User Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete user <strong>{deletingUser?.name || deletingUser?.email}</strong>?
              <br />
              This action cannot be undone and will deactivate the user account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteUser}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Bulk Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{selectedUsers.size} selected users</strong>?
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-48 overflow-y-auto border rounded-md p-3 bg-muted/50">
            <div className="text-sm space-y-1">
              <div className="font-medium text-muted-foreground mb-2">Users to be deleted:</div>
              {Array.from(selectedUsers).map(userId => {
                const user = users.find(u => u.id === userId);
                return user ? (
                  <div key={userId} className="flex items-center space-x-2">
                    <div className="h-2 w-2 rounded-full bg-destructive" />
                    <span>{user.name || 'No name'} ({user.email})</span>
                  </div>
                ) : null;
              })}
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground bg-orange-50 border border-orange-200 rounded-md p-3">
            ⚠️ This action cannot be undone and will deactivate the selected user accounts.
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDeleteDialogOpen(false)}
              disabled={isBulkDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmBulkDelete}
              disabled={isBulkDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isBulkDeleting ? `Deleting... (${selectedUsers.size} users)` : `Delete ${selectedUsers.size} users`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}