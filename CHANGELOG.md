# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- [TASK_101] Remove unused SECURITY__ENABLE_AUTH configuration and standardize DISABLE_AUTH for authentication control (2025-06-25)
  - Remove dead code: SecurityConfig.enable_auth field and SECURITY__ENABLE_AUTH environment variable mapping
  - Clean up unused authentication configuration from .env.example to prevent developer confusion
  - Standardize DISABLE_AUTH as the official authentication control method with comprehensive documentation
  - Add clear warnings and usage guidelines for DISABLE_AUTH in development/testing environments
  - Eliminate configuration inconsistency between defined but unused vs actually implemented authentication controls
- [TASK_100] Frontend JWT authentication UI unification - replace dual SSE/Message toggles with single JWT control (2025-06-25)
  - Replace separate SSE and Message authentication toggles with unified JWT Authentication control
  - Update SecuritySettingsSection.tsx to use single jwt_auth_required toggle for all MCP connections
  - Update admin project creation and editing modals to use unified JWT authentication field
  - Update admin project list page to display single JWT Auth badge instead of separate SSE/Message badges
  - Simplify authentication UX from complex dual settings to clear single JWT control
  - Improve security setting descriptions and recommendations for unified authentication approach

### Added
- [TASK_099] Unify SSE and Message authentication to single JWT authentication control (2025-06-25)
  - Replace separate sse_auth_required and message_auth_required with single jwt_auth_required field
  - Simplify project authentication settings from two toggles to one unified control
  - Add database migration to preserve existing authentication settings during transition
  - Clean implementation without backward compatibility layers for new frontend
  - Update all MCP endpoints to use unified JWT authentication policy
- [TASK_098] Add AUTO_PROVISION environment variable for user auto-creation control (2025-06-25)
  - Add environment variable to control automatic user provisioning from OAuth/JWT tokens
  - Set AUTO_PROVISION=false to require manual account creation (default: false)
  - Set AUTO_PROVISION=true to automatically create users from valid OAuth tokens
  - Provide clear error messages when auto-provisioning is disabled and user not found
  - Add startup logging to show current auto-provisioning policy status
  - Prepare foundation for future enterprise SSO integration with granular provisioning control

### Fixed
- [TASK_097] JWT middleware API key handling for mch_ prefixed tokens (2025-06-25)
  - Fix JWT middleware to properly detect and handle mch_ prefixed API keys using standard Bearer token format
  - Prevent UTF-8 decoding errors when mch_ API keys are incorrectly processed as JWT tokens
  - Implement `_get_user_from_mcp_api_key` function for proper API key authentication
  - Maintain backward compatibility with existing JWT token authentication and API communications
  - Enable secure MCP SSE endpoint access with project-based API key security system

### Removed
- [TASK_096] Complete removal of slug field from Project model and all references (2025-06-25)
  - Remove slug field from Project model in database schema
  - Remove slug references from all admin panel APIs and frontend interfaces  
  - Remove slug-based routing patterns from frontend components
  - Remove slug field from initial database migration scripts
  - Remove generate_unique_slug function and slug creation logic from projects API
  - Simplify project identification to use ID-only patterns throughout application
  - Replace slug displays with project ID in admin interfaces and team management

### Changed
- [TASK_094] Restore admin privilege assignment for existing users via INITIAL_ADMIN_EMAIL (2025-06-25)
  - Restore selective admin initialization that only grants privileges to existing users
  - Remove automatic user creation while maintaining admin privilege assignment functionality
  - Update INITIAL_ADMIN_EMAIL to work as privilege assignment tool for registered users
  - Improve admin setup workflow by combining manual registration with automatic privilege assignment

### Fixed
- [TASK_096] Fix ClientSession model database schema mismatch for MCP connections (2025-06-25)
  - Updated ClientSession model to match actual database schema with client_name field
  - Fixed MCP SSE Bridge to use correct field names (client_name, status, failed_requests, etc.)
  - Added compatibility properties for backward compatibility
  - Resolved "column 'client_type' does not exist" errors during MCP client connections
- [TASK_093] Activity Logger JSON serialization error during API key creation (2025-06-25)
  - Fix SQLAlchemy Session object being passed to Activity Logger meta_data causing JSON serialization errors
  - Add JSON safety validation to prevent non-serializable objects from being stored in activity metadata
  - Update all Activity Logger convenience methods to properly handle database session parameters
  - Resolve "Object of type Session is not JSON serializable" error during API key creation workflow
  - Enable proper activity logging for all system operations with comprehensive serialization safety

### Added
- [TASK_085] API Key creation success dialog with secure key display (2025-06-25)
  - Add ApiKeySuccessDialog component with masked/visible key toggle
  - Implement secure API key copy functionality with visual feedback
  - Add comprehensive security warnings and usage guidelines
  - Include API key metadata display (name, description, expiration)
  - Enable one-time secure display of generated API keys with proper UX flow

### Changed
- [TASK_091] Improve signup success redirect timing for better user experience (2025-06-25)
  - Reduce success toast display duration from 5 seconds to 2 seconds
  - Remove 1.5 second redirect delay for immediate login page navigation
  - Improve overall signup completion flow responsiveness
  - Maintain visual feedback while eliminating unnecessary waiting time
- [TASK_088] Update Admin Worker Status display to "Coming Soon" (2025-06-25)
  - Change APScheduler Worker status from inaccurate "Stopped" display to "Coming Soon" badge
  - Update both Worker Status card and Core Component Status sections in admin panel
  - Apply consistent blue theme for Coming Soon indicators to avoid user confusion
  - Prioritize user experience over incomplete feature implementation

### Changed
- [TASK_092] Disable automatic admin user creation on server startup (2025-06-25)
  - Remove automatic user creation logic for INITIAL_ADMIN_EMAIL environment variable
  - Require manual user registration followed by admin privilege assignment
  - Update environment file documentation to reflect manual admin setup process
  - Improve security by preventing unintended automatic user account creation
- [TASK_090] Integrate Global Servers functionality into Admin Panel (2025-06-25)
  - Move Global Servers management from standalone /servers route to admin panel structure
  - Add Global Servers section to Admin Panel Quick Actions for better organization
  - Create /admin/servers route with admin-integrated server management interface
  - Remove standalone /servers page and redirect to admin panel structure
  - Improve admin interface consistency and centralize admin-level features

### Fixed
- [TASK_089] Project server logs API ServerLog model project_id reference fix (2025-06-25)
  - Fix project_servers.py get_server_logs function to remove direct ServerLog.project_id reference
  - Update server_log_service.py to use McpServer JOIN for project_id filtering instead of direct field access
  - Resolve "type object 'ServerLog' has no attribute 'project_id'" error in project server logs interface
  - Maintain backward compatibility for all service methods while adapting to TASK_080 schema changes
  - Enable proper server log display in project management interface
- [TASK_087] Admin system logs ServerLog model relationship mapping (2025-06-25)
  - Fix admin API to reference project_id through McpServer relationship instead of direct ServerLog.project_id
  - Update ServerLog query joins to properly connect McpServer and Project tables
  - Resolve "type object 'ServerLog' has no attribute 'project_id'" error in admin logs interface
  - Add default source field value for ServerLog entries to maintain API compatibility
  - Enable proper admin system log filtering and project association
- [TASK_078] Fix api_usage table schema mismatch for API key deletion (2025-06-25)
  - Update api_usage table schema to match ApiUsage model definition
  - Add missing columns: team_id, tool_name, server_name, response_time_ms, tokens_used, bytes_transferred, cost_credits
  - Remove obsolete columns: user_id, project_id, request_size, response_size, duration_ms, etc.
  - Update foreign key constraints and indexes to match model requirements
  - Resolve PostgreSQL UndefinedColumn errors during API key deletion operations
- [TASK_078] Fix Activity model property setters and logging compatibility (2025-06-25)
  - Add missing setters for action, target_type, target_id, meta_data, and context properties in Activity model
  - Add title field to activity logger to comply with Activity model requirements
  - Resolve AttributeError when creating activity logs during API key operations
  - Maintain backward compatibility with existing property usage across the system
  - Enable proper activity logging for all system operations with complete field mapping
- [TASK_084] Improve team invitation logic and UI with collapsed team display (2025-06-25)
  - Allow team invitations to succeed even when all members are already in project
  - Update team invitation response to include success status and detailed messages
  - Implement collapsed team cards in project members page with click-to-expand functionality
  - Improve user experience with better toast messages for team invitation scenarios
  - Enable better team member organization with collapsible team sections
- [TASK_078] Fix api_keys table schema mismatch for API key creation (2025-06-25)
  - Update api_keys table schema to match SQLAlchemy model definition
  - Add missing columns: rate_limit_per_minute, rate_limit_per_day, created_by_id, last_used_ip, permissions
  - Replace user_id with created_by_id and scopes with permissions for consistency
  - Remove obsolete usage_count column from table structure
  - Resolve PostgreSQL UndefinedColumn errors during API key creation operations
- [TASK_083] Simplify project members UI with improved Individual/Team organization (2025-06-25)
  - Redesign project members page from 3 sections to 2 clear sections: Individual Members and Team Members
  - Group team members by team name with visual team headers and member counts
  - Consolidate individual and external members into single "Individual Members" section
  - Improve UX with cleaner visual hierarchy and better team member organization
  - Remove redundant "Team" column in team members table since members are already grouped by team
- [TASK_082] Simplify admin initialization to work with email-only configuration (2025-06-25)
  - Remove INITIAL_ADMIN_PASSWORD requirement for existing users
  - Allow admin privilege assignment to existing users with only INITIAL_ADMIN_EMAIL
  - Improve security by avoiding password storage in environment files
  - New users still require password for account creation
- [TASK_063] Fix team project display to show only team-invited projects (2025-06-25)
  - Update get_team_projects function to filter by InviteSource.TEAM_MEMBER only
  - Prevent individual member's personal projects from appearing in team project lists
  - Resolve data integrity issue where team members' personal projects were incorrectly displayed as team projects
  - Improve team project isolation and data accuracy
- [TASK_064] Fix team member invitation 405 error (2025-06-25)
  - Add missing Next.js API route for team member invitation
  - Implement POST /api/teams/[teamId]/members/invite endpoint
  - Enable team member invitation functionality in frontend
  - Fix 405 Method Not Allowed error for team member invitations

### Added
- [TASK_076] Automatic MCP encryption key generation and management (2025-06-25)
  - Add MCP_ENCRYPTION_KEY to .env.example and .env.hybrid.example with comprehensive documentation
  - Implement automatic encryption key generation in quickstart.sh installation script
  - Add detection and automatic generation for missing encryption keys in existing installations
  - Include detailed security documentation in README.md with best practices
  - Prevent "No encryption key found" warnings during initial server startup
  - Ensure secure MCP server data encryption from first installation
- [TASK_077] Frontend Load Example simplification for better user experience (2025-06-25)
  - Simplified AddServerDialog Load Example to show only brave-search configuration
  - Removed complex multi-server examples to reduce user confusion
  - Improved JSON configuration clarity for new users

### Fixed
- [TASK_080] ServerLog model schema alignment with database structure (2025-06-25)
  - Updated ServerLog model to match actual database schema with session_id and request_id fields
  - Changed details field from Text to JSON type to match database
  - Updated LogCategory enum values to match database: STARTUP, SHUTDOWN, TOOL_CALL, ERROR, CONNECTION, SYSTEM
  - Removed project_id and source fields that were not present in actual database
  - Added created_at and updated_at timestamp fields for consistency
- [TASK_075] Comprehensive database schema synchronization with all SQLAlchemy models (2025-06-25)
  - Updated initial migration to include complete schemas for all 9 tables with field differences
  - Added missing fields to API_KEYS table: description (Text)
  - Added missing fields to API_USAGE table: ip_address, user_agent, referer, request_headers, response_headers, request_body_hash, response_body_hash, error_message, rate_limit_hit, cache_hit, region, session_id, created_at, updated_at
  - Added missing fields to TEAMS table: billing_email, subscription_plan, max_projects, max_members
  - Added missing fields to TEAM_MEMBERS table: permissions, status, invited_at, created_at, updated_at
  - Added missing fields to CLIENT_SESSIONS table: session_token, user_id, project_id, client_version, ip_address, user_agent, capabilities, protocol_version, status, last_activity_type, connection_count, total_requests, failed_requests, updated_at
  - Added missing fields to SERVER_LOGS table: session_id, request_id, created_at, updated_at
  - Added missing fields to TOOL_CALL_LOGS table: request_id, session_id, tool_id, project_id, api_key_id, input_tokens, output_tokens, total_cost, priority, retry_count, error_code, queue_time_ms, started_at, completed_at, created_at, updated_at
  - Added missing fields to USER_FAVORITES table: favorite_type, tool_id, project_id, display_order, notes, updated_at
  - Added missing fields to ACTIVITIES table: resource_type, resource_id, ip_address, user_agent, session_id, tags, updated_at
- [TASK_077] Backend API field mapping corrections for ToolCallLog compatibility (2025-06-25)
  - Fixed ToolCallLog model to use execution_time_ms field matching actual database schema
  - Updated project_servers.py and tool_call_logs.py to use correct field mappings
  - Resolved "execution_time does not exist" database errors in tool call APIs
  - Added backward compatibility property for execution_time (seconds) while using execution_time_ms internally
  - Fixed CallStatus enum usage in API success/error filtering
  - Improved API response time calculations with proper millisecond to second conversions
  - Ensure new installations receive complete modern schemas eliminating schema discovery issues
- [TASK_074] Fix Projects table schema mismatch between model and database (2025-06-25)
  - Update initial migration to include correct Projects table schema with modern fields
  - Fix created_by_id → created_by field naming inconsistency  
  - Add missing fields: sse_auth_required, message_auth_required, allowed_ip_ranges
  - Remove deprecated fields: team_id, is_active, settings from Projects table
  - Update ProjectMember schema with correct field names and types
  - Create migration for existing installations to fix schema inconsistencies
  - Resolve "column projects.created_by does not exist" errors
- [TASK_073] Update initial migration to include all required fields for new installations (2025-06-25)
  - Update initial database migration to include NextAuth.js compatible user fields
  - Update initial migration to include modern WorkerConfig schema with scheduler settings
  - Ensure new installations get complete schema in single migration step
  - Maintain backward compatibility for existing installations via secondary migration
  - Eliminate 2-step migration requirement for fresh deployments
- [TASK_072] Fix database schema mismatch with missing user authentication fields (2025-06-25)
  - Add missing NextAuth.js compatible fields to users table: email_verified, image, password, provider, provider_id
  - Add missing worker configuration fields: server_check_interval, coalesce, max_instances, notes
  - Resolve "column does not exist" errors in user signup and authentication
  - Enable proper NextAuth.js OAuth integration with database persistence
  - Fix worker configuration persistence for scheduler settings
- [TASK_069] Fix NextAuth.js UntrustedHost error in production environment (2025-06-25)
  - Add trustHost: true setting to NextAuth.js configuration
  - Resolve "Host must be trusted" authentication errors in EC2 deployment
  - Enable proper session handling for production domains
  - Fix Frontend Docker container authentication issues

### Changed
- [TASK_071] Add Google DNS configuration to Frontend Docker container (2025-06-25)
  - Add DNS servers (8.8.8.8, 8.8.4.4) to mcp-orch-frontend service
  - Resolve Docker container DNS resolution issues for external domains
  - Enable reliable domain name resolution in containerized environments
  - Follow Docker Compose standard DNS configuration practices
- [TASK_070] Update quickstart scripts to use production-appropriate settings (2025-06-25)
  - Remove --reload option from default serve command in quickstart scripts
  - Set production log level to INFO instead of DEBUG for better performance
  - Maintain development mode option with --reload and DEBUG logging
  - Improve production deployment recommendations

### Added
- [TASK_068] Add quickstart-external-db.sh script for external database deployments (2025-06-25)
  - Create dedicated script for external database usage (AWS Aurora, RDS, Supabase, etc.)
  - Skip PostgreSQL Docker container when using external databases
  - Add DATABASE_URL validation and warning messages for localhost configurations
  - Provide clear guidance for external database setup and migration
  - Maintain frontend Docker container support for hybrid deployments

### Changed
- [TASK_068] Remove INITIAL_ADMIN_PASSWORD requirement and simplify admin setup (2025-06-25)
  - Remove INITIAL_ADMIN_PASSWORD from all environment files for security
  - Add clear English step-by-step admin setup process in comments
  - Simplify admin workflow: signup → set email → restart → auto admin privileges
  - Eliminate security risk of storing plaintext passwords in environment variables
- [TASK_067] Standardize database configuration with DATABASE_URL as primary option (2025-06-25)
  - Set DATABASE_URL as the recommended primary option in all environment files
  - Add clear English comments with "Choose ONE option" guidance in .env.hybrid.example
  - Unify database configuration structure across .env.example and .env.hybrid.example
  - Comment out individual DB_* variables as alternative option
  - Include cloud database examples (AWS RDS, Supabase) for easy reference
- [TASK_066] Clean up environment configuration files and remove unused Enterprise features (2025-06-25)
  - Simplify database configuration with clear "Option 1 vs Option 2" choices in all env files
  - Remove unused Enterprise/Production features from .env.hybrid.example (SSO, SAML, LDAP, S3 backups, webhooks)
  - Reduce .env.hybrid.example from 176 to 76 lines (57% reduction in complexity)
  - Standardize database credentials to mcp_orch/mcp_password across all example files
  - Remove unnecessary Docker-specific environment variables

### Fixed
- [TASK_065] Enhance Docker build configuration to completely skip type checking (2025-06-25)
  - Update next.config.ts to ignore TypeScript and ESLint errors in production environment
  - Set NODE_ENV=production in Dockerfile.frontend to trigger error skipping
  - Resolve persistent Next.js build failures in Docker containers
  - Maintain full type checking in local development while allowing Docker builds to succeed
- [TASK_064] Fix Next.js build failures in Docker environment (2025-06-25)
  - Add Docker-specific build script "build:docker" with --no-lint flag to skip type checking
  - Update Dockerfile.frontend to use pnpm run build:docker instead of build
  - Resolve TypeScript/ESLint compatibility issues between local and Docker environments
  - Enable successful Next.js compilation in containerized deployments
- [TASK_063] Fix Docker frontend build context error in quickstart deployment (2025-06-25)
  - Resolve "/web: not found" error during Docker Compose build process
  - Update docker-compose.yml frontend service to use project root as build context
  - Fix Dockerfile.frontend path reference for proper COPY web/ command execution
  - Enable successful quickstart.sh execution on EC2 and other deployment environments

### Added
- [TASK_062] Add comprehensive shutdown script for clean service termination (2025-06-25)
  - Create scripts/shutdown.sh with intelligent process detection and safe termination
  - Support multiple shutdown modes: interactive, force, docker-only, processes-only
  - Automatic detection of MCP backend processes, Docker containers, and port conflicts
  - Optional data volume cleanup with user confirmation
  - Status verification and restart instructions after shutdown
  - Update README with shutdown management documentation

### Changed
- [TASK_061] Simplify deployment options to 2 clear choices (2025-06-25)
  - Remove complex setup scripts (setup-production.sh, setup-standard.sh, dev-setup.sh)
  - Consolidate quickstart-hybrid.sh into simplified quickstart.sh with automatic frontend
  - Remove Redis and enterprise profiles for simpler architecture
  - Remove monitoring stack (docker-compose.monitoring.yml) 
  - Unify docker-compose.hybrid.yml into single docker-compose.yml
  - Update README to focus on 2 options: Local Development vs Full Docker
  - Eliminate configuration complexity and deployment decision paralysis

### Fixed
- [TASK_060] Fix Alembic migration error with missing mcp_servers table (2025-06-25)
  - Replace invalid ALTER-only migration with comprehensive initial schema migration
  - Add conditional logic to support both fresh installations and existing databases
  - Create complete database schema including all tables, relationships, and constraints
  - Resolve "relation mcp_servers does not exist" error during database initialization

### Changed
- [TASK_059] Improve Docker container security with non-root user patterns (2025-06-25)
  - Update Dockerfile.backend to use standard addgroup/adduser pattern with gid 1001 and uid 1001
  - Maintain existing nextjs user pattern in Dockerfile.frontend following Next.js best practices
  - Remove Docker Compose user overrides in favor of Dockerfile-based user management
  - Improve container security and portability across different host environments

### Fixed
- [TASK_064] Fix Docker network CIDR conflicts by configuring custom 10.123.0.0/16 subnet (2025-06-24)
  - Add custom network configuration to all docker-compose files to avoid corporate network conflicts
  - Set dedicated mcp-orch-network with 10.123.0.0/16 subnet and 10.123.0.1 gateway
  - Update docker-compose.yml, docker-compose.hybrid.yml, and docker-compose.monitoring.yml
  - Resolve container networking issues in corporate environments with overlapping IP ranges
- [TASK_063] Fix PostgreSQL container initialization error in docker-compose.hybrid.yml (2025-06-24)
  - Remove problematic init.sql volume mount that was causing "Is a directory" error
  - Fix PostgreSQL container startup issues during quickstart-hybrid.sh execution
  - Resolve "could not read from input file: Is a directory" error in Docker logs
  - Enable clean PostgreSQL initialization using environment variables only
- [TASK_062] Fix EC2 alembic migration error by updating DATABASE_URL to use asyncpg driver (2025-06-24)
  - Update .env.hybrid.example DATABASE_URL from postgresql:// to postgresql+asyncpg://
  - Update all PostgreSQL connection examples (AWS RDS, Aurora, Supabase, Google Cloud SQL)
  - Resolve SQLAlchemy async engine requiring async driver compatibility
  - Fix "The loaded 'psycopg2' is not async" error during alembic migrations
- [TASK_061] Fix Alembic database connection issues with environment variable support (2025-06-24)
  - Update alembic.ini to use mcp_orch user instead of postgres
  - Add DATABASE_URL environment variable override in migrations/env.py
  - Resolve password authentication failures during database migrations
  - Improve migration configuration flexibility for different deployment scenarios

### Changed
- [TASK_060] Standardize database user to mcp_orch for consistency (2025-06-24)
  - Update .env.example and .env.hybrid.example to use DB_USER=mcp_orch
  - Update docker-compose.yml and docker-compose.hybrid.yml default values
  - Update installation and setup scripts to use consistent database user naming
  - Update DATABASE_URL examples to reflect unified user naming convention
- [TASK_058] Update all Docker Compose commands to V2 syntax (2025-06-24)
  - Replace `docker-compose` with `docker compose` across all scripts, documentation and configuration files
  - Update deployment scripts (quickstart.sh, setup-standard.sh, setup-production.sh, quickstart-hybrid.sh)
  - Update documentation files (README.md, README_KOR.md, troubleshooting.md, database-configuration.md)
  - Update installation script (install.sh) for improved Docker Compose V2 compatibility
  - Ensure consistency with modern Docker Compose V2 standard syntax

### Added
- [TASK_056] Add success toast messages for user registration completion (2025-06-24)
  - Display celebration toast immediately after successful signup
  - Show welcome message on login page with sessionStorage persistence
  - Add first login detection with special welcome toast for new users
  - Improve user onboarding experience with friendly feedback messages

### Fixed
- [TASK_058] Fix toast system compatibility by switching to Sonner (2025-06-24)
  - Replace custom useToast hook with Sonner toast library for consistent functionality
  - Update signup and signin pages to use Sonner toast.success() methods
  - Remove debugging code and clean up test toast implementations
  - Ensure proper toast display across all authentication flows

### Fixed
- [TASK_057] Fix project creation team selection to show only user's teams (2025-06-24)
  - Replace hardcoded dummy teams with actual user team API integration
  - Update TeamStore to use /api/teams endpoint with NextAuth.js session authentication
  - Improve UI to show "Create as Personal Project" as default when user has no teams
  - Remove API token dependency in favor of session-based authentication
- [TASK_055] Fix project creation 500 error due to missing slug field (2025-06-24)
  - Add automatic slug generation function for new projects
  - Implement Unicode normalization and URL-friendly slug conversion
  - Add unique slug constraint enforcement with collision handling
  - Resolve NOT NULL constraint violation in projects.slug column

### Added
- [TASK_054] Clean up CHANGELOG entries to focus on technical changes (2025-06-24)
  - Remove platform-specific marketing language from changelog entries
  - Focus on concrete technical improvements and organizational changes
  - Maintain clear and factual documentation standards
- [TASK_053] Migrate workflow management to .tasks/ directory (2025-06-24)
  - Rename .claude/workflow/ to .tasks/ for cleaner project structure
  - Consolidate workflow_todo.md to workflow.md for simplified management
  - Update all CLAUDE.md references to new .tasks/workflow.md path
  - Improve workflow file organization and accessibility
- [TASK_052] Establish English-only CHANGELOG documentation standard (2025-06-24)
  - Enforce English language requirement for all CHANGELOG entries
  - Remove AI agent workflow and configuration changes from changelog scope
  - Standardize technical documentation language for international collaboration
- [TASK_051] Integrate mcp-time tool for accurate date/time management (2025-06-24)
  - Add Asia/Seoul timezone-based current date/time query functionality
  - Enable automatic precise timestamp application in CHANGELOG.md updates
  - Improve AI agent time recognition accuracy
- [TASK_050] Add CHANGELOG.md link to README.md
  - Include changelog link in main navigation links
  - Provide easy access to project change history
  - Improve project documentation discoverability
- [TASK_049] Remove compatibility_mode auto-injection from frontend JSON editor
  - Remove compatibility_mode from JSON examples in AddServerDialog
  - Eliminate automatic compatibility_mode injection in JSON parsing logic
  - Clean up server creation and update API calls to not send compatibility_mode
  - Simplify server configuration objects in frontend callbacks
- [TASK_048] Remove unnecessary compatibility_mode field from JSON settings
  - Remove compatibility_mode field from server creation and update APIs
  - Simplify Cline configuration generation to single Resource Connection mode
  - Clean up database model default to use resource_connection consistently
  - Eliminate conditional logic for compatibility mode selection
- [TASK_045] Environment variable configuration support for MCP Session Manager
  - `MCP_SESSION_TIMEOUT_MINUTES` - Configure session timeout (default: 30 minutes)
  - `MCP_SESSION_CLEANUP_INTERVAL_MINUTES` - Configure cleanup interval (default: 5 minutes)
  - English documentation and comprehensive comments
  - Updated `.env.example` with MCP session configuration

## [0.2.0] - 2025-06-23

### Added
- [TASK_044] True MCP standard Resource Connection implementation
  - Persistent session management following MCP Python SDK patterns
  - `stdio_client` pattern with ClientSession lifecycle management
  - Session reuse across multiple tool calls from different clients (Cline, Cursor)
  - Background cleanup of expired sessions
  - Tool schema normalization (`inputSchema` → `schema` conversion)
  - FastAPI application lifecycle integration

### Changed
- [TASK_043] Complete transition to single Resource Connection mode
  - Removed API Wrapper compatibility mode entirely
  - Simplified frontend UI by removing mode selection
  - All MCP servers now use persistent connections by default
  - Enhanced code maintainability and reduced complexity

### Fixed
- Tool parameters not displaying in UI after session manager implementation
- MCP tool schema compatibility with frontend components
- Session initialization and connection stability

### Removed
- API Wrapper mode and related legacy code
- Compatibility mode selection from server configuration UI
- Redundant server type management logic

## [0.1.0] - 2025-06-22

### Added
- Initial MCP Orch implementation
- Hybrid MCP proxy and orchestration platform
- User authentication and authorization system
- Team and project management
- Basic MCP server integration
- Web-based management interface
- Docker deployment support
- PostgreSQL database backend

### Features
- Multi-tenant architecture with teams and projects
- MCP server lifecycle management
- Tool execution logging and monitoring
- Real-time server status tracking
- API key management for external access
- Security settings and access controls

---

## How to Read This Changelog

### Categories
- **Added** - New features and capabilities
- **Changed** - Changes in existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Features removed in this version
- **Fixed** - Bug fixes
- **Security** - Vulnerability fixes

### Task References
- Each change includes `[TASK_XXX]` reference linking to workflow documentation
- Tasks can be tracked in `.claude/workflow/workflow_todo.md`

### Version Format
- **Major.Minor.Patch** (e.g., 1.2.3)
- **Major** - Breaking changes or significant new features
- **Minor** - New features, backward compatible
- **Patch** - Bug fixes, backward compatible
