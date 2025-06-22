'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Trash2 } from 'lucide-react';

interface UpdateProjectForm {
  name: string;
  description: string;
  sse_auth_required: boolean;
  message_auth_required: boolean;
  allowed_ip_ranges: string[];
}

interface Project {
  id: string;
  name: string;
  description?: string;
  slug: string;
  sse_auth_required: boolean;
  message_auth_required: boolean;
  allowed_ip_ranges?: string[];
  owner_name?: string;
  owner_email?: string;
}

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onProjectUpdated: () => void;
}

export function EditProjectModal({ isOpen, onClose, project, onProjectUpdated }: EditProjectModalProps) {
  const [formData, setFormData] = useState<UpdateProjectForm>({
    name: '',
    description: '',
    sse_auth_required: false,
    message_auth_required: true,
    allowed_ip_ranges: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ipRangeInput, setIpRangeInput] = useState('');

  // Initialize form data when project changes
  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description || '',
        sse_auth_required: project.sse_auth_required,
        message_auth_required: project.message_auth_required,
        allowed_ip_ranges: project.allowed_ip_ranges || [],
      });
      setIpRangeInput('');
      setError(null);
    }
  }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/projects/${project.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to update project');
      }

      onProjectUpdated();
    } catch (err) {
      console.error('Error updating project:', err);
      setError(err instanceof Error ? err.message : 'Failed to update project');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof UpdateProjectForm, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddIpRange = () => {
    if (ipRangeInput.trim() && !formData.allowed_ip_ranges.includes(ipRangeInput.trim())) {
      setFormData(prev => ({
        ...prev,
        allowed_ip_ranges: [...prev.allowed_ip_ranges, ipRangeInput.trim()]
      }));
      setIpRangeInput('');
    }
  };

  const handleRemoveIpRange = (index: number) => {
    setFormData(prev => ({
      ...prev,
      allowed_ip_ranges: prev.allowed_ip_ranges.filter((_, i) => i !== index)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddIpRange();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Project: {project?.name}</DialogTitle>
          <DialogDescription>
            Update project settings, security configuration, and access controls.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter project name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter project description"
                rows={3}
              />
            </div>

            {/* Project Owner Info (Read-only) */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Current Owner</h4>
              <div className="text-sm text-gray-600">
                <div>{project?.owner_name || 'Unknown'}</div>
                <div className="text-xs">{project?.owner_email || 'No email'}</div>
              </div>
            </div>

            {/* Security Settings */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Security Settings</h4>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sse_auth_required"
                    checked={formData.sse_auth_required}
                    onCheckedChange={(checked) => handleInputChange('sse_auth_required', checked as boolean)}
                  />
                  <Label htmlFor="sse_auth_required" className="text-sm">
                    Require SSE Authentication
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="message_auth_required"
                    checked={formData.message_auth_required}
                    onCheckedChange={(checked) => handleInputChange('message_auth_required', checked as boolean)}
                  />
                  <Label htmlFor="message_auth_required" className="text-sm">
                    Require Message Authentication (Recommended)
                  </Label>
                </div>
              </div>

              {/* IP Ranges */}
              <div className="space-y-2">
                <Label htmlFor="ip_range">Allowed IP Ranges</Label>
                <div className="flex gap-2">
                  <Input
                    id="ip_range"
                    type="text"
                    value={ipRangeInput}
                    onChange={(e) => setIpRangeInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="192.168.1.0/24 or 10.0.0.1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddIpRange}
                    disabled={!ipRangeInput.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {formData.allowed_ip_ranges.length > 0 && (
                  <div className="space-y-1">
                    {formData.allowed_ip_ranges.map((range, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                        <span className="text-sm font-mono">{range}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveIpRange(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.name}>
              {loading ? 'Updating...' : 'Update Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}