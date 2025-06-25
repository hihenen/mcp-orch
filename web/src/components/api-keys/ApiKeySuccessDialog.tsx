'use client';

import { useState } from 'react';
import { Copy, Eye, EyeOff, Key, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface ApiKeySuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiKey: {
    id: string;
    name: string;
    api_key: string;
    key_prefix: string;
    description?: string;
    created_at: string;
    expires_at?: string;
  };
}

export function ApiKeySuccessDialog({ open, onOpenChange, apiKey }: ApiKeySuccessDialogProps) {
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(apiKey.api_key);
      setCopied(true);
      toast.success('API key copied to clipboard!');
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy API key');
    }
  };

  const maskedKey = `${apiKey.key_prefix}${'•'.repeat(32)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            API Key Created Successfully
          </DialogTitle>
          <DialogDescription>
            Your new API key has been generated. Please copy and store it securely - you won't be able to see it again.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* API Key Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div>
              <Label className="text-sm font-medium">Key Name</Label>
              <p className="text-sm text-gray-700">{apiKey.name}</p>
            </div>
            
            {apiKey.description && (
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="text-sm text-gray-700">{apiKey.description}</p>
              </div>
            )}

            <div>
              <Label className="text-sm font-medium">Expires</Label>
              <p className="text-sm text-gray-700">
                {apiKey.expires_at 
                  ? new Date(apiKey.expires_at).toLocaleDateString()
                  : 'Never expires'
                }
              </p>
            </div>
          </div>

          {/* API Key Value */}
          <div className="space-y-2">
            <Label htmlFor="apiKey" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Your API Key
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="apiKey"
                  type={showKey ? "text" : "password"}
                  value={showKey ? apiKey.api_key : maskedKey}
                  readOnly
                  className="pr-10 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button
                onClick={handleCopyKey}
                variant="outline"
                size="icon"
                className={copied ? "text-green-600 border-green-600" : ""}
              >
                {copied ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Security Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 mb-1">Important Security Notice</p>
                <ul className="text-amber-700 space-y-1 text-xs">
                  <li>• This is the only time you'll see the complete API key</li>
                  <li>• Store it securely in your application or password manager</li>
                  <li>• Never share this key or commit it to version control</li>
                  <li>• If you lose it, you'll need to create a new one</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            I've saved the key securely
          </Button>
          <Button
            onClick={handleCopyKey}
            className="w-full sm:w-auto"
          >
            <Copy className="h-4 w-4 mr-2" />
            {copied ? 'Copied!' : 'Copy Key'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}