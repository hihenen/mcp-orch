'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { ServerTabProps } from './types';

interface ServerSettingsTabProps extends ServerTabProps {
  onEditServer: () => void;
  onDeleteServer: () => void;
}

export function ServerSettingsTab({ 
  server, 
  canEdit, 
  onEditServer, 
  onDeleteServer 
}: ServerSettingsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Server Settings</CardTitle>
        <CardDescription>
          Modify and manage server configuration.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Edit Server</h4>
              <p className="text-sm text-muted-foreground">
                Modify server settings and configuration.
              </p>
            </div>
            <Button 
              variant="outline"
              onClick={onEditServer}
              disabled={!canEdit}
              title={!canEdit ? "You don't have permission to edit this server. (Owner or Developer only)" : "Edit server settings"}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
          
          <div className="border-t pt-4">
            <h4 className="font-medium text-red-600 mb-2">Danger Zone</h4>
            <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
              <div>
                <h5 className="font-medium">Delete Server</h5>
                <p className="text-sm text-muted-foreground">
                  Permanently delete this server. This action cannot be undone.
                </p>
              </div>
              <Button 
                variant="destructive" 
                onClick={onDeleteServer}
                disabled={!canEdit}
                title={!canEdit ? "You don't have permission to delete this server. (Owner or Developer only)" : "Delete server"}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}