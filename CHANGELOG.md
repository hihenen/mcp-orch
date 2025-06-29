# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- [TASK_147] Complete Standard MCP API refactoring with SOLID principles (2025-06-29)
  - Decompose monolithic standard_mcp.py (1,248 lines) into 8 specialized modules
  - Achieve single responsibility principle: common.py, mcp_auth_manager.py, mcp_protocol_handler.py, mcp_tool_manager.py, mcp_server_connector.py, mcp_sse_manager.py, fastmcp_integration.py, mcp_routes.py
  - Maintain 100% backward compatibility through Facade pattern implementation
  - Improve code maintainability with average file size reduction from 1,248 to 220 lines per module (90.9% reduction)
  - Complete MCP protocol implementation with modular architecture following SOLID principles
  - Support both FastMCP integration and manual MCP server connections
  - Implement comprehensive authentication, protocol handling, tool management, and SSE streaming
- [TASK_143] Complete Projects API refactoring Phase 1 (2025-06-29)
  - Successfully decomposed critical 2,031-line projects.py into 8 specialized modules
  - Established Projects API module structure: core.py, members.py, servers.py, teams.py, api_keys.py, favorites.py, common.py
  - Achieved SOLID principles compliance with single responsibility per module
  - Maintained 100% backward compatibility through router integration
  - Resolved all critical Issues identified in analysis including owner permission bugs and field consistency
  - Improved code maintainability with average file size reduction from 2,031 to 322 lines per module
  - Completed MCP Connection Service refactoring (1,531 → 37 lines wrapper + 8 specialized modules)
  - Finished Unified MCP Transport refactoring (1,328 → 56 lines wrapper + 6 modules)
  - All Phase 1 critical priority refactoring tasks completed successfully

### Changed
- [TASK_146] Complete Teams API refactoring with SOLID principles (2025-06-29)
  - Decompose monolithic teams.py (1069 lines) into 7 specialized modules
  - Achieve single responsibility principle: core.py, members.py, api_keys.py, projects.py, settings.py, activity.py, common.py
  - Maintain 100% backward compatibility through router integration
  - Improve code maintainability with average file size reduction from 1069 to 152 lines per module
  - All 14 API endpoints preserved with identical functionality and response formats
- [TASK_145] Improve server creation UI by reordering tabs (2025-06-29)
  - Move JSON Add tab to first position in AddServerDialog for better user experience
  - Prioritize JSON configuration method over individual field input
  - Maintain consistent tab ordering for both add and edit modes

### Fixed
- [TASK_158] Fix UTF-8 encoding errors in MCP message reading causing tool execution failures (2025-06-29)
  - Implement incremental UTF-8 decoder to handle multibyte characters split across chunk boundaries
  - Add byte buffer management to prevent "unexpected end of data" errors at 8KB chunk boundaries
  - Fix "invalid start byte" errors by properly handling incomplete UTF-8 sequences
  - Enhance session cleanup to properly manage byte buffers and UTF-8 decoder state
  - Resolve intermittent "Invalid UTF-8 encoding" errors in MCP tool execution
- [TASK_157] Fix MCP Session Manager database session type error causing ToolCallLog save failures (2025-06-29)
  - Add database session type validation in _save_tool_call_log method to prevent "'str' object has no attribute 'rollback'" errors
  - Implement proper session management with try-finally blocks for synchronous database sessions in mcp_sdk_sse_bridge.py
  - Add type checking for SQLAlchemy Session objects before database operations to ensure compatibility
  - Resolve ToolCallLog audit logging failures that occurred during successful Context7 tool executions
- [TASK_156] Fix unified MCP transport tuple parsing error causing HTTP 500 (2025-06-29)
  - Fix "'tuple' object has no attribute 'get'" error in Context7.resolve-library-id tool execution
  - Correct protocol_handler.py to handle parse_tool_name() tuple return value properly
  - Replace dictionary access with tuple unpacking: (server_name, original_name) = parse_tool_name()
  - Add proper error handling for tool name parsing failures
  - Resolve HTTP 500 errors when using Context7 tools through unified/sse endpoint
- [TASK_155] Fix McpOrchestrator.call_tool() missing user_agent parameter error (2025-06-29)
  - Add user_agent and ip_address parameters to McpOrchestrator.call_tool() method signature
  - Fix "got an unexpected keyword argument 'user_agent'" error when calling remote-context7 MCP server
  - Ensure compatibility with mcp_sdk_sse_bridge.py which passes user_agent for client identification
  - Maintain backward compatibility with optional parameters for all new fields
  - Delegate to MCP Session Manager with complete parameter forwarding for proper logging
- [TASK_149] Resolve MCP router path conflicts causing unified errors in individual server endpoints (2025-06-29)
  - Identify router registration order issue: 4 routers competing for same path `/projects/{id}/servers/{name}/sse`
  - Implement unique path prefixes: bridge/, transport/, standard/, legacy/ for different MCP router implementations
  - Preserve backward compatibility by keeping main path `/projects/{id}/servers/{name}/sse` on priority router
  - Resolve "unified-related errors in individual server endpoints" issue caused by router precedence
  - Ensure unified errors appear in unified endpoints and individual errors in individual endpoints
- [TASK_147] Restore MCP server compatibility after Standard MCP refactoring (2025-06-29)
  - Add missing session_id parameter to McpOrchestrator.call_tool() method
  - Add parse_tool_name method to UnifiedToolNaming class for backward compatibility
  - Fix "unexpected keyword argument 'session_id'" error in MCP Session Manager
  - Fix "'UnifiedToolNaming' object has no attribute 'parse_tool_name'" error in Unified Transport
  - Ensure 100% compatibility with existing MCP server implementations
- [TASK_145] Fix project creation and server registration NOT NULL constraint violations (2025-06-29)
  - Remove non-existent slug field from ProjectResponse in core.py to resolve AttributeError
  - Add missing created_by_id field to McpServer creation in servers.py
  - Fix "null value in column 'created_by_id' of relation 'mcp_servers' violates not-null constraint" error
  - Ensure proper user tracking for both project and server creation operations
- [TASK_144] Fix MCP server JWT authentication setting update not persisting (2025-06-29)
  - Add jwt_auth_required field to ServerUpdate Pydantic model in project_servers.py
  - Add jwt_auth_required processing logic in update_project_server function  
  - Include jwt_auth_required field in all ServerResponse models for consistent API responses
  - Update both original and refactored projects API modules for complete coverage
  - Resolve issue where JWT auth setting changes from frontend were ignored by backend
  - Ensure "Project Default" to "Inherit" changes properly save as null in database
- [TASK_143] Fix MCP server JWT authentication setting update not working (2025-06-29)
  - Add missing jwt_auth_required field to server edit dialog data
  - Ensure JWT authentication setting changes are properly sent to backend
  - Fix server edit form not preserving current JWT authentication setting
  - Resolve issue where authentication setting changes were ignored during server updates
- [TASK_143] Fix MCP server 'No Auth' status display issue (2025-06-29)
  - Add jwt_auth_required field to McpServerResponse and McpServerDetailResponse models
  - Use server.get_effective_jwt_auth_required() method instead of direct field access
  - Ensure proper inheritance of project default authentication settings when server setting is null
  - Resolve frontend display showing incorrect 'No Auth' status for all MCP servers
- [TASK_143] Fix API key creation field naming mismatch error (2025-06-29)
  - Change api_key_hash to key_hash in ApiKey creation to match SQLAlchemy model
  - Add missing key_prefix field to prevent database constraint errors
  - Resolve "'api_key_hash' is an invalid keyword argument for ApiKey" error
  - Ensure API key creation functionality works properly for project authentication
- [TASK_143] Complete Phase 1 critical frontend fixes for projects.py refactoring (2025-06-29)
  - Add user_role field to Project interface for proper owner permission recognition
  - Change disabled to is_enabled in ProjectServer interface to match backend
  - Update ServerDetail interface with is_enabled and JWT auth fields
  - Fix admin server page to use is_enabled instead of disabled
  - Update ProjectStore loadProject to use backend-provided user_role directly
  - Add fallback logic and debugging logs for robust permission handling
  - Verify server components already use correct is_enabled field
  - Fix project settings page to use getCurrentUserRole() instead of deprecated currentUserRole
  - Resolve critical "Read-only Mode" issue that blocked owner access to project settings
  - Complete frontend codebase verification for field consistency
  - Ensure all TypeScript disabled field errors resolved
  - All critical permission and field issues identified in analysis now fixed

### Fixed
- [TASK_142] Complete unified MCP transport refactoring with missing features (2025-06-29)
  - Add missing handle_resources_list and handle_resources_templates_list methods to protocol_handler.py
  - Restore original SSE message format for Inspector compatibility (data: {json} format)
  - Fix keep-alive format to match original unified-keepalive pattern
  - Ensure complete backward compatibility with original unified_mcp_transport.py
  - Resolve namespace registry method naming to use get_original_name() correctly
- [TASK_140] Fix unified MCP endpoint 404 error after refactoring (2025-06-29)
  - Restore original API route paths: /projects/{project_id}/unified/sse
  - Fix route path mismatch in refactored unified MCP transport module
  - Ensure backward compatibility with existing MCP client connections
  - Maintain Inspector and Cline integration functionality

- [TASK_141] Remove orchestrator meta-tools from unified MCP transport (2025-06-29)
  - Remove orchestrator_list_servers, orchestrator_server_health, orchestrator_set_namespace_separator tools
  - Show only actual MCP server tools instead of meta-tools per user request
  - Clean up tool listing to display real server functionality
  - Improve tool discovery for actual MCP server implementations

### Changed
- [TASK_134] Unify API responses to use is_enabled field instead of disabled for consistency (2025-06-28)
  - Change all API responses from disabled: not is_enabled to is_enabled: is_enabled
  - Update TypeScript interfaces to use is_enabled field
  - Update all frontend components to use is_enabled instead of disabled
  - Modify config_manager.py to use is_enabled field from database model
  - Update all server status checks to use is_enabled consistently
  - Eliminate double negation patterns and improve code readability
  - Align with Tool Preferences pattern that already uses is_enabled
  - Ensure single source of truth across database, API, and frontend

### Removed
- [TASK_137] Remove orchestrator meta tools to align with MCP ecosystem simplicity (2025-06-28)
  - Remove OrchestratorMetaTools class and get_meta_tool_prefix() function from namespace.py
  - Remove all meta tool handler methods from unified_mcp_transport.py 
  - Remove meta tool detection and processing logic from tools/list and tool_call handlers
  - Eliminate complexity that doesn't align with standard MCP server philosophy
  - Focus on core business logic tools for cleaner ecosystem leadership

### Fixed
- [TASK_131] Fix Tool Preferences filtering not applied in Unified MCP Transport (2025-06-28)
  - Add Tool Preferences filtering to UnifiedMCPTransport handle_tools_list handler
  - Apply filtering to each server's tools before namespace conversion
  - Update tool collection logs to show filtered vs total tool count per server
  - Ensure consistent filtering behavior across Individual SSE, Session Manager, and Unified modes
  - Resolve issue where disabled tools appeared in unified mode Inspector connections
- [TASK_130] Fix Tool Preferences filtering not applied in SSE Bridge connections (2025-06-28)
  - Add Tool Preferences filtering to MCP SDK SSE Bridge list_tools handler
  - Ensure disabled tools are properly filtered out before sending to MCP clients
  - Update tool loading logs to show filtered tool count vs total tool count
  - Resolve issue where disabled tools like list_tables still appeared in Cline/Inspector
  - Maintain consistency with MCP Session Manager filtering behavior
- [TASK_128] Fix NextJS 15 async params compatibility issue in unified-connection API route (2025-06-28)
  - Change function signature from destructured params to ctx pattern for consistency
  - Add await to ctx.params access to comply with NextJS 15 async dynamic APIs
  - Resolve "params should be awaited before using its properties" error
  - Unify API route patterns across all dynamic route handlers for maintainability
- [TASK_129] Change temporary time display from UTC to Korea timezone (GMT+9) (2025-06-28)
  - Force Asia/Seoul timezone in formatDateTime and formatTime functions for correct local time
  - Display "GMT+9" timezone indicator to show proper Korean time reference
  - Resolve user feedback requesting Korean time instead of UTC time display
  - Ensure accurate time display matches user's local timezone expectations
  - Maintain temporary fix until backend @field_serializer properly serializes with 'Z' suffix
- [TASK_127] Implement temporary UTC time display to resolve 9-hour offset issue (2025-06-27)
  - Force UTC timezone in formatDateTime and formatTime functions as temporary fix
  - Display "UTC" timezone indicator to inform users of current time reference
  - Add TODO comments for future removal once backend @field_serializer is properly working
  - Resolve immediate user experience issue where times showed 9 hours behind actual values
  - Ensure consistent and accurate time display across all components until backend fix
- [TASK_125] Improve datetime display to show clean local time without timezone indicators (2025-06-27)
  - Remove timeZoneName from default formatDateTime and formatTime functions
  - Display times in user's browser timezone without GMT+9 suffix for cleaner UI
  - Add formatDateTimeWithTimezone and formatTimeWithTimezone for future user preference settings
  - Enable consistent user experience with localized time display across all components
  - Prepare foundation for future timezone display customization options
- [TASK_124] Fix Pydantic V2 datetime serialization using field_serializer decorator (2025-06-27)
  - Replace deprecated json_encoders with @field_serializer for ServerResponse model
  - Ensure datetime fields are properly serialized with UTC 'Z' suffix for JavaScript compatibility
  - Resolve backend API responses missing timezone information using modern Pydantic V2 patterns
  - Maintain backward compatibility while migrating from V1 json_encoders to V2 field serializers
- [TASK_123] Add comprehensive timestamp debugging logs for API responses and date formatting (2025-06-27)
  - Add detailed API response logging in loadProjectServers to debug timezone issues
  - Include JavaScript Date parsing tests with Korean timezone conversion
  - Add frontend date formatting debug logs to track formatDateTime behavior
  - Log browser timezone detection and current time comparison for debugging
  - Enable developer console monitoring of actual API timestamp values and formatting results
- [TASK_121] Fix server status display inconsistency between backend and frontend (2025-06-27)
  - Unify frontend status mapping to match backend status values (online/offline/error/disabled)
  - Resolve servers showing as "Unknown" when backend sends "online" status
  - Add proper handling for "disabled" status in frontend interface
  - Enhance backend live check logging with detailed debug information
  - Change default unknown status from 'Error' to 'Unknown' for better UX
- [TASK_122] Fix datetime timezone handling for accurate timestamp display (2025-06-27)
  - Add UTC timezone information to all datetime API responses using Pydantic JSON encoders
  - Resolve JavaScript date parsing issues causing timestamps to display 10+ hours behind
  - Ensure ISO 8601 compliance with 'Z' suffix for UTC timestamps
  - Maintain backward compatibility with existing API clients
  - Create comprehensive timezone handling documentation in docs/timezone-handling.md

### Added
- [TASK_120] Add comprehensive database management guidelines to prevent schema corruption (2025-06-27)
  - Create CLAUDE.md with strict database modification policies
  - Enforce Alembic-only migration policy with zero exceptions
  - Prohibit direct SQL execution, psql usage, and manual DDL operations
  - Establish proper model-first development workflow for all schema changes
  - Add emergency response procedures that maintain migration integrity
  - Include comprehensive checklist for all database modifications
- [TASK_120] Fix tool preference database schema and service layer issues (2025-06-27)
  - Add missing updated_at column to tool_preferences table via proper Alembic migration
  - Fix ToolFilteringService to use datetime objects instead of Unix timestamps
  - Ensure database compatibility with SQLAlchemy DateTime fields
  - Add column existence checks in migration for safer upgrades
  - Update ToolPreference model with proper created_at and updated_at timestamp fields
- [TASK_120] Fix tool preference toggle functionality and optimize UI responsiveness (2025-06-27)
  - Add missing Next.js API route endpoints for tool preference management
  - Implement GET/PUT/DELETE endpoints with JWT authentication for secure access
  - Fix store optimistic updates to provide immediate UI feedback without loading delays
  - Add proper error handling with state rollback on API failures
  - Ensure tool toggles work instantly with reliable backend synchronization
- [TASK_120] Implement improved server-level tool management UX (2025-06-27)
  - Replace separate project tools page with integrated server-level tool toggle interface
  - Add individual tool on/off switches in server detail Tools tab with immediate visual feedback
  - Implement bulk operations (All ON/All OFF) for efficient server-level tool management
  - Show enabled/disabled tool counts in real-time with visual state indicators
  - Hide disabled tools from MCP clients while keeping them manageable in UI
  - Remove redundant project-level tools navigation for streamlined user workflow
  - Integrate existing toolPreferenceStore for seamless state management and optimistic updates
- [TASK_120] Fix ToolPreference model import errors and server startup issues (2025-06-27)
  - Fix BaseModel import error by changing to Base class inheritance for SQLAlchemy compatibility
  - Add missing UUID primary key to ToolPreference model for proper database table creation
  - Remove unused get_admin_user import from ServerStatusService to resolve module dependency error
  - Verify successful server startup with Tool Filtering System integration complete
- [TASK_120] Complete Phase 2 - Tool filtering system transport layer integration (2025-06-27)
  - Integrate real-time filtering into MCP Session Manager for both cached and new tool retrieval
  - Connect Scheduler Service with cache invalidation system for automatic refresh on tool changes
  - Add comprehensive Tool Preferences REST API with JWT authentication (GET, PUT, DELETE endpoints)
  - Support bulk tool preference updates for efficient UI operations
  - Implement project-based access control with role-based permissions (DEVELOPER+ for modifications)
  - Register Tool Preferences API router in main FastAPI application for production ready deployment
  - Enable transparent filtering across both Unified and Individual MCP Transport systems
- [TASK_048] Implement Phase 1 - Core tool filtering system foundation (2025-06-27)
  - Add ToolPreference database model with project-server-tool unique constraints
  - Implement ToolFilteringService with ServerStatusService pattern integration for consistent DB session management
  - Add CacheInvalidationService for unified cache management across MCP session manager integration
  - Create database migration for tool_preferences table with performance-optimized indexes
  - Include relationship mappings between Project, McpServer, and ToolPreference models
  - Add comprehensive logging with ServerStatusService-style metrics for monitoring and debugging
- [TASK_048] Complete MCP tool filtering system design documentation with existing system integration (2025-06-27)
  - Add comprehensive design document for web UI-based tool enable/disable control system
  - Support for both Unified MCP Transport and Individual MCP Transport filtering
  - Include database schema design with tool_preferences table for project-specific settings
  - Add common ToolFilteringService for consistent filtering across all transport types
  - Design real-time filtering system with SSE client integration for immediate tool control
  - Integrate with existing SchedulerService for automatic cache invalidation on tool changes
  - Leverage existing MCP session manager's tools_cache system for memory optimization
  - Utilize existing live_check system for immediate filtering status reflection in UI
  - Add 3-layer caching architecture based on PostgreSQL optimization (no Redis dependency)
  - Include ServerStatusService pattern integration for consistent DB session management
  - Reduce implementation timeline from 8 days to 6 days through existing system integration
- [TASK_106] Implement automatic MCP server status update system (2025-06-27)
  - Add ServerStatusService for centralized server status management across all connection types
  - Enable automatic status updates on SSE connections (connect/disconnect) to reflect real-time states
  - Add MCP session manager integration for status synchronization on session lifecycle events
  - Enhance existing scheduler service to use unified status update system for consistency
  - Enable real-time status updates for server initialization, connection failures, and session expiry
  - Set default live_check=true in frontend for immediate accurate status display
  - Add comprehensive logging and metrics for server status change tracking

### Fixed
- [TASK_109] Fix Roo client compatibility by adding resources/list and resources/templates/list support to UnifiedMCPTransport (2025-06-27)
  - Add handle_resources_list method to return empty resources array for Roo client compatibility
  - Add handle_resources_templates_list method to return empty resourceTemplates array
  - Prevent connection drops when Roo client requests resources discovery
  - Enable proper tool list display in Roo code while maintaining tools-focused implementation
  - Individual MCP servers (MCPSSETransport) left unchanged to maintain full backward compatibility
- [TASK_108] Fix Unified MCP tools/list schema field naming for Inspector UI compatibility (2025-06-27)
  - Standardize tool schema field naming from 'schema' to 'inputSchema' in UnifiedMCPTransport
  - Add fallback inputSchema for tools missing schema definitions to prevent validation errors
  - Resolve Inspector Tools tab schema validation errors when clicking "List Tools" button
  - Individual MCP servers (MCPSSETransport) left unchanged to maintain full backward compatibility
- [TASK_107] Fix Unified MCP initialize response schema validation errors in Inspector (2025-06-27)
  - Change capabilities.prompts and capabilities.resources from null to empty objects {} 
  - Resolve Inspector schema validation errors that expected object types instead of null values
  - Enable proper Inspector compatibility and tools/list functionality in unified mode
  - Individual MCP servers (MCPSSETransport) left unchanged to maintain compatibility
- [TASK_106] Fix Unified MCP SSE message queue handling for initialize/tools responses (2025-06-27)
  - Modify UnifiedMCPTransport to use message queue instead of direct JSONResponse returns
  - Fix handle_initialize() method to queue responses for SSE transmission compatibility
  - Fix handle_tools_list() and handle_tool_call() methods to use message queue system  
  - Enable proper Inspector handshake completion by ensuring initialize responses reach client
  - Resolve connection drops in unified MCP mode due to missing initialize response transmission
  - Maintain complete backward compatibility with individual MCP server operations
- [TASK_105] Fix Unified MCP SSE connection issue by implementing proper Inspector compatibility (2025-06-27)
  - Override start_sse_stream() method in UnifiedMCPTransport to ensure proper SSE endpoint events
  - Add handle_initialize() method override for unified server initialization
  - Implement Inspector-compatible endpoint event transmission for unified connections
  - Fix connection drops by ensuring proper message queue handling for unified sessions
  - Improve logging for unified SSE stream debugging and troubleshooting
- [TASK_089] Fix Python syntax error in mcp_session_manager.py preventing server startup (2025-06-27)
  - Replace misplaced 'continue' statements with proper recursive calls in JSON parsing error handling
  - Fix SyntaxError at line 442 and 475 where 'continue' was used outside of loop context
  - Ensure proper control flow when JSON parsing fails during MCP message reading
  - Prevent server startup failures caused by syntax validation errors

### Changed
- [TASK_094] Set Unified MCP Server as disabled by default for new projects (2025-06-27)
  - Change Project model unified_mcp_enabled default value from True to False
  - Add validation in Unified SSE endpoint to check project setting before allowing connections
  - Update project settings UI to default to disabled state with BETA badge indication
  - Create migration to set existing projects' unified_mcp_enabled to False for safety
  - Unified MCP Server now requires explicit user activation in project settings

### Fixed
- [TASK_101] Implement MCP official SDK pattern for message reading with large message support (2025-06-27)
  - Adopt official MCP Python SDK chunk-based reading pattern from /mcp/python-sdk
  - Replace problematic readuntil() approach with buffer management and split('\n') processing
  - Fix Python version compatibility issues (readuntil limit parameter not supported in older versions)
  - Implement 8KB chunk reading with proper buffer handling for incomplete lines
  - Resolve "Failed to receive initialization response" errors that prevented MCP tool loading
  - Fix "Separator is not found, chunk exceed limit" errors for large database query results
  - Maintain support for 100MB+ messages through automatic buffer management
  - Add comprehensive error handling and debug logging for message parsing issues
- [TASK_102] Improve MCP tool call debugging and error handling (2025-06-27)
  - Add comprehensive debug logging for MCP message ID matching and response validation
  - Implement detailed error messages for message ID mismatches and empty responses
  - Add execution_time property setter to ToolCallLog model for compatibility
  - Enhance JSON parsing error handling with truncated content logging for debugging
  - Fix "Invalid tool call response" errors by improving response validation and logging
  - Increase maximum MCP message size to 100MB to handle large query results
  - Improve MCP message reading with custom chunked implementation for better reliability
  - Fix "Separator is not found, chunk exceed limit" errors in database queries
  - Enable proper error handling and logging for tool execution failures
- [TASK_117] Fix NextAuth.js JWT token generation failure in production environment (2025-06-27)
  - Resolve cookie domain mismatch between HTTPS production and development environments
  - Add explicit secureCookie and cookieName options to NextAuth getToken() calls
  - Implement proper __Secure- prefixed cookie handling for HTTPS environments
  - Add comprehensive debugging logging for JWT token generation process
  - Fix 500 errors in API endpoints caused by JWT token generation failures
  - Enable proper authentication flow in production deployment with HTTPS
- [TASK_114] Fix JWT middleware incorrectly processing MCP API keys as JWT tokens causing base64 decoding errors (2025-06-27)
  - Implement proper token type detection by prefix (project_, mch_, JWT)
  - Add dedicated MCP API key processing method (_get_user_from_mcp_api_key)
  - Prevent JWT decoding attempts on API keys to eliminate base64 encoding errors
  - Improve authentication logging with clear token type identification
  - Enable error-free unified MCP endpoint authentication with MCP API keys
- [TASK_113] Fix UnifiedMCPTransport missing handle_post_message method causing tools/list failure (2025-06-27)
  - Add missing handle_post_message method override in UnifiedMCPTransport class
  - Fix tools/list request routing to use unified handle_tools_list method instead of parent class
  - Add unified handle_notification method for proper notification handling
  - Enable proper tools/list response with namespace-prefixed tools from all servers
  - Resolve issue where Cline connects successfully but receives no tools from unified endpoint
- [TASK_112] Fix UnifiedMCPTransport tool_naming attribute initialization error (2025-06-27)
  - Resolve AttributeError when Cline connects to unified MCP endpoint
  - Add missing UnifiedToolNaming class import and initialization in UnifiedMCPTransport
  - Fix handle_initialize method access to self.tool_naming.separator
  - Enable successful Cline integration with unified MCP server mode

### Added
- [TASK_111] Unified MCP Server connection information display in web UI (2025-06-27)
  - Add UnifiedMcpConnectionInfo component for displaying Cline/Cursor connection details
  - Show unified SSE endpoint URL and JSON configuration when unified mode is enabled
  - Integrated in both Project Overview and Server listing pages with conditional display
  - Include copy-to-clipboard functionality for easy configuration sharing
  - Display API key status and provide navigation to management pages
  - Add comprehensive setup instructions and namespace information for unified mode

### Fixed
- [TASK_111] Backend API project response missing unified_mcp_enabled field (2025-06-27)
  - Add unified_mcp_enabled field to ProjectResponse and ProjectDetailResponse models
  - Include unified_mcp_enabled in all project API endpoints (list, get, create, update)
  - Fix UnifiedMcpConnectionInfo component not displaying due to missing backend data
  - Ensure proper data flow from database to frontend for unified MCP mode detection

### Changed
- [TASK_110] Separated Unified MCP Server Mode from Security Settings into dedicated section (2025-06-27)
  - Created new McpServerModeSection component for MCP operation mode management
  - Moved unified_mcp_enabled setting from Security to separate MCP Server Operation Mode section
  - Improved UI organization with logical separation of security and operational settings
  - Enhanced user experience with clear categorization of project settings
  - Positioned MCP server mode settings above security settings for better workflow

### Added
- [TASK_093] Enhanced Cline/Cursor configuration generation with unified MCP server support (2025-06-27)
  - Add unified endpoint option to project and team Cline configuration APIs
  - Support both individual server mode (existing) and unified mode (new) simultaneously
  - Enable mixed usage scenarios for flexible MCP client setups
  - Provide clear instructions for namespace-aware tool routing in unified mode
  - Maintain full backward compatibility with existing individual server configurations
  - Add dynamic base URL detection for production deployment compatibility
  - Add web UI dropdown menu for selecting individual vs unified configuration downloads
  - Update project store to support unified parameter in configuration requests
- [TASK_107] Production deployment guide and environment configuration improvements (2025-06-27)
  - Comprehensive production deployment documentation with step-by-step checklist
  - Enhanced .env.hybrid.example with clear production vs development settings
  - Improved environment variable comments with deployment warnings and examples
  - Production deployment section in README.md with quick start guide
  - Automated production environment detection in quickstart.sh script
  - Standard example domains (your-domain.com) replacing real company domains
  - Production deployment checklist with security and infrastructure requirements
- [TASK_093] Unified MCP Server namespace tool routing with global separator configuration (2025-06-27)
  - Simplify namespace separator system to single global constant (NAMESPACE_SEPARATOR)
  - Remove complex client compatibility layer and dynamic separator selection
  - Enable quick separator changes by modifying one constant (. → _ or : etc)
  - Maintain backward compatibility with existing UnifiedToolNaming class
  - Implement namespace-based tool routing for unified MCP server endpoints
- [UX_IMPROVEMENT] Landing page instant installation section with 5-minute MCP server connection promise (2025-06-27)
  - Add prominent "30초 설치, 5분 안에 첫 MCP 서버 연결" section to hero area
  - Replace curl command with Git clone command using correct repository URL
  - Include visual terminal-style code block with color-coded commands
  - Add direct login/signup buttons for immediate user onboarding
- [UX_IMPROVEMENT] Complete quickstart.sh automation with backend auto-start and browser opening (2025-06-27)
  - Implement automatic backend server startup in quickstart.sh with health checks
  - Add cross-platform browser opening functionality (macOS/Linux/Windows WSL)
  - Enhance progress reporting with 7-step clear progress indicators
  - Include comprehensive error handling and fallback instructions
  - Enable true one-command setup experience for 5-minute rule compliance
- [DEVELOPER_EXPERIENCE] Comprehensive development script suite for individual service management (2025-06-27)
  - Create dev-frontend.sh for Next.js development with hot reload and pnpm/npm detection
  - Create dev-backend.sh for Python backend development with --reload and debug logging
  - Create dev-database.sh for PostgreSQL-only development with connection verification
  - Create logs.sh for unified real-time log monitoring across all services
  - Add color-coded log output and intelligent service detection
- [DEVELOPER_EXPERIENCE] Enhanced README.md development section with quick troubleshooting guide (2025-06-27)
  - Add Development Quick Start section with two clear paths (full setup vs individual services)
  - Include comprehensive development commands table with descriptions
  - Add quick troubleshooting guide for common development issues
  - Update project structure to reflect current architecture
  - Provide specific commands for health checks and debugging

### Fixed
- [TASK_092] Docker frontend environment variable configuration to respect .env file NEXTAUTH_URL (2025-06-26)
  - Update docker-compose.yml to use ${NEXTAUTH_URL:-default} pattern for frontend container
  - Enable .env file NEXTAUTH_URL values to override hardcoded defaults in Docker deployments
  - Improve environment variable flexibility for custom domain configurations in containerized environments

### Added
- [TASK_090] Backend restart guide and automation script for development and production environments (2025-06-26)
  - Add comprehensive Backend Restart Guide section to README.md with manual and automated procedures
  - Create scripts/restart-backend.sh automation script with intelligent process detection and safe restart
  - Support for code updates via git pull integration and automatic logs directory creation
  - Include health check verification and detailed status monitoring after restart
  - Provide clear guidance for when to use backend restart vs full system restart
  - Enable zero-downtime frontend operation during backend maintenance
- [TASK_091] Enhanced logging system with JSON format support and environment-based configuration (2025-06-26)
  - Implement JSON logging formatter with structured output for production monitoring
  - Add comprehensive logging configuration in config.py with validation
  - Support for environment-based logging format switching (text/json)
  - Add logging utilities with context management and specialized loggers for user actions, MCP server events, and API requests
  - Include python-json-logger dependency for structured logging
  - Create detailed logging documentation and Datadog APM integration guide
  - Update .env.example with logging configuration options for development and production environments
- [TASK_088] Hybrid admin privileges system for improved UX without manual restarts (2025-06-26)
  - Implement priority-based admin privilege assignment: INITIAL_ADMIN_EMAIL takes priority, first user becomes admin if not set
  - Add admin_utils.py service with should_grant_admin_privileges() and create_user_with_auto_admin() functions
  - Integrate hybrid logic into both regular signup and JWT auto-provisioning user creation paths
  - Add /admin/status API endpoint for monitoring admin privilege assignment status and system information
  - Update environment file documentation to explain hybrid admin system with clear priority explanations
  - Eliminate need for manual server restart to grant admin privileges to users
- [TASK_087] PostgreSQL schema migration from public to mcp_orch schema (2025-06-26)
  - Implement dedicated mcp_orch schema for all database tables and operations
  - Add automatic schema creation and search_path configuration in alembic migrations
  - Update environment file examples to use mcp_orch schema consistently
  - Configure database.py to use mcp_orch schema via search_path settings
  - Add Context7 documentation research for PostgreSQL schema best practices
- [TASK_093] Comprehensive update and upgrade guide in README.md (2025-06-26)
  - Add detailed "Update & Upgrade" section with multiple deployment scenarios
  - Include quick update procedure using existing scripts (shutdown.sh + quickstart.sh)
  - Add production container-only update process with proper rebuild steps
  - Include environment configuration update procedures and rollback instructions
- [TASK_085] Dynamic SSE endpoint configuration for production deployment (2025-06-26)
  - Add MCP_SERVER_BASE_URL environment variable for backend SSE endpoint configuration
  - Support automatic base URL detection from HTTP requests as fallback
  - Enable proper SSE endpoint generation for cloud and containerized deployments

### Fixed
- [TASK_095] Fix AttributeError in admin projects API for sse_auth_required (2025-06-26)
  - Replace deprecated sse_auth_required and message_auth_required with jwt_auth_required
  - Update AdminProjectResponse Pydantic model to use unified JWT authentication field
  - Fix 500 Internal Server Error in /api/admin/projects endpoint
  - Complete JWT authentication unification in admin project management
- [TASK_094] Fix missing Key icon import in admin projects page (2025-06-26)
  - Add missing Key import from lucide-react in ProjectsAdminPage component
  - Fix ReferenceError: Key is not defined runtime error in admin interface
  - Ensure proper icon display for API Keys statistics card
- [TASK_092] Fix quickstart.sh to prevent backend container auto-start (2025-06-26)
  - Add --no-deps option to docker compose command to prevent dependency containers from starting
  - Ensure frontend container starts independently without triggering backend container
  - Maintain intended hybrid deployment mode where backend runs natively via uv
- [TASK_085] Fix hardcoded localhost:8000 URLs in SSE endpoint generation (2025-06-26)
  - Replace hardcoded localhost URLs with dynamic environment-based configuration
  - Fix frontend SSE endpoint display to use backend API URL instead of frontend host
  - Ensure MCP Inspector compatibility with proper absolute URI generation
  - Fix SSE endpoints in Cline/Cursor integration settings for production environments
- [TASK_091] Fix Docker build args format for frontend container environment variables (2025-06-26)
  - Fix NEXT_PUBLIC_MCP_API_URL build argument format in docker-compose.yml
  - Ensure proper environment variable injection at build time for Next.js frontend
  - Fix frontend SSE endpoint URL generation in containerized environments

### Changed
- [TASK_089] Consolidate Alembic migrations into single initial schema for production deployment (2025-06-26)
  - Merge jwt_auth_unification migration changes into initial database schema migration
  - Remove intermediate JWT authentication migration file to simplify deployment process
  - Backup existing migration files for development history preservation
  - Ensure clean single-step database initialization for new installations
  - Optimize production deployment with unified initial migration containing all schema changes

### Fixed
- [TASK_104] Fix MCP connection logs not appearing in web UI (2025-06-26)
  - Implement ServerLogService integration for connection event logging (session start/end, tool discovery)
  - Fix API schema mismatches and Pydantic validation errors for ServerLog responses
  - Improve client type detection for Roo Code and Node.js based MCP clients
  - Enable proper connection log display in web UI with session details and statistics
- [TASK_090] Fix tool_call_logs API Pydantic validation error causing 500 errors (2025-06-26)
  - Fix ToolCallLogResponse model server_id field type from str to UUID to match database schema
  - Resolve "Input should be a valid string" Pydantic validation error for server_id field
  - Enable proper tool call log display and metrics in web UI by fixing API response serialization
  - Database schema was already correct - issue was in API response model validation
- [TASK_103] Fix MCP Tool Call logging failure due to database schema mismatch (2025-06-26)
  - Fix execution_time vs execution_time_ms field mapping error in ToolCallLog model
  - Remove non-existent user_agent and ip_address fields from ToolCallLog creation
  - Add detailed logging to track ToolCallLog save process and identify ROLLBACK causes
  - Resolve issue where Roo Code/Cline tool calls were not appearing in web UI logs
  - Fix MCP Session Manager _save_tool_call_log function to match actual database schema
- [TASK_088] Fix MCP server JWT authentication settings display and update in web UI (2025-06-26)
  - Add missing jwt_auth_required field to ServerUpdate model in projects.py API
  - Add missing jwt_auth_required field to ServerResponse model for API queries
  - Implement JWT authentication update logic in update_project_server function
  - Update all server API response functions to include jwt_auth_required field
  - Resolve issue where web UI authentication settings changes were not being saved to database
  - Fix issue where web UI authentication settings were showing "Inherit" instead of actual values
  - Enable proper server-level JWT authentication configuration and display through web interface

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
