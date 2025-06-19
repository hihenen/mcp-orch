'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertCircle, Loader2 } from 'lucide-react';

interface AdminTeamResponse {
  id: string;
  name: string;
  slug: string;
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

interface EditTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: AdminTeamResponse;
  onTeamUpdated: () => void;
}

interface UpdateTeamForm {
  name: string;
  description: string;
  is_active: boolean;
  plan: string;
  max_api_keys: number;
  max_members: number;
}

export function EditTeamModal({ isOpen, onClose, team, onTeamUpdated }: EditTeamModalProps) {
  const [formData, setFormData] = useState<UpdateTeamForm>({
    name: '',
    description: '',
    is_active: true,
    plan: 'free',
    max_api_keys: 5,
    max_members: 10,
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form data when team changes
  useEffect(() => {
    if (team) {
      setFormData({
        name: team.name,
        description: team.description || '',
        is_active: team.is_active,
        plan: team.plan,
        max_api_keys: team.max_api_keys,
        max_members: team.max_members,
      });
    }
  }, [team]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Team name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/teams/${team.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to update team');
      }

      onTeamUpdated();
    } catch (err) {
      console.error('Error updating team:', err);
      setError(err instanceof Error ? err.message : 'Failed to update team');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Team: {team.name}</DialogTitle>
          <DialogDescription>
            Update team settings and configuration.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-600">{error}</span>
            </div>
          )}

          {/* Team Info */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Team Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter team name"
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plan">Plan</Label>
                <Select
                  value={formData.plan}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, plan: value }))}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Team description"
                disabled={loading}
                rows={3}
              />
            </div>
          </div>

          {/* Limits */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Team Limits</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_api_keys">Max API Keys</Label>
                <Input
                  id="max_api_keys"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.max_api_keys}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_api_keys: parseInt(e.target.value) || 5 }))}
                  disabled={loading}
                />
                <span className="text-xs text-muted-foreground">
                  Currently using: {team.api_key_count}
                </span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_members">Max Members</Label>
                <Input
                  id="max_members"
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.max_members}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_members: parseInt(e.target.value) || 10 }))}
                  disabled={loading}
                />
                <span className="text-xs text-muted-foreground">
                  Currently: {team.member_count} members
                </span>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Team Status</h4>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                disabled={loading}
              />
              <Label htmlFor="is_active" className="text-sm">
                Active Team
              </Label>
              <span className="text-xs text-muted-foreground">
                (Inactive teams cannot be used)
              </span>
            </div>
          </div>

          {/* Current Stats */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Current Statistics</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-muted/50 rounded-md">
              <div className="text-center">
                <div className="text-lg font-semibold">{team.member_count}</div>
                <div className="text-xs text-muted-foreground">Members</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{team.project_count}</div>
                <div className="text-xs text-muted-foreground">Projects</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{team.api_key_count}</div>
                <div className="text-xs text-muted-foreground">API Keys</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{team.server_count}</div>
                <div className="text-xs text-muted-foreground">Servers</div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Team'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}