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
  is_enabled: boolean;
  transport_type: string;
  compatibility_mode?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  tools_count?: number;
  tools?: Tool[];
  last_connected?: string;
  created_at?: string;
  updated_at?: string;
  lastError?: string;
  jwt_auth_required?: boolean | null;
  computed_jwt_auth_required?: boolean;
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
