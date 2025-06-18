/**
 * ToolCallLog 관련 타입 정의
 * Datadog/Sentry 스타일 로그 조회 시스템용
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

// 시간 범위 옵션
export const TIME_RANGE_OPTIONS = [
  { value: '15m', label: '최근 15분' },
  { value: '30m', label: '최근 30분' },
  { value: '1h', label: '최근 1시간' },
  { value: '6h', label: '최근 6시간' },
  { value: '24h', label: '최근 24시간' },
  { value: '7d', label: '최근 7일' },
  { value: 'custom', label: '사용자 정의' }
] as const;

// 상태별 색상 매핑
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

// 클라이언트 타입별 아이콘
export const CLIENT_TYPE_ICONS = {
  cline: '🤖',
  cursor: '🖱️',
  vscode: '📝',
  unknown: '❓'
} as const;