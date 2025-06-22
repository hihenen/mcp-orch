'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { formatDate } from '@/lib/date-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Key,
  Plus,
  Download,
  Copy,
  RefreshCw,
  Trash,
  MoreHorizontal,
  AlertCircle,
  Calendar,
  Shield
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { ProjectLayout } from '@/components/projects/ProjectLayout';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export default function ProjectApiKeysPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  
  const { 
    selectedProject,
    projectApiKeys,
    loadProject,
    loadProjectApiKeys,
    createProjectApiKey,
    deleteProjectApiKey,
    getProjectClineConfig
  } = useProjectStore();

  // State management
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
  const [apiKeyData, setApiKeyData] = useState({
    name: '',
    description: '',
    expires_at: null as string | null
  });

  // Load data on page load
  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
      loadProjectApiKeys(projectId);
    }
  }, [projectId, loadProject, loadProjectApiKeys]);

  // API key creation handler
  const handleCreateApiKey = async () => {
    if (!apiKeyData.name.trim()) {
      toast.error('Please enter API key name.');
      return;
    }

    try {
      await createProjectApiKey(projectId, {
        name: apiKeyData.name,
        description: apiKeyData.description || undefined,
        expires_at: apiKeyData.expires_at || undefined
      });

      // Reset form
      setApiKeyData({ name: '', description: '', expires_at: null });
      setIsApiKeyDialogOpen(false);
      
      toast.success('API key has been created successfully.');
    } catch (error) {
      console.error('API key creation error:', error);
      toast.error('Failed to create API key.');
    }
  };

  // API key deletion handler
  const handleDeleteApiKey = async (keyId: string, keyName: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${keyName}" API key?`);
    if (!confirmed) return;

    try {
      await deleteProjectApiKey(projectId, keyId);
      toast.success('API key has been deleted.');
    } catch (error) {
      console.error('API key deletion error:', error);
      toast.error('Failed to delete API key.');
    }
  };

  // Cline configuration download handler
  const handleDownloadClineConfig = async () => {
    try {
      const config = await getProjectClineConfig(projectId);
      const blob = new Blob([JSON.stringify(config, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedProject?.name || 'project'}-cline-config.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Cline configuration file has been downloaded.');
    } catch (error) {
      console.error('Cline configuration download error:', error);
      toast.error('Failed to download Cline configuration.');
    }
  };

  // Key copy handler
  const handleCopyKey = (keyValue: string) => {
    navigator.clipboard.writeText(keyValue);
    toast.success('API key has been copied to clipboard.');
  };

  if (!selectedProject) {
    return (
      <ProjectLayout>
        <div className="py-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading project...</p>
          </div>
        </div>
      </ProjectLayout>
    );
  }

  return (
    <ProjectLayout>
      <div className="py-6 space-y-6">
        {/* Header Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Key className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">API Keys</h3>
          </div>
          <p className="text-sm text-blue-700">
            Manage project-specific API keys and generate Cline configuration.
            API keys are used for secure access to project MCP servers from external applications.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">API Keys</h3>
            <p className="text-sm text-muted-foreground">
              API keys for accessing project MCP servers
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadClineConfig}>
              <Download className="h-4 w-4 mr-2" />
              Download Cline Config
            </Button>
            <Dialog open={isApiKeyDialogOpen} onOpenChange={setIsApiKeyDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create API Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New API Key</DialogTitle>
                  <DialogDescription>
                    Generate a new API key for accessing project MCP servers.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="apiKeyName">API Key Name</Label>
                    <Input
                      id="apiKeyName"
                      placeholder="e.g., Production Key"
                      value={apiKeyData.name}
                      onChange={(e) => setApiKeyData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="apiKeyDescription">Description (Optional)</Label>
                    <Textarea
                      id="apiKeyDescription"
                      placeholder="Describe the purpose of this API key..."
                      value={apiKeyData.description}
                      onChange={(e) => setApiKeyData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="apiKeyExpiration">Expiration Date</Label>
                    <Select 
                      value={apiKeyData.expires_at || "never"} 
                      onValueChange={(value) => {
                        const expires_at = value === "never" ? null : value;
                        setApiKeyData(prev => ({ ...prev, expires_at }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select expiration date" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="never">Never expires</SelectItem>
                        <SelectItem value={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}>
                          7 days
                        </SelectItem>
                        <SelectItem value={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}>
                          30 days
                        </SelectItem>
                        <SelectItem value={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}>
                          90 days
                        </SelectItem>
                        <SelectItem value={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}>
                          1 year
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsApiKeyDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateApiKey} disabled={!apiKeyData.name.trim()}>
                    Create API Key
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* API Key Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="h-4 w-4" />
                Total API Keys
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projectApiKeys?.length || 0}</div>
              <p className="text-sm text-muted-foreground">Created keys</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Active Keys
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {projectApiKeys?.filter(key => !key.expires_at || new Date(key.expires_at) > new Date()).length || 0}
              </div>
              <p className="text-sm text-muted-foreground">Valid keys</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Expiring Soon
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {projectApiKeys?.filter(key => 
                  key.expires_at && 
                  new Date(key.expires_at) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) &&
                  new Date(key.expires_at) > new Date()
                ).length || 0}
              </div>
              <p className="text-sm text-muted-foreground">Expire within 7 days</p>
            </CardContent>
          </Card>
        </div>

        {/* API Key List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Keys
            </CardTitle>
            <CardDescription>
              API keys for accessing project MCP servers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {projectApiKeys && projectApiKeys.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-4 font-medium text-sm text-gray-700">Name</th>
                      <th className="text-left p-4 font-medium text-sm text-gray-700">Status</th>
                      <th className="text-left p-4 font-medium text-sm text-gray-700">Created</th>
                      <th className="text-left p-4 font-medium text-sm text-gray-700">Expires</th>
                      <th className="text-left p-4 font-medium text-sm text-gray-700">Last Used</th>
                      <th className="text-right p-4 font-medium text-sm text-gray-700"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {projectApiKeys.map((apiKey) => {
                      const isExpired = apiKey.expires_at && new Date(apiKey.expires_at) <= new Date();
                      const isExpiringSoon = apiKey.expires_at && 
                        new Date(apiKey.expires_at) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) &&
                        new Date(apiKey.expires_at) > new Date();
                      
                      return (
                        <tr key={apiKey.id} className="hover:bg-gray-50">
                          <td className="p-4">
                            <div className="font-medium">{apiKey.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {apiKey.description || 'No description'}
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge 
                              variant={isExpired ? "destructive" : isExpiringSoon ? "secondary" : "default"}
                              className={
                                isExpired 
                                  ? "bg-red-100 text-red-800" 
                                  : isExpiringSoon 
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-green-100 text-green-800"
                              }
                            >
                              {isExpired ? 'Expired' : isExpiringSoon ? 'Expiring Soon' : 'Active'}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="text-sm">
                              {apiKey.created_at 
                                ? formatDate(apiKey.created_at)
                                : '-'
                              }
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="text-sm">
                              {apiKey.expires_at 
                                ? formatDate(apiKey.expires_at)
                                : 'Never expires'
                              }
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="text-sm">
                              {apiKey.last_used_at 
                                ? formatDate(apiKey.last_used_at)
                                : 'Never used'
                              }
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {apiKey.last_used_ip || '-'}
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleCopyKey(apiKey.key_prefix || apiKey.id)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copy Key
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Regenerate Key
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => handleDeleteApiKey(apiKey.id, apiKey.name)}
                                >
                                  <Trash className="h-4 w-4 mr-2" />
                                  Delete Key
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No API Keys</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first API key to access MCP servers
                </p>
                <Dialog open={isApiKeyDialogOpen} onOpenChange={setIsApiKeyDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First API Key
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New API Key</DialogTitle>
                      <DialogDescription>
                        Generate a new API key for accessing project MCP servers.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="apiKeyName2">API Key Name</Label>
                        <Input
                          id="apiKeyName2"
                          placeholder="e.g., Production Key"
                          value={apiKeyData.name}
                          onChange={(e) => setApiKeyData(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="apiKeyDescription2">Description (Optional)</Label>
                        <Textarea
                          id="apiKeyDescription2"
                          placeholder="Describe the purpose of this API key..."
                          value={apiKeyData.description}
                          onChange={(e) => setApiKeyData(prev => ({ ...prev, description: e.target.value }))}
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label htmlFor="apiKeyExpiration2">Expiration Date</Label>
                        <Select 
                          value={apiKeyData.expires_at || "never"} 
                          onValueChange={(value) => {
                            const expires_at = value === "never" ? null : value;
                            setApiKeyData(prev => ({ ...prev, expires_at }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select expiration date" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="never">Never expires</SelectItem>
                            <SelectItem value={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}>
                              7 days
                            </SelectItem>
                            <SelectItem value={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}>
                              30 days
                            </SelectItem>
                            <SelectItem value={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}>
                              90 days
                            </SelectItem>
                            <SelectItem value={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}>
                              1 year
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsApiKeyDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateApiKey} disabled={!apiKeyData.name.trim()}>
                        Create API Key
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProjectLayout>
  );
}
