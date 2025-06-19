'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTeamCreated: () => void;
}

interface CreateTeamForm {
  name: string;
  description: string;
  owner_email: string;
  is_personal: boolean;
  plan: string;
  max_api_keys: number;
  max_members: number;
}

export function CreateTeamModal({ isOpen, onClose, onTeamCreated }: CreateTeamModalProps) {
  const [formData, setFormData] = useState<CreateTeamForm>({
    name: '',
    description: '',
    owner_email: '',
    is_personal: false,
    plan: 'free',
    max_api_keys: 5,
    max_members: 10,
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Team name is required');
      return;
    }
    
    if (!formData.owner_email.trim()) {
      setError('Owner email is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to create team');
      }

      // Reset form
      setFormData({
        name: '',
        description: '',
        owner_email: '',
        is_personal: false,
        plan: 'free',
        max_api_keys: 5,
        max_members: 10,
      });
      
      onTeamCreated();
    } catch (err) {
      console.error('Error creating team:', err);
      setError(err instanceof Error ? err.message : 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        name: '',
        description: '',
        owner_email: '',
        is_personal: false,
        plan: 'free',
        max_api_keys: 5,
        max_members: 10,
      });
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Team</DialogTitle>
          <DialogDescription>
            Create a new team with specified settings and assign an owner.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-600">{error}</span>
            </div>
          )}

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
              <Label htmlFor="owner_email">Owner Email *</Label>
              <Input
                id="owner_email"
                type="email"
                value={formData.owner_email}
                onChange={(e) => setFormData(prev => ({ ...prev, owner_email: e.target.value }))}
                placeholder="owner@example.com"
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional team description"
              disabled={loading}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_personal"
              checked={formData.is_personal}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_personal: checked as boolean }))}
              disabled={loading}
            />
            <Label htmlFor="is_personal" className="text-sm">
              Personal Team
            </Label>
            <span className="text-xs text-muted-foreground">
              (Auto-created teams for individual users)
            </span>
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
                  Creating...
                </>
              ) : (
                'Create Team'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}