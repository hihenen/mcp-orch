/**
 * 프로젝트 관련 타입 정의
 */

export interface Project {
  id: string;
  name: string;
  description?: string;
  slug: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  member_count: number;
  server_count: number;
  // 알림 관련 정보
  notification_count?: number;
  error_count?: number;
  has_new_activity?: boolean;
  last_activity_at?: string;
}

export interface ProjectMember {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  role: ProjectRole;
  invited_as: InviteSource;
  invited_by: string;
  joined_at: string;
  is_current_user?: boolean;
  // 사용자 정보 (조인된 데이터) - 백엔드에서 직접 user_name, user_email 제공
  user?: {
    name: string;
    email: string;
  };
}

export interface ProjectDetail extends Project {
  members: ProjectMember[];
  recent_activity: any[]; // 향후 구현
}

export enum ProjectRole {
  OWNER = "owner",
  DEVELOPER = "developer",
  REPORTER = "reporter"
}

export enum InviteSource {
  TEAM_MEMBER = "team_member",
  INDIVIDUAL = "individual",
  EXTERNAL = "external"
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  slug: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
}

export interface AddProjectMemberRequest {
  email: string;
  role: ProjectRole;
  invited_as: InviteSource;
  message?: string;
}

export interface UpdateProjectMemberRequest {
  role: ProjectRole;
}

export interface ProjectServer {
  id: string;
  name: string;
  description?: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  disabled: boolean;
  status: string;
  tools_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectApiKey {
  id: string;
  name: string;
  description?: string;
  key_prefix: string;
  is_active: boolean;
  expires_at?: string;
  last_used_at?: string;
  last_used_ip?: string;
  created_at: string;
}

export interface CreateProjectApiKeyRequest {
  name: string;
  permissions?: Record<string, any>;
}

export interface ProjectClineConfig {
  project_id: string;
  project_name: string;
  config: {
    mcpServers: Record<string, {
      transport: string;
      url: string;
      headers: Record<string, string>;
    }>;
  };
  instructions: Record<string, string>;
}
