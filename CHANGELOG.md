# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- [TASK_048] Remove unnecessary compatibility_mode field from JSON settings
  - Remove compatibility_mode field from server creation and update APIs
  - Simplify Cline configuration generation to single Resource Connection mode
  - Clean up database model default to use resource_connection consistently
  - Eliminate conditional logic for compatibility mode selection
- [TASK_047] CHANGELOG workflow integration to commit process
  - Mandatory CHANGELOG.md updates before every functional unit commit
  - Pre-commit checklist enforcement with documentation requirements
  - Comprehensive CHANGELOG documentation standards and categories
  - Integration with existing Git commit enforcement system
  - Zero-tolerance policy for documentation debt
- [TASK_046] Comprehensive project CHANGELOG.md
  - Keep a Changelog standard format implementation
  - Semantic versioning integration with clear version categorization
  - TASK reference system linking changes to workflow documentation
  - English documentation with usage guidelines
- [TASK_045] Environment variable configuration support for MCP Session Manager
  - `MCP_SESSION_TIMEOUT_MINUTES` - Configure session timeout (default: 30 minutes)
  - `MCP_SESSION_CLEANUP_INTERVAL_MINUTES` - Configure cleanup interval (default: 5 minutes)
  - English documentation and comprehensive comments
  - Updated `.env.example` with MCP session configuration

## [0.2.0] - 2025-01-23

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

## [0.1.0] - 2025-01-20

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