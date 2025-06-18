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

// 에러 코드별 상세 설명
export const ERROR_CODE_DESCRIPTIONS = {
  'INVALID_PARAMETERS': 'MCP 프로토콜 파라미터 오류 (-32602) - 클라이언트가 잘못된 매개변수를 전송했습니다',
  'INITIALIZATION_INCOMPLETE': 'MCP 서버 초기화 미완료 - 서버가 아직 초기화 중이거나 실패했습니다',
  'METHOD_NOT_FOUND': 'MCP 메서드를 찾을 수 없음 (-32601) - 요청한 메서드가 존재하지 않습니다',
  'SSE_BRIDGE_ERROR': 'SSE 브리지 연결 오류 - 실시간 통신 연결에 문제가 발생했습니다',
  'TOOL_ERROR': '도구 실행 중 오류 - MCP 도구 실행 과정에서 에러가 발생했습니다',
  'NO_RESPONSE': '응답 없음 - 서버로부터 응답을 받지 못했습니다',
  'TIMEOUT': '실행 시간 초과 - 허용된 시간 내에 작업이 완료되지 않았습니다',
  'EXECUTION_ERROR': '실행 중 예외 발생 - 예상치 못한 오류가 발생했습니다'
} as const;

// 클라이언트 타입별 아이콘
export const CLIENT_TYPE_ICONS = {
  cline: '🤖',
  cursor: '🖱️',
  vscode: '📝',
  unknown: '❓'
} as const;