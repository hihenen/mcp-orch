/**
 * ToolCallLog related type definitions
 * For Datadog/Sentry style log query system
 */

export enum CallStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  TIMEOUT = 'timeout',
  CANCELLED = 'cancelled'
}

export interface ToolCallLog {
  id: number;
  session_id: string;
  server_id: string;
  project_id: string;
  tool_name: string;
  tool_namespace?: string;
  execution_time?: number;
  status: CallStatus;
  error_message?: string;
  error_code?: string;
  timestamp: string;
  user_agent?: string;
  ip_address?: string;
  input_data?: any;
  output_data?: any;
  duration_ms?: number;
  client_type?: string;
}

export interface ToolCallLogListResponse {
  logs: ToolCallLog[];
  total_count: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ToolCallLogMetrics {
  total_calls: number;
  successful_calls: number;
  error_calls: number;
  timeout_calls: number;
  success_rate: number;
  average_execution_time: number;
  median_execution_time: number;
  p95_execution_time: number;
  calls_per_minute: number;
  unique_tools: number;
  unique_sessions: number;
}

export interface LogFilter {
  project_id: string;
  server_id?: string;
  tool_name?: string;
  status?: CallStatus[];
  session_id?: string;
  time_range?: string;
  start_time?: string;
  end_time?: string;
  search_text?: string;
  min_execution_time?: number;
  max_execution_time?: number;
}

export interface LogListParams extends LogFilter {
  page?: number;
  page_size?: number;
}

// Time range options
export const TIME_RANGE_OPTIONS = [
  { value: '15m', label: 'Last 15 minutes' },
  { value: '30m', label: 'Last 30 minutes' },
  { value: '1h', label: 'Last 1 hour' },
  { value: '6h', label: 'Last 6 hours' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: 'custom', label: 'Custom' }
] as const;

// Status color mapping
export const STATUS_COLORS = {
  [CallStatus.SUCCESS]: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-200',
    icon: '✅'
  },
  [CallStatus.ERROR]: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200',
    icon: '❌'
  },
  [CallStatus.TIMEOUT]: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    border: 'border-orange-200',
    icon: '⏱️'
  },
  [CallStatus.CANCELLED]: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-200',
    icon: '⚪'
  }
} as const;

// Detailed descriptions by error code
export const ERROR_CODE_DESCRIPTIONS = {
  'INVALID_PARAMETERS': 'MCP protocol parameter error (-32602) - Client sent invalid parameters',
  'INITIALIZATION_INCOMPLETE': 'MCP server initialization incomplete - Server is still initializing or has failed',
  'METHOD_NOT_FOUND': 'MCP method not found (-32601) - Requested method does not exist',
  'SSE_BRIDGE_ERROR': 'SSE bridge connection error - Problem occurred in real-time communication connection',
  'TOOL_ERROR': 'Error during tool execution - Error occurred during MCP tool execution process',
  'NO_RESPONSE': 'No response - No response received from server',
  'TIMEOUT': 'Execution timeout - Task was not completed within the allowed time',
  'EXECUTION_ERROR': 'Exception during execution - An unexpected error occurred'
} as const;

// Icons by client type
export const CLIENT_TYPE_ICONS = {
  cline: '🤖',
  cursor: '🖱️',
  vscode: '📝',
  unknown: '❓'
} as const;