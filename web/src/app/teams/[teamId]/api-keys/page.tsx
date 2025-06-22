'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TeamLayout } from '@/components/teams/TeamLayout';
import { useTeamStore } from '@/stores/teamStore';
import { toast } from 'sonner';
import { 
  Key, 
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  is_active: boolean;
  expires_at?: string;
  created_at: string;
  last_used_at?: string;
}

export default function TeamApiKeysPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const { selectedTeam } = useTeamStore();

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createKeyDialog, setCreateKeyDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showFullKey, setShowFullKey] = useState<string | null>(null);

  useEffect(() => {
    if (teamId) {
      loadApiKeys();
    }
  }, [teamId]);

  const loadApiKeys = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/teams/${teamId}/api-keys`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const keyData = await response.json();
        setApiKeys(keyData);
      } else {
        // Demo data
        const demoKeys: ApiKey[] = [
          {
            id: '1',
            name: 'Development Key',
            key_prefix: 'mcp_abc123',
            is_active: true,
            expires_at: undefined,
            created_at: '2025-06-01T10:00:00Z',
            last_used_at: '2025-06-03T15:30:00Z'
          },
          {
            id: '2',
            name: 'Production Key', 
            key_prefix: 'mcp_def456',
            is_active: true,
            expires_at: '2025-12-31T23:59:59Z',
            created_at: '2025-06-02T14:00:00Z',
            last_used_at: undefined
          }
        ];
        setApiKeys(demoKeys);
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter an API key name.');
      return;
    }

    try {
      const response = await fetch(`/api/teams/${teamId}/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newKeyName
        })
      });

      if (response.ok) {
        const newKey = await response.json();
        toast.success('API key has been created.');
        setCreateKeyDialog(false);
        setNewKeyName('');
        setShowFullKey(newKey.key); // Show full key for newly created key
        loadApiKeys();
      } else {
        const errorText = await response.text();
        console.error('Failed to create API key:', errorText);
        toast.error(`Failed to create API key: ${errorText}`);
      }
    } catch (error) {
      console.error('Error creating API key:', error);
      toast.error('An error occurred while creating API key.');
    }
  };

  const handleDeleteApiKey = async (keyId: string, keyName: string) => {
    if (!confirm(`Are you sure you want to delete the "${keyName}" API key?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/teams/${teamId}/api-keys/${keyId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        toast.success('API key has been deleted.');
        loadApiKeys();
      } else {
        const errorText = await response.text();
        console.error('Failed to delete API key:', errorText);
        toast.error(`Failed to delete API key: ${errorText}`);
      }
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast.error('An error occurred while deleting API key.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard.');
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
            <p className="text-muted-foreground">Loading API key information...</p>
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
            <Key className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-purple-900">API Key Management</h3>
          </div>
          <p className="text-sm text-purple-700">
            Create and manage API keys for accessing MCP services.
          </p>
        </div>

        {/* API Key List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>{apiKeys.length} API key{apiKeys.length !== 1 ? 's' : ''} created</CardDescription>
              </div>
              {canAccess('developer') && (
                <Dialog open={createKeyDialog} onOpenChange={setCreateKeyDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create New API Key
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New API Key</DialogTitle>
                      <DialogDescription>
                        Create a new API key for this team.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="keyName">API Key Name</Label>
                        <Input
                          id="keyName"
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                          placeholder="e.g., Production API Key"
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setCreateKeyDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateApiKey}>
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
            {apiKeys.length > 0 ? (
              <div className="space-y-4">
                {apiKeys.map((apiKey) => (
                  <Card key={apiKey.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-medium">{apiKey.name}</h3>
                          {apiKey.is_active ? (
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 mb-2">
                          <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                            {showFullKey === apiKey.id ? showFullKey : `${apiKey.key_prefix}...`}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowFullKey(showFullKey === apiKey.id ? null : apiKey.id)}
                          >
                            {showFullKey === apiKey.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(showFullKey === apiKey.id ? showFullKey : `${apiKey.key_prefix}...`)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>Created: {formatDate(apiKey.created_at)}</p>
                          {apiKey.last_used_at && (
                            <p>Last used: {formatDate(apiKey.last_used_at)}</p>
                          )}
                          {apiKey.expires_at && (
                            <p>Expires: {formatDate(apiKey.expires_at)}</p>
                          )}
                        </div>
                      </div>
                      {canAccess('developer') && (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteApiKey(apiKey.id, apiKey.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Key className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No API Keys</h3>
                <p className="text-muted-foreground mb-4">
                  Create a new API key to start using MCP services.
                </p>
                {canAccess('developer') && (
                  <Button onClick={() => setCreateKeyDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First API Key
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TeamLayout>
  );
}