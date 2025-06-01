'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MCPServer } from '@/types';
import { useTranslations } from 'next-intl';
import { Server, Cpu, HardDrive, AlertCircle } from 'lucide-react';

interface ServerStatusCardProps {
  server: MCPServer;
}

export function ServerStatusCard({ server }: ServerStatusCardProps) {
  const t = useTranslations('dashboard.serverStatus');

  const getStatusBadge = (status: MCPServer['status']) => {
    const variants: Record<MCPServer['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
      online: 'default',
      offline: 'secondary',
      connecting: 'outline',
      error: 'destructive',
    };

    return (
      <Badge variant={variants[status]}>
        {t(status)}
      </Badge>
    );
  };

  const getStatusIcon = () => {
    if (server.status === 'error') {
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
    return <Server className="h-4 w-4" />;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {getStatusIcon()}
          {server.name}
        </CardTitle>
        {getStatusBadge(server.status)}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            {t('availableTools')}: {server.availableTools || 0}
          </div>
          
          {server.status === 'online' && (
            <>
              {server.cpu !== undefined && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1">
                      <Cpu className="h-3 w-3" />
                      {t('cpu')}
                    </span>
                    <span>{server.cpu}%</span>
                  </div>
                  <Progress value={server.cpu} className="h-1" />
                </div>
              )}
              
              {server.memory !== undefined && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1">
                      <HardDrive className="h-3 w-3" />
                      {t('memory')}
                    </span>
                    <span>{server.memory}%</span>
                  </div>
                  <Progress value={server.memory} className="h-1" />
                </div>
              )}
            </>
          )}
          
          {server.status === 'error' && server.lastError && (
            <div className="text-xs text-destructive">
              {server.lastError}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
