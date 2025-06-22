'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertCircle, Loader2, Crown, AlertTriangle } from 'lucide-react';

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

interface TransferOwnershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: AdminTeamResponse;
  onOwnershipTransferred: () => void;
}

export function TransferOwnershipModal({ 
  isOpen, 
  onClose, 
  team, 
  onOwnershipTransferred 
}: TransferOwnershipModalProps) {
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationText, setConfirmationText] = useState('');

  const requiredConfirmationText = `transfer ${team.name}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newOwnerEmail.trim()) {
      setError('New owner email is required');
      return;
    }

    if (confirmationText !== requiredConfirmationText) {
      setError(`Please type "${requiredConfirmationText}" to confirm`);
      return;
    }

    if (newOwnerEmail === team.owner_email) {
      setError('New owner cannot be the same as current owner');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/teams/${team.id}/transfer-ownership`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          new_owner_email: newOwnerEmail,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to transfer ownership');
      }

      // Reset form
      setNewOwnerEmail('');
      setConfirmationText('');
      onOwnershipTransferred();
    } catch (err) {
      console.error('Error transferring ownership:', err);
      setError(err instanceof Error ? err.message : 'Failed to transfer ownership');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setNewOwnerEmail('');
      setConfirmationText('');
      setError(null);
      onClose();
    }
  };

  const isFormValid = newOwnerEmail.trim() && confirmationText === requiredConfirmationText;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-600" />
            Transfer Team Ownership
          </DialogTitle>
          <DialogDescription>
            Transfer ownership of "{team.name}" to another user.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-600">{error}</span>
            </div>
          )}

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <div className="font-medium mb-1">Warning: This action cannot be undone</div>
              <div>
                The new owner will have full control over the team, including the ability to 
                manage members, settings, and delete the team.
              </div>
            </div>
          </div>

          {/* Current Owner Info */}
          <div className="space-y-2">
            <Label>Current Owner</Label>
            <div className="p-3 bg-muted/50 rounded-md">
              <div className="font-medium">{team.owner_name || 'Unknown'}</div>
              <div className="text-sm text-muted-foreground">{team.owner_email || 'No email'}</div>
            </div>
          </div>

          {/* New Owner Email */}
          <div className="space-y-2">
            <Label htmlFor="new_owner_email">New Owner Email *</Label>
            <Input
              id="new_owner_email"
              type="email"
              value={newOwnerEmail}
              onChange={(e) => setNewOwnerEmail(e.target.value)}
              placeholder="newowner@example.com"
              disabled={loading}
              required
            />
            <span className="text-xs text-muted-foreground">
              The user must already exist in the system
            </span>
          </div>

          {/* Confirmation */}
          <div className="space-y-2">
            <Label htmlFor="confirmation">
              Type <code className="bg-muted px-1 rounded">{requiredConfirmationText}</code> to confirm
            </Label>
            <Input
              id="confirmation"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder={requiredConfirmationText}
              disabled={loading}
              required
            />
          </div>

          {/* Team Stats */}
          <div className="space-y-2">
            <Label>Team Information</Label>
            <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-md">
              <div>
                <div className="text-sm font-medium">{team.member_count} Members</div>
                <div className="text-xs text-muted-foreground">Will be transferred</div>
              </div>
              <div>
                <div className="text-sm font-medium">{team.project_count} Projects</div>
                <div className="text-xs text-muted-foreground">Access maintained</div>
              </div>
              <div>
                <div className="text-sm font-medium">{team.api_key_count} API Keys</div>
                <div className="text-xs text-muted-foreground">Will be transferred</div>
              </div>
              <div>
                <div className="text-sm font-medium">{team.server_count} Servers</div>
                <div className="text-xs text-muted-foreground">Will be transferred</div>
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
            <Button 
              type="submit" 
              disabled={loading || !isFormValid}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Transferring...
                </>
              ) : (
                <>
                  <Crown className="mr-2 h-4 w-4" />
                  Transfer Ownership
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}