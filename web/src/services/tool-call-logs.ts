/**
 * ToolCallLog API 서비스
 * Datadog/Sentry 스타일 로그 조회 시스템용 API 호출
 */

import { 
  ToolCallLogListResponse, 
  ToolCallLogMetrics, 
  LogListParams, 
  ToolCallLog 
} from '@/types/tool-call-logs';

const API_BASE_URL = process.env.NEXT_PUBLIC_MCP_API_URL || 'http://localhost:8000';

class ToolCallLogError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'ToolCallLogError';
  }
}

async function makeAuthenticatedRequest(url: string, options: RequestInit = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ToolCallLogError(
        `API Error: ${response.status} ${response.statusText} - ${errorText}`,
        response.status
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof ToolCallLogError) {
      throw error;
    }
    throw new ToolCallLogError(`Network Error: ${error}`);
  }
}

function buildQueryParams(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(key, item.toString()));
      } else {
        searchParams.append(key, value.toString());
      }
    }
  });
  
  return searchParams.toString();
}

export class ToolCallLogService {
  /**
   * ToolCallLog 목록 조회
   */
  static async getToolCallLogs(params: LogListParams): Promise<ToolCallLogListResponse> {
    const queryString = buildQueryParams(params);
    const url = `${API_BASE_URL}/api/tool-call-logs/?${queryString}`;
    
    console.log('🔍 Fetching tool call logs:', url);
    
    return makeAuthenticatedRequest(url);
  }

  /**
   * ToolCallLog 메트릭 조회
   */
  static async getToolCallMetrics(params: {
    project_id: string;
    server_id?: string;
    time_range?: string;
    start_time?: string;
    end_time?: string;
  }): Promise<ToolCallLogMetrics> {
    const queryString = buildQueryParams(params);
    const url = `${API_BASE_URL}/api/tool-call-logs/metrics?${queryString}`;
    
    console.log('📊 Fetching tool call metrics:', url);
    
    return makeAuthenticatedRequest(url);
  }

  /**
   * 특정 ToolCallLog 상세 조회
   */
  static async getToolCallLog(logId: number, projectId: string): Promise<ToolCallLog> {
    const url = `${API_BASE_URL}/api/tool-call-logs/${logId}?project_id=${projectId}`;
    
    console.log('🔍 Fetching tool call log detail:', url);
    
    return makeAuthenticatedRequest(url);
  }

  /**
   * 실시간 로그 조회 (최근 로그만)
   */
  static async getRecentLogs(params: {
    project_id: string;
    server_id?: string;
    since?: string; // ISO timestamp
    limit?: number;
  }): Promise<ToolCallLog[]> {
    const queryParams = {
      ...params,
      page_size: params.limit || 20,
      time_range: '15m'
    };
    
    if (params.since) {
      queryParams.start_time = params.since;
      delete queryParams.time_range;
    }
    
    const response = await this.getToolCallLogs(queryParams);
    return response.logs;
  }
}

export default ToolCallLogService;