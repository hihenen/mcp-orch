'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, CheckIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { JobHistoryEntry } from '@/hooks/useWorkerStatus';
import { formatDateTime } from '@/lib/date-utils';

interface ErrorDetailModalProps {
  open: boolean;
  onClose: () => void;
  jobEntry: JobHistoryEntry | null;
}

export function ErrorDetailModal({ open, onClose, jobEntry }: ErrorDetailModalProps) {
  const [copied, setCopied] = useState(false);

  // Keyboard shortcut support
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open) return;

      // Ctrl+C or Cmd+C to copy error message
      if ((event.ctrlKey || event.metaKey) && event.key === 'c' && jobEntry?.error) {
        event.preventDefault();
        handleCopyError();
      }
      
      // Escape to close modal
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, jobEntry?.error, onClose]);

  const handleCopyError = async () => {
    if (!jobEntry?.error) return;

    try {
      await navigator.clipboard.writeText(jobEntry.error);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy error message:', error);
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = jobEntry.error;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackError) {
        console.error('Fallback copy failed:', fallbackError);
      }
      document.body.removeChild(textArea);
    }
  };

  const formatErrorMessage = (error: string) => {
    // Try to format JSON errors for better readability
    try {
      const parsed = JSON.parse(error);
      return JSON.stringify(parsed, null, 2);
    } catch {
      // Not JSON, return as is with preserved line breaks
      return error;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case '성공':
      case 'success':
        return 'default';
      case '실패':
      case 'failed':
      case 'error':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Error Details</DialogTitle>
          <DialogDescription>
            Detailed error information for worker execution
            {jobEntry?.error && (
              <span className="block text-xs text-muted-foreground mt-1">
                Press Ctrl+C (Cmd+C) to copy error message • Esc to close
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {jobEntry && (
          <div className="space-y-4">
            {/* Job Information */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Execution Time</p>
                <p className="text-sm">{formatDateTime(jobEntry.timestamp)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge variant={getStatusBadgeVariant(jobEntry.status)}>
                  {jobEntry.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Duration</p>
                <p className="text-sm">{jobEntry.duration.toFixed(2)}s</p>
              </div>
              {jobEntry.checked_count !== undefined && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Checked Count</p>
                  <p className="text-sm">{jobEntry.checked_count}</p>
                </div>
              )}
              {jobEntry.updated_count !== undefined && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Updated Count</p>
                  <p className="text-sm">{jobEntry.updated_count}</p>
                </div>
              )}
              {jobEntry.tools_synced_count !== undefined && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tools Synced</p>
                  <p className="text-sm">{jobEntry.tools_synced_count}</p>
                </div>
              )}
              {jobEntry.error_count !== undefined && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Error Count</p>
                  <p className="text-sm">{jobEntry.error_count}</p>
                </div>
              )}
            </div>

            {/* Error Message */}
            {jobEntry.error && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Error Message</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyError}
                    className="h-8 px-2"
                  >
                    {copied ? (
                      <>
                        <CheckIcon className="h-3 w-3 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                
                <ScrollArea className="h-[200px] w-full rounded-md border">
                  <div className="p-4">
                    <pre className="text-sm whitespace-pre-wrap break-words font-mono">
                      {formatErrorMessage(jobEntry.error)}
                    </pre>
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}