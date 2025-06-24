# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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