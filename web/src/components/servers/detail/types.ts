export interface Tool {
  name: string;
  description: string;
  schema: any;
}

export interface MCPTool {
  id: string;
  name: string;
  description: string;
  namespace: string;
  serverId: string;
  inputSchema?: any;
}

export interface ServerDetail {
  id: string;
  name: string;
  description?: string;
  status: 'online' | 'offline' | 'connecting' | 'error' | 'timeout';
  disabled: boolean;
  transportType: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  tools_count?: number;
  tools?: Tool[];
  last_connected?: string;
  lastError?: string;
}

export interface ServerTabProps {
  server: ServerDetail;
  projectId: string;
  serverId: string;
  canEdit: boolean;
  onServerUpdate?: (server: ServerDetail) => void;
}

export interface ServerHeaderProps {
  server: ServerDetail;
  projectId: string;
  canEdit: boolean;
  onToggleServer: () => void;
  onRestartServer: () => void;
  onDeleteServer: () => void;
  onRefreshStatus: () => void;
  onEditServer: () => void;
  onRetryConnection?: () => void;
}