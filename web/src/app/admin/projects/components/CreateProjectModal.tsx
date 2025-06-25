'use client';

import { useState } from 'react';
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

interface CreateProjectForm {
  name: string;
  description: string;
  owner_email: string;
  jwt_auth_required: boolean;
  allowed_ip_ranges: string[];
}

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: () => void;
}

export function CreateProjectModal({ isOpen, onClose, onProjectCreated }: CreateProjectModalProps) {
  const [formData, setFormData] = useState<CreateProjectForm>({
    name: '',
    description: '',
    owner_email: '',
    jwt_auth_required: true,
    allowed_ip_ranges: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ipRangeInput, setIpRangeInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to create project');
      }

      // Reset form
      setFormData({
        name: '',
        description: '',
        owner_email: '',
        jwt_auth_required: true,
        allowed_ip_ranges: [],
      });
      setIpRangeInput('');
      
      onProjectCreated();
    } catch (err) {
      console.error('Error creating project:', err);
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateProjectForm, value: string | boolean) => {
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
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Create a new project with security settings and assign an owner.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter project name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner_email">Owner Email *</Label>
              <Input
                id="owner_email"
                type="email"
                value={formData.owner_email}
                onChange={(e) => handleInputChange('owner_email', e.target.value)}
                placeholder="owner@example.com"
                required
              />
            </div>
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

          {/* Security Settings */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Security Settings</h4>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="jwt_auth_required"
                checked={formData.jwt_auth_required}
                onCheckedChange={(checked) => handleInputChange('jwt_auth_required', checked as boolean)}
              />
              <Label htmlFor="jwt_auth_required" className="text-sm">
                Require JWT Authentication (Recommended)
              </Label>
            </div>

            {/* IP Ranges */}
            <div className="space-y-2">
              <Label htmlFor="ip_range">Allowed IP Ranges (Optional)</Label>
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.name || !formData.owner_email}>
              {loading ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}