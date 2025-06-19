'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Key, Search, Trash2, Settings, Eye, EyeOff, Activity, Clock, Shield, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

interface ApiKey {
  id: string;
  name: string;
  description?: string;
  key_prefix_masked: string;
  is_active: boolean;
  expires_at?: string;
  created_at: string;
  last_used_at?: string;
  last_used_ip?: string;
  rate_limit_per_minute: number;
  rate_limit_per_day: number;
  project_id: string;
  project_name: string;
  project_slug: string;
  creator_id: string;
  creator_name: string;
  creator_email: string;
  total_usage_count: number;
  last_30_days_usage: number;
}

interface ApiKeyListResponse {
  api_keys: ApiKey[];
  total: number;
  page: number;
  per_page: number;
}

interface ApiKeyStatistics {
  total_keys: number;
  active_keys: number;
  inactive_keys: number;
  expired_keys: number;
  expiring_soon: number;
  recently_used: number;
}

export default function AdminApiKeysPage() {
  const { toast } = useToast();
  
  // State management
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [statistics, setStatistics] = useState<ApiKeyStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination and filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expiredOnlyFilter, setExpiredOnlyFilter] = useState(false);
  
  // Modal states
  const [deleteApiKey, setDeleteApiKey] = useState<ApiKey | null>(null);
  const [updatingKeyId, setUpdatingKeyId] = useState<string | null>(null);

  const itemsPerPage = 20;

  // Load API keys data
  const loadApiKeys = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        skip: ((page - 1) * itemsPerPage).toString(),
        limit: itemsPerPage.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(projectFilter && { project_id: projectFilter }),
        expired_only: expiredOnlyFilter.toString()
      });

      // Only add is_active filter if statusFilter is not 'all'
      if (statusFilter && statusFilter !== 'all') {
        params.append('is_active', statusFilter);
      }

      const response = await fetch(`/api/admin/api-keys?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch API keys');
      }

      const data: ApiKeyListResponse = await response.json();
      setApiKeys(data.api_keys);
      setTotalCount(data.total);
      setCurrentPage(page);
    } catch (err) {
      console.error('Error loading API keys:', err);
      setError(err instanceof Error ? err.message : 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  // Load statistics
  const loadStatistics = async () => {
    try {
      const response = await fetch('/api/admin/api-keys/statistics/overview');
      if (response.ok) {
        const data: ApiKeyStatistics = await response.json();
        setStatistics(data);
      }
    } catch (err) {
      console.error('Error loading statistics:', err);
    }
  };

  // Toggle API key active status
  const handleToggleApiKeyStatus = async (apiKey: ApiKey) => {
    try {
      setUpdatingKeyId(apiKey.id);
      
      const response = await fetch(`/api/admin/api-keys/${apiKey.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: !apiKey.is_active
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update API key');
      }

      const updatedApiKey: ApiKey = await response.json();
      
      setApiKeys(keys => 
        keys.map(key => 
          key.id === apiKey.id ? updatedApiKey : key
        )
      );
      
      toast({
        title: "API Key Updated",
        description: `API key "${apiKey.name}" has been ${updatedApiKey.is_active ? 'activated' : 'deactivated'}.`,
      });
      
      // Reload statistics
      loadStatistics();
    } catch (err) {
      console.error('Error updating API key:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to update API key',
        variant: "destructive",
      });
    } finally {
      setUpdatingKeyId(null);
    }
  };

  // Delete API key
  const handleDeleteApiKey = async (apiKey: ApiKey) => {
    try {
      const response = await fetch(`/api/admin/api-keys/${apiKey.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete API key');
      }

      setApiKeys(keys => keys.filter(key => key.id !== apiKey.id));
      setDeleteApiKey(null);
      
      toast({
        title: "API Key Deleted",
        description: `API key "${apiKey.name}" has been permanently deleted.`,
      });
      
      // Reload statistics
      loadStatistics();
    } catch (err) {
      console.error('Error deleting API key:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to delete API key',
        variant: "destructive",
      });
    }
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Check if key is expired
  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  // Check if key is expiring soon (within 30 days)
  const isExpiringSoon = (expiresAt?: string) => {
    if (!expiresAt) return false;
    const expiry = new Date(expiresAt);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiry <= thirtyDaysFromNow && expiry > new Date();
  };

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

  // Load data on mount and when filters change
  useEffect(() => {
    loadApiKeys(1);
  }, [searchTerm, projectFilter, statusFilter, expiredOnlyFilter]);

  useEffect(() => {
    loadStatistics();
  }, []);

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Keys Management</h1>
          <p className="text-muted-foreground">
            Monitor and manage all API keys across the system
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total API Keys</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total_keys}</div>
              <p className="text-xs text-muted-foreground">
                {statistics.active_keys} active, {statistics.inactive_keys} inactive
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Keys</CardTitle>
              <Activity className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{statistics.active_keys}</div>
              <p className="text-xs text-muted-foreground">
                {statistics.recently_used} used in last 7 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attention Required</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {statistics.expired_keys + statistics.expiring_soon}
              </div>
              <p className="text-xs text-muted-foreground">
                {statistics.expired_keys} expired, {statistics.expiring_soon} expiring soon
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter and search API keys</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search API keys..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  className="pl-10 pr-10"
                />
                {searchInput && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
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

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2">
              <Switch
                checked={expiredOnlyFilter}
                onCheckedChange={setExpiredOnlyFilter}
              />
              <label className="text-sm font-medium">Expired Only</label>
            </div>

            {(searchTerm || statusFilter !== 'all' || expiredOnlyFilter) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setExpiredOnlyFilter(false);
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* API Keys Table */}
      <Card>
        <CardHeader>
          <CardTitle>API Keys ({totalCount})</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading API keys...</div>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Key Prefix</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Creator</TableHead>
                      <TableHead>Rate Limits</TableHead>
                      <TableHead>Last Used</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No API keys found
                        </TableCell>
                      </TableRow>
                    ) : (
                      apiKeys.map((apiKey) => (
                        <TableRow key={apiKey.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{apiKey.name}</div>
                              {apiKey.description && (
                                <div className="text-sm text-muted-foreground">
                                  {apiKey.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="font-mono text-sm bg-muted px-2 py-1 rounded inline-block">
                              {apiKey.key_prefix_masked}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div>
                              <div className="font-medium">{apiKey.project_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {apiKey.project_slug}
                              </div>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="space-y-1">
                              <Badge variant={apiKey.is_active ? "default" : "secondary"}>
                                {apiKey.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                              {apiKey.expires_at && (
                                <div className="flex items-center space-x-1">
                                  <Clock className="h-3 w-3" />
                                  <Badge 
                                    variant={
                                      isExpired(apiKey.expires_at) ? "destructive" :
                                      isExpiringSoon(apiKey.expires_at) ? "outline" : "secondary"
                                    }
                                    className="text-xs"
                                  >
                                    {isExpired(apiKey.expires_at) ? 'Expired' : 
                                     isExpiringSoon(apiKey.expires_at) ? 'Expiring Soon' : 'Valid'}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div>
                              <div className="font-medium">{apiKey.creator_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {apiKey.creator_email}
                              </div>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="text-sm">
                              <div>{apiKey.rate_limit_per_minute}/min</div>
                              <div className="text-muted-foreground">
                                {apiKey.rate_limit_per_day}/day
                              </div>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="text-sm">
                              <div>{formatDate(apiKey.last_used_at)}</div>
                              {apiKey.last_used_ip && (
                                <div className="text-muted-foreground font-mono">
                                  {apiKey.last_used_ip}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={apiKey.is_active}
                                onCheckedChange={() => handleToggleApiKeyStatus(apiKey)}
                                disabled={updatingKeyId === apiKey.id}
                                className="h-4 w-8"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeleteApiKey(apiKey)}
                                className="h-8 w-8 p-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} API keys
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadApiKeys(currentPage - 1)}
                      disabled={currentPage <= 1 || loading}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadApiKeys(currentPage + 1)}
                      disabled={currentPage >= totalPages || loading}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteApiKey} onOpenChange={() => setDeleteApiKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete the API key "{deleteApiKey?.name}"?
              This action cannot be undone and will immediately invalidate the key.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteApiKey && handleDeleteApiKey(deleteApiKey)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}