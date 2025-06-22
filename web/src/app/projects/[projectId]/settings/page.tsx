'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Settings,
  Save,
  Trash,
  AlertTriangle,
  Shield,
  Info
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { ProjectLayout } from '@/components/projects/ProjectLayout';
import { SecuritySettingsSection } from '@/components/projects/SecuritySettingsSection';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function ProjectSettingsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  
  const { 
    selectedProject,
    loadProject,
    updateProject,
    deleteProject,
    currentUserRole
  } = useProjectStore();

  // State management
  const [projectData, setProjectData] = useState({
    name: '',
    description: ''
  });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load data when page loads
  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    }
  }, [projectId, loadProject]);

  // Update project data
  useEffect(() => {
    if (selectedProject) {
      setProjectData({
        name: selectedProject.name || '',
        description: selectedProject.description || ''
      });
    }
  }, [selectedProject]);

  // Check edit permission (Only Owner can edit)
  const canEdit = currentUserRole?.toLowerCase() === 'owner';

  // Settings save handler
  const handleSaveSettings = async () => {
    if (!canEdit) {
      toast.error('You do not have permission to change settings.');
      return;
    }

    if (!projectData.name.trim()) {
      toast.error('Please enter a project name.');
      return;
    }

    setIsSaving(true);
    try {
      await updateProject(projectId, {
        name: projectData.name,
        description: projectData.description
      });
      
      toast.success('Project settings have been saved.');
    } catch (error) {
      console.error('Project settings save error:', error);
      toast.error('Failed to save project settings.');
    } finally {
      setIsSaving(false);
    }
  };

  // Project deletion handler
  const handleDeleteProject = async () => {
    if (!canEdit) {
      toast.error('You do not have permission to delete this project.');
      return;
    }

    if (deleteConfirmText !== selectedProject?.name) {
      toast.error('Project name does not match.');
      return;
    }

    setIsDeleting(true);
    try {
      await deleteProject(projectId);
      toast.success('Project has been deleted.');
      // Redirect to project list page
      window.location.href = '/projects';
    } catch (error) {
      console.error('Project deletion error:', error);
      toast.error('Failed to delete project.');
      setIsDeleting(false);
    }
  };

  // Auto-generate slug

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
            <Settings className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Project Settings</h3>
          </div>
          <p className="text-sm text-blue-700">
            Manage your project's basic information, security settings, and advanced options.
            Changes are applied immediately, and some settings require Owner permissions.
          </p>
        </div>

        {/* Permission notification */}
        {!canEdit && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-900">Read-only Mode</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Owner permission is required to change project settings. Current role: {currentUserRole}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Basic information settings */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Manage basic information for your project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                type="text"
                value={projectData.name}
                onChange={(e) => setProjectData(prev => ({ ...prev, name: e.target.value }))}
                disabled={!canEdit}
                placeholder="Enter project name"
              />
            </div>
            <div>
              <Label htmlFor="projectDescription">Description</Label>
              <Textarea
                id="projectDescription"
                value={projectData.description}
                onChange={(e) => setProjectData(prev => ({ ...prev, description: e.target.value }))}
                disabled={!canEdit}
                rows={3}
                placeholder="Enter a description for your project"
              />
            </div>
            {canEdit && (
              <Button onClick={handleSaveSettings} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Settings'}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Security settings section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Settings
            </CardTitle>
            <CardDescription>Manage security and access control settings for your project</CardDescription>
          </CardHeader>
          <CardContent>
            <SecuritySettingsSection projectId={projectId} />
          </CardContent>
        </Card>

        {/* Danger zone */}
        {canEdit && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>These actions are irreversible. Please proceed with caution.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                  <h4 className="font-medium text-red-900 mb-2">Delete Project</h4>
                  <p className="text-sm text-red-700 mb-4">
                    Deleting a project will permanently remove all servers, members, API keys, and activity records.
                    This action cannot be undone.
                  </p>
                  <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash className="h-4 w-4 mr-2" />
                        Delete Project
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="text-red-600">Delete Project</DialogTitle>
                        <DialogDescription>
                          This action cannot be undone. To delete the project, please type the project name exactly below.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-700">
                            <strong>Warning:</strong> This action will permanently delete the following:
                          </p>
                          <ul className="text-sm text-red-700 mt-2 space-y-1">
                            <li>• All MCP servers and configurations</li>
                            <li>• All project members and roles</li>
                            <li>• All API keys and access permissions</li>
                            <li>• All activity records and logs</li>
                          </ul>
                        </div>
                        <div>
                          <Label htmlFor="deleteConfirm">
                            Type the project name <strong>"{selectedProject.name}"</strong> to confirm:
                          </Label>
                          <Input
                            id="deleteConfirm"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder={selectedProject.name}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          variant="destructive" 
                          onClick={handleDeleteProject}
                          disabled={deleteConfirmText !== selectedProject.name || isDeleting}
                        >
                          <Trash className="h-4 w-4 mr-2" />
                          {isDeleting ? 'Deleting...' : 'Delete Project'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProjectLayout>
  );
}