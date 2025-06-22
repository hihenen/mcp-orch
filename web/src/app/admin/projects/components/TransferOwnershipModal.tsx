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
import { Crown, AlertTriangle } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  owner_name?: string;
  owner_email?: string;
}

interface TransferOwnershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onOwnershipTransferred: () => void;
}

export function TransferOwnershipModal({ 
  isOpen, 
  onClose, 
  project, 
  onOwnershipTransferred 
}: TransferOwnershipModalProps) {
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/projects/${project.id}/transfer-ownership`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          new_owner_email: newOwnerEmail.trim()
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to transfer ownership');
      }

      // Reset form
      setNewOwnerEmail('');
      onOwnershipTransferred();
    } catch (err) {
      console.error('Error transferring ownership:', err);
      setError(err instanceof Error ? err.message : 'Failed to transfer ownership');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNewOwnerEmail('');
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-600" />
            Transfer Project Ownership
          </DialogTitle>
          <DialogDescription>
            Transfer ownership of "{project?.name}" to another user. This action will change 
            the project owner and cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Current Owner Info */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Current Owner</h4>
            <div className="text-sm text-blue-700">
              <div className="font-medium">{project?.owner_name || 'Unknown'}</div>
              <div>{project?.owner_email || 'No email'}</div>
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
              required
            />
            <p className="text-xs text-muted-foreground">
              The user must already exist in the system to receive ownership.
            </p>
          </div>

          {/* Warning */}
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <div className="font-medium mb-1">Important Notes:</div>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>The new owner will have full administrative rights over this project</li>
                  <li>The current owner will be demoted to a regular member</li>
                  <li>Only project owners can manage members and security settings</li>
                  <li>This action cannot be undone without the new owner's cooperation</li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !newOwnerEmail.trim()}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              {loading ? 'Transferring...' : 'Transfer Ownership'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}