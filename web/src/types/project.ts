/**
 * Project-related type definitions
 */

export interface Project {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  member_count: number;
  server_count: number;
  // User's role in this project
  user_role?: ProjectRole;
  // MCP Server mode setting
  unified_mcp_enabled?: boolean;
  // Notification-related information
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
  // Team information (when invited as team_member)
  team_id?: string;
  team_name?: string;
  // User information (joined data) - backend provides user_name, user_email directly
  user?: {
    name: string;
    email: string;
  };
}

export interface ProjectDetail extends Project {
  members: ProjectMember[];
  recent_activity: any[]; // To be implemented in the future
  // User's role is inherited from Project interface
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
  is_enabled: boolean;
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
  description?: string;
  expires_at?: string;
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

// Team-related types
export interface TeamForInvite {
  id: string;
  name: string;
  member_count: number;
  user_role: string;
}

export interface TeamInviteRequest {
  team_id: string;
  role: ProjectRole;
  invite_message?: string;
}

export interface TeamInviteResponse {
  team_id: string;
  team_name: string;
  added_members: ProjectMember[];
  skipped_members: Array<{
    user_id: string;
    user_name: string;
    user_email: string;
    reason: string;
    current_role: string;
  }>;
  total_invited: number;
  success: boolean;
  message: string;
}
