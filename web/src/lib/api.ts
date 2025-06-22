import { ApiResponse, MCPServer, Tool, Execution, Statistics } from '@/types';
import { auth } from '@/lib/auth';
import { getJwtToken, isJwtExpired } from '@/lib/jwt-utils';

// API Base URL 설정
const API_BASE_URL = process.env.NEXT_PUBLIC_MCP_API_URL || 'http://localhost:8000';

class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private maxRetries: number;
  private apiToken: string | null = null;

  constructor(baseUrl: string, timeout: number = 30000, maxRetries: number = 3) {
    // Use Next.js API routes as proxy instead of direct backend calls
    this.baseUrl = '/api'; // Next.js API routes
    this.timeout = timeout;
    this.maxRetries = maxRetries;
    
    // API token is no longer needed as we use NextAuth.js sessions
    this.apiToken = null;
  }

  setApiToken(token: string | null) {
    this.apiToken = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('mcp_orch_api_token', token);
      } else {
        localStorage.removeItem('mcp_orch_api_token');
      }
    }
  }

  getApiToken(): string | null {
    return this.apiToken;
  }

  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit = {},
    retries: number = this.maxRetries
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const headers: any = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      // NextAuth.js handles authentication automatically through cookies
      // No need to manually add Authorization headers

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (retries > 0 && (error as Error).name !== 'AbortError') {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, (this.maxRetries - retries + 1) * 1000));
        return this.fetchWithRetry<T>(url, options, retries - 1);
      }

      throw error;
    }
  }

  // Server endpoints
  async getServers(): Promise<ApiResponse<MCPServer[]>> {
    try {
      const data = await this.fetchWithRetry<any[]>(`${this.baseUrl}/servers`);
      // Map backend response to frontend types
      const servers: MCPServer[] = data.map(server => ({
        id: server.name, // Use name as ID
        name: server.name,
        command: server.command || '',
        args: server.args || [],
        transportType: server.transport_type || 'stdio',
        transport_type: server.transport_type, // Keep backend field
        disabled: server.disabled || false,
        status: server.connected ? 'online' : 'offline',
        connected: server.connected,
        lastError: server.error,
        error: server.error,
        availableTools: server.tools_count,
        tools_count: server.tools_count,
        last_connected: server.last_connected
      }));
      return { success: true, data: servers };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async getServer(id: string): Promise<ApiResponse<MCPServer>> {
    try {
      const data = await this.fetchWithRetry<MCPServer>(`${this.baseUrl}/servers/${id}/status`);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async createServer(server: Omit<MCPServer, 'id' | 'status'>): Promise<ApiResponse<MCPServer>> {
    try {
      const data = await this.fetchWithRetry<MCPServer>(`${this.baseUrl}/api/servers`, {
        method: 'POST',
        body: JSON.stringify(server),
      });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async updateServer(id: string, updates: Partial<MCPServer>): Promise<ApiResponse<MCPServer>> {
    try {
      const data = await this.fetchWithRetry<MCPServer>(`${this.baseUrl}/api/servers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async deleteServer(id: string): Promise<ApiResponse<void>> {
    try {
      await this.fetchWithRetry<void>(`${this.baseUrl}/api/servers/${id}`, {
        method: 'DELETE',
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Tool endpoints
  async getTools(): Promise<ApiResponse<Tool[]>> {
    try {
      const data = await this.fetchWithRetry<Tool[]>(`${this.baseUrl}/tools`);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async getTool(id: string): Promise<ApiResponse<Tool>> {
    try {
      const data = await this.fetchWithRetry<Tool>(`${this.baseUrl}/api/tools/${id}`);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async getToolsByServer(serverId: string): Promise<ApiResponse<Tool[]>> {
    try {
      const data = await this.fetchWithRetry<Tool[]>(`${this.baseUrl}/tools/${serverId}`);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Execution endpoints
  async executeTool(
    namespace: string,
    toolName: string,
    parameters: Record<string, any>
  ): Promise<ApiResponse<any>> {
    try {
      // namespace가 'projectId.serverId' 형식인 경우 (프로젝트별 실행)
      if (namespace.includes('.')) {
        const parts = namespace.split('.');
        if (parts.length >= 2) {
          const projectId = parts[0];
          const serverId = parts[1];
          
          const data = await this.fetchWithRetry<any>(`${this.baseUrl}/projects/${projectId}/servers/${serverId}/tools/${toolName}`, {
            method: 'POST',
            body: JSON.stringify({ arguments: parameters }),
          });
          return { success: true, data };
        }
      }
      
      // 기존 방식 (전역 도구 실행)
      const data = await this.fetchWithRetry<any>(`${this.baseUrl}/tools/${namespace}/${toolName}`, {
        method: 'POST',
        body: JSON.stringify({ arguments: parameters }),
      });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async getExecutions(limit: number = 100): Promise<ApiResponse<Execution[]>> {
    try {
      // ToolCallLog 시스템이 도구 실행을 추적하므로 더미 데이터 반환
      const data: Execution[] = [];
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async getExecution(id: string): Promise<ApiResponse<Execution>> {
    try {
      // ToolCallLog 시스템이 도구 실행을 추적하므로 404 반환
      return { success: false, error: 'Execution not found' };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Statistics endpoint
  async getStatistics(): Promise<ApiResponse<Statistics>> {
    try {
      const data = await this.fetchWithRetry<Statistics>(`${this.baseUrl}/api/statistics`);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string }>> {
    try {
      const data = await this.fetchWithRetry<{ status: string }>(`${this.baseUrl}/status`);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Execution management - ToolCallLog 시스템이 도구 실행을 추적
  async createExecution(execution: Partial<Execution>): Promise<ApiResponse<Execution>> {
    try {
      // ToolCallLog 시스템이 실제 로깅을 처리하므로 더미 응답 반환
      const data = { ...execution, id: execution.id || 'mock' } as Execution;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async updateExecution(executionId: string, updates: Partial<Execution>): Promise<ApiResponse<Execution>> {
    try {
      // ToolCallLog 시스템이 실제 로깅을 처리하므로 더미 응답 반환
      const data = { id: executionId, ...updates } as Execution;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Configuration endpoints
  async getConfig(): Promise<any> {
    try {
      const data = await this.fetchWithRetry<any>(`${this.baseUrl}/api/config`);
      return data;
    } catch (error) {
      throw error;
    }
  }

  async updateConfig(config: any): Promise<any> {
    try {
      const data = await this.fetchWithRetry<any>(`${this.baseUrl}/api/config`, {
        method: 'PUT',
        body: JSON.stringify(config),
      });
      return data;
    } catch (error) {
      throw error;
    }
  }

  async reloadConfig(): Promise<any> {
    try {
      const data = await this.fetchWithRetry<any>(`${this.baseUrl}/api/config/reload`, {
        method: 'POST',
      });
      return data;
    } catch (error) {
      throw error;
    }
  }

  async validateConfig(config: any): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    try {
      const data = await this.fetchWithRetry<{ valid: boolean; errors: string[]; warnings: string[] }>(
        `${this.baseUrl}/api/config/validate`,
        {
          method: 'POST',
          body: JSON.stringify(config),
        }
      );
      return data;
    } catch (error) {
      throw error;
    }
  }

  // Server control endpoints
  async restartServer(serverName: string): Promise<any> {
    try {
      const data = await this.fetchWithRetry<any>(
        `${this.baseUrl}/api/servers/${serverName}/restart`,
        {
          method: 'POST',
        }
      );
      return data;
    } catch (error) {
      throw error;
    }
  }

  async toggleServer(serverName: string): Promise<any> {
    try {
      const data = await this.fetchWithRetry<any>(
        `${this.baseUrl}/api/servers/${serverName}/toggle`,
        {
          method: 'POST',
        }
      );
      return data;
    } catch (error) {
      throw error;
    }
  }

  // Teams endpoints
  async getTeams(): Promise<ApiResponse<any[]>> {
    try {
      const data = await this.fetchWithRetry<any[]>(`${this.baseUrl}/teams`);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async createTeam(team: { name: string }): Promise<ApiResponse<any>> {
    try {
      const data = await this.fetchWithRetry<any>(`${this.baseUrl}/teams`, {
        method: 'POST',
        body: JSON.stringify(team),
      });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async getTeam(teamId: string): Promise<ApiResponse<any>> {
    try {
      const data = await this.fetchWithRetry<any>(`${this.baseUrl}/teams/${teamId}`);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async getTeamMembers(teamId: string): Promise<ApiResponse<any[]>> {
    try {
      const data = await this.fetchWithRetry<any[]>(`${this.baseUrl}/teams/${teamId}/members`);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async inviteTeamMember(teamId: string, invitation: { email: string; role?: string }): Promise<ApiResponse<any>> {
    try {
      const data = await this.fetchWithRetry<any>(`${this.baseUrl}/teams/${teamId}/members/invite`, {
        method: 'POST',
        body: JSON.stringify(invitation),
      });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async updateMemberRole(teamId: string, userId: string, role: string): Promise<ApiResponse<any>> {
    try {
      const data = await this.fetchWithRetry<any>(`${this.baseUrl}/teams/${teamId}/members/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async removeTeamMember(teamId: string, userId: string): Promise<ApiResponse<void>> {
    try {
      await this.fetchWithRetry<void>(`${this.baseUrl}/teams/${teamId}/members/${userId}`, {
        method: 'DELETE',
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async getTeamApiKeys(teamId: string): Promise<ApiResponse<any[]>> {
    try {
      const data = await this.fetchWithRetry<any[]>(`${this.baseUrl}/teams/${teamId}/api-keys`);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async createTeamApiKey(teamId: string, keyData: { name: string }): Promise<ApiResponse<any>> {
    try {
      const data = await this.fetchWithRetry<any>(`${this.baseUrl}/teams/${teamId}/api-keys`, {
        method: 'POST',
        body: JSON.stringify(keyData),
      });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async deleteTeamApiKey(teamId: string, keyId: string): Promise<ApiResponse<void>> {
    try {
      await this.fetchWithRetry<void>(`${this.baseUrl}/teams/${teamId}/api-keys/${keyId}`, {
        method: 'DELETE',
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}

// Create a singleton instance
let apiClient: ApiClient | null = null;

export function getApiClient(
  baseUrl?: string,
  timeout?: number,
  maxRetries?: number
): ApiClient {
  if (!apiClient || baseUrl) {
    apiClient = new ApiClient(
      baseUrl || 'http://localhost:8000',
      timeout,
      maxRetries
    );
  }
  return apiClient;
}

// Export singleton instance for convenience
export const api = getApiClient();

export default ApiClient;

/**
 * JWT 토큰을 포함한 인증 헤더를 생성합니다.
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  try {
    const jwtToken = await getJwtToken();
    if (jwtToken && !isJwtExpired(jwtToken)) {
      headers['Authorization'] = `Bearer ${jwtToken}`;
      console.log('✅ JWT token added to headers:', jwtToken.substring(0, 30) + '...');
    } else {
      console.log('❌ No valid JWT token available');
    }
  } catch (error) {
    console.error('❌ Error getting JWT token:', error);
  }

  return headers;
}

/**
 * 팀 목록을 가져오는 함수 (JWT 토큰 사용)
 */
export async function fetchTeams() {
  try {
    console.log('🔍 Fetching teams with JWT authentication...');
    
    const headers = await getAuthHeaders();
    console.log('🔍 Request headers:', headers);
    
    const response = await fetch(`${API_BASE_URL}/api/teams/`, {
      method: 'GET',
      headers,
    });
    
    console.log('🔍 Response status:', response.status);
    console.log('🔍 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('✅ Teams data received:', data);
    return data;
    
  } catch (error) {
    console.error('❌ Error fetching teams:', error);
    throw error;
  }
}

/**
 * 백엔드 API에 직접 요청하는 함수 (JWT 토큰 사용)
 */
export async function fetchWithJwtAuth(url: string, options: RequestInit = {}) {
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Error in fetchWithJwtAuth:', error);
    throw error;
  }
}
