'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft,
  RotateCcw,
  Play,
  Pause,
  Edit,
  Trash2
} from 'lucide-react';
import { ServerHeaderProps } from './types';

interface ExtendedServerHeaderProps extends ServerHeaderProps {
  selectedProjectName?: string;
}

export function ServerHeader({ 
  server, 
  projectId, 
  canEdit, 
  selectedProjectName,
  onToggleServer,
  onRestartServer,
  onDeleteServer,
  onRefreshStatus,
  onEditServer,
  onRetryConnection
}: ExtendedServerHeaderProps) {
  return (
    <div className="space-y-4">
      {/* 브레드크럼 */}
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span>/</span>
        <Link href={`/projects/${projectId}`} className="hover:text-foreground">
          {selectedProjectName || 'Project'}
        </Link>
        <span>/</span>
        <Link href={`/projects/${projectId}/servers`} className="hover:text-foreground">
          Servers
        </Link>
        <span>/</span>
        <span className="text-foreground">{server.name}</span>
      </div>

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/projects/${projectId}/servers`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{server.name}</h1>
              <Badge variant={
                server.status === 'online' ? 'default' : 
                server.status === 'loading' ? 'secondary' :
                server.status === 'timeout' ? 'destructive' : 'secondary'
              }>
                {server.status === 'online' ? 'Online' : 
                 server.status === 'offline' ? 'Offline' :
                 server.status === 'connecting' ? 'Connecting' : 
                 server.status === 'loading' ? 'Loading Details...' :
                 server.status === 'timeout' ? 'Connection Timeout' : 'Error'}
              </Badge>
              {server.status === 'loading' && (
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600"></div>
                  <span className="text-xs text-muted-foreground">Loading connection details</span>
                </div>
              )}
              {server.disabled && (
                <Badge variant="outline">Disabled</Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              {server.description || 'No description'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {server.status === 'timeout' && onRetryConnection && (
            <Button 
              variant="outline"
              onClick={onRetryConnection}
              className="text-red-600 hover:text-red-700"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Retry Connection
            </Button>
          )}
          <Button 
            variant="outline"
            onClick={onRefreshStatus}
            className="text-blue-600 hover:text-blue-700"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>
          <Button 
            variant="outline"
            onClick={onToggleServer}
            disabled={!canEdit}
            className={server.disabled ? 'text-green-600 hover:text-green-700' : 'text-orange-600 hover:text-orange-700'}
            title={!canEdit ? "You don't have permission to control this server. (Owner or Developer only)" : undefined}
          >
            {server.disabled ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
            {server.disabled ? 'Enable' : 'Disable'}
          </Button>
          <Button 
            variant="outline" 
            onClick={onRestartServer}
            disabled={!canEdit}
            title={!canEdit ? "You don't have permission to restart this server. (Owner or Developer only)" : "Restart Server"}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Restart
          </Button>
          <Button 
            variant="outline"
            onClick={onEditServer}
            disabled={!canEdit}
            title={!canEdit ? "You don't have permission to edit this server. (Owner or Developer only)" : "Edit Server Settings"}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button 
            variant="outline" 
            onClick={onDeleteServer}
            disabled={!canEdit}
            className="text-red-600 hover:text-red-700"
            title={!canEdit ? "You don't have permission to delete this server. (Owner or Developer only)" : "Delete Server"}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}