// Server related types
export interface MCPServer {
  id: string;
  name: string;
  description?: string; // Server description
  command: string;
  args: string[];
  env?: Record<string, string>;
  timeout?: number;
  autoApprove?: string[];
  transportType: 'stdio' | 'http';
  transport_type?: 'stdio' | 'http'; // Backend compatibility
  disabled: boolean;
  status: 'online' | 'offline' | 'connecting' | 'error';
  connected?: boolean; // Backend field
  lastError?: string;
  error?: string | null; // Backend field
  availableTools?: number;
  tools_count?: number; // Backend field
  cpu?: number;
  memory?: number;
  last_connected?: string; // Backend field (ISO date string)
}

// Tool related types
export interface Tool {
  id: string;
  name: string;
  description: string;
  serverId: string;
  serverName: string;
  namespace: string;
  parameters?: ToolParameter[];
  inputSchema?: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
}

// Alias for compatibility
export type MCPTool = Tool;

export interface ToolParameter {
  name: string;
  type: string;
  description?: string;
  required: boolean;
  default?: any;
}

// Execution related types
export interface Execution {
  id: string;
  toolId?: string;
  toolName: string;
  toolNamespace?: string;
  serverId: string;
  serverName?: string;
  parameters: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
  startTime?: string;
  endTime?: string;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
}

// Log related types
export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'debug';
  source: string;
  message: string;
  metadata?: Record<string, any>;
}

// Settings related types
export interface Settings {
  language: 'en' | 'ko';
  theme: 'light' | 'dark' | 'system';
  apiEndpoint: string;
  requestTimeout: number;
  maxRetries: number;
}

// Operation mode
export type OperationMode = 'proxy' | 'batch';

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Statistics types
export interface Statistics {
  totalServers: number;
  activeServers: number;
  totalTools: number;
  executionsToday: number;
  successRate: number;
  averageExecutionTime: number;
}
