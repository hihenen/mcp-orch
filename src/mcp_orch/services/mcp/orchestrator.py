"""
MCP Orchestrator

Unified facade that combines all MCP service components and provides 
backward compatibility with the original McpConnectionService interface.

This orchestrator implements the Facade pattern to:
- Maintain backward compatibility
- Provide a unified interface to all MCP services
- Enable gradual migration to individual services
- Simplify dependency injection

Facade for the original mcp_connection_service.py functionality.
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from uuid import UUID

# Conditional imports for optional dependencies
try:
    from sqlalchemy.orm import Session
except ImportError:
    Session = Any

from .connection_manager import McpConnectionManager, McpConnection
from .tool_executor import McpToolExecutor
from .status_checker import McpStatusChecker
from .config_manager import McpConfigManager
from .logger import McpLogger
from .error_handler import McpErrorHandler
from .interfaces import ToolExecutionError


logger = logging.getLogger(__name__)


class McpOrchestrator:
    """
    MCP Orchestrator - Unified Facade
    
    Provides a single entry point for all MCP operations while maintaining
    backward compatibility with the original McpConnectionService interface.
    
    This class orchestrates the individual service components:
    - Connection management
    - Tool execution
    - Status checking
    - Configuration management
    - Logging
    - Error handling
    """
    
    def __init__(
        self,
        connection_manager: Optional[McpConnectionManager] = None,
        tool_executor: Optional[McpToolExecutor] = None,
        status_checker: Optional[McpStatusChecker] = None,
        config_manager: Optional[McpConfigManager] = None,
        logger_service: Optional[McpLogger] = None,
        error_handler: Optional[McpErrorHandler] = None
    ):
        # Initialize service components (dependency injection pattern)
        self.error_handler = error_handler or McpErrorHandler()
        self.connection_manager = connection_manager or McpConnectionManager(self.error_handler)
        self.config_manager = config_manager or McpConfigManager()
        self.logger_service = logger_service or McpLogger()
        self.tool_executor = tool_executor or McpToolExecutor(self.connection_manager, self.error_handler)
        self.status_checker = status_checker or McpStatusChecker(self.connection_manager, self.error_handler)
        
        # For backward compatibility - maintain active connections reference
        self.active_connections: Dict[str, Any] = {}
        
        logger.info("🎭 MCP Orchestrator initialized with refactored service components")
    
    # =============================================================================
    # BACKWARD COMPATIBILITY METHODS (Original McpConnectionService interface)
    # =============================================================================
    
    def _save_connection_log(
        self, 
        db: Session, 
        server_id: str, 
        project_id: str,
        level, 
        category, 
        message: str, 
        details: Optional[str] = None
    ) -> None:
        """
        BACKWARD COMPATIBILITY: Original _save_connection_log method
        Delegates to the new logger service
        """
        asyncio.create_task(
            self.logger_service.log_connection_event(
                db, server_id, project_id, level, category, message, details
            )
        )
    
    async def check_server_status(self, server_id: str, server_config: Dict) -> str:
        """
        BACKWARD COMPATIBILITY: Original check_server_status method
        Delegates to status checker
        """
        try:
            return await self.status_checker.check_server_status(server_id, server_config)
        except Exception as e:
            logger.error(f"Error in check_server_status: {e}")
            return "error"
    
    async def _test_mcp_connection(self, server_config: Dict) -> bool:
        """
        BACKWARD COMPATIBILITY: Original _test_mcp_connection method
        Delegates to connection manager
        """
        try:
            return await self.connection_manager.test_connection(server_config)
        except Exception as e:
            logger.error(f"Error in _test_mcp_connection: {e}")
            return False
    
    async def get_server_tools(
        self, 
        server_id: str, 
        server_config: Dict, 
        db: Optional[Session] = None, 
        project_id: Optional[str] = None
    ) -> List[Dict]:
        """
        BACKWARD COMPATIBILITY: Original get_server_tools method
        Delegates to session manager (for now) but can be gradually migrated
        """
        try:
            logger.info(f"🔧 Getting tools for server {server_id}")
            
            if not server_config.get('is_enabled', True):
                logger.info("⚠️ Server is disabled, returning empty tools")
                return []
            
            # For now, delegate to session manager to maintain compatibility
            # TODO: Gradually migrate this to use tool_executor + connection_manager
            from ..mcp_session_manager import get_session_manager
            
            session_manager = await get_session_manager()
            return await session_manager.get_server_tools(server_id, server_config)
                
        except Exception as e:
            logger.error(f"❌ Error getting tools for server {server_id}: {e}")
            return []
    
    async def call_tool(
        self,
        server_id: str,
        server_config: Dict,
        tool_name: str,
        arguments: Dict,
        db: Optional[Session] = None,
        project_id: Optional[str] = None,
        user_id: Optional[str] = None,
        execution_id: Optional[str] = None
    ) -> Any:
        """
        BACKWARD COMPATIBILITY: Original call_tool method
        Enhanced with new service components
        """
        try:
            logger.info(f"🔧 Executing tool {tool_name} via orchestrator")
            
            # Validate server configuration
            if not await self.status_checker.validate_server_config(server_config):
                raise ToolExecutionError(
                    f"Invalid server configuration for {server_id}",
                    "INVALID_CONFIG"
                )
            
            # Get or create connection
            connection = await self.connection_manager.connect(server_config)
            
            # Execute tool using new tool executor
            result = await self.tool_executor.execute_tool(
                connection, tool_name, arguments, db, project_id, server_id
            )
            
            return result
            
        except ToolExecutionError:
            # Re-raise tool execution errors as-is
            raise
        except Exception as e:
            error_msg = f"Unexpected error in call_tool: {e}"
            logger.error(error_msg)
            raise ToolExecutionError(error_msg, "ORCHESTRATOR_ERROR", {"original_error": str(e)})
    
    async def refresh_all_servers(self, db: Session) -> Dict[str, Dict]:
        """
        BACKWARD COMPATIBILITY: Original refresh_all_servers method
        Enhanced with new service components
        """
        try:
            logger.info("🔄 Refreshing all servers via orchestrator")
            
            # Get all servers from database
            from ...models import McpServer
            servers = db.query(McpServer).all()
            
            results = {}
            
            for db_server in servers:
                try:
                    # Build configuration using config manager
                    server_config = self.config_manager.build_config_from_db(db_server)
                    server_id = self.config_manager.generate_unique_server_id(db_server)
                    
                    # Check status using status checker
                    status = await self.status_checker.check_server_status(server_id, server_config)
                    
                    # Get health information
                    health = await self.status_checker.get_server_health(server_id, server_config)
                    
                    results[server_id] = {
                        "status": status,
                        "health": health,
                        "config": server_config,
                        "timestamp": datetime.now().isoformat()
                    }
                    
                    # Log status if changed
                    if db and hasattr(db_server, 'last_status') and db_server.last_status != status:
                        await self.logger_service.log_server_status_change(
                            db, server_id, str(db_server.project_id),
                            db_server.last_status or "unknown", status
                        )
                    
                except Exception as e:
                    logger.error(f"Error refreshing server {db_server.id}: {e}")
                    results[str(db_server.id)] = {
                        "status": "error",
                        "error": str(e),
                        "timestamp": datetime.now().isoformat()
                    }
            
            logger.info(f"✅ Refreshed {len(results)} servers")
            return results
            
        except Exception as e:
            logger.error(f"Error in refresh_all_servers: {e}")
            return {}
    
    def _generate_unique_server_id(self, db_server) -> str:
        """
        BACKWARD COMPATIBILITY: Original _generate_unique_server_id method
        Delegates to config manager
        """
        return self.config_manager.generate_unique_server_id(db_server)
    
    def _build_server_config_from_db(self, db_server) -> Dict:
        """
        BACKWARD COMPATIBILITY: Original _build_server_config_from_db method
        Delegates to config manager
        """
        return self.config_manager.build_config_from_db(db_server)
    
    async def get_server_tools_count(self, server_id: str, server_config: Dict) -> int:
        """
        BACKWARD COMPATIBILITY: Original get_server_tools_count method
        Enhanced with new service components
        """
        try:
            tools = await self.get_server_tools(server_id, server_config)
            return len(tools)
        except Exception as e:
            logger.error(f"Error getting tools count for server {server_id}: {e}")
            return 0
    
    def _extract_meaningful_error(self, stderr_text: str) -> str:
        """
        BACKWARD COMPATIBILITY: Original _extract_meaningful_error method
        Delegates to error handler
        """
        return self.error_handler.extract_meaningful_error(stderr_text)
    
    # =============================================================================
    # NEW ENHANCED METHODS (Extended functionality)
    # =============================================================================
    
    async def get_orchestrator_health(self) -> Dict[str, Any]:
        """
        Get overall health status of the MCP orchestrator and its components
        
        Returns:
            Dict: Health status information
        """
        try:
            health = {
                "orchestrator": "healthy",
                "components": {},
                "timestamp": datetime.now().isoformat()
            }
            
            # Check connection manager
            try:
                connection_count = len(self.connection_manager.active_connections)
                health["components"]["connection_manager"] = {
                    "status": "healthy",
                    "active_connections": connection_count
                }
            except Exception as e:
                health["components"]["connection_manager"] = {
                    "status": "error",
                    "error": str(e)
                }
            
            # Check status checker cache
            try:
                cache_stats = self.status_checker.get_cache_stats()
                health["components"]["status_checker"] = {
                    "status": "healthy",
                    "cache_stats": cache_stats
                }
            except Exception as e:
                health["components"]["status_checker"] = {
                    "status": "error", 
                    "error": str(e)
                }
            
            # Overall health assessment
            component_statuses = [comp.get("status") for comp in health["components"].values()]
            if any(status == "error" for status in component_statuses):
                health["orchestrator"] = "degraded"
            
            return health
            
        except Exception as e:
            logger.error(f"Error getting orchestrator health: {e}")
            return {
                "orchestrator": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def shutdown(self) -> None:
        """
        Graceful shutdown of orchestrator and all components
        """
        try:
            logger.info("🛑 Shutting down MCP Orchestrator")
            
            # Cleanup all connections
            await self.connection_manager.cleanup_all_connections()
            
            # Clear status cache
            self.status_checker.clear_cache()
            
            logger.info("✅ MCP Orchestrator shutdown complete")
            
        except Exception as e:
            logger.error(f"Error during orchestrator shutdown: {e}")


# =============================================================================
# BACKWARD COMPATIBILITY FACADE
# =============================================================================

class McpConnectionService(McpOrchestrator):
    """
    BACKWARD COMPATIBILITY: Original McpConnectionService class name
    
    This class maintains the exact same interface as the original
    McpConnectionService but uses the new refactored components internally.
    
    Existing code can continue to use:
    from ..services.mcp_connection_service import McpConnectionService
    
    And it will automatically get the new refactored implementation.
    """
    
    def __init__(self):
        super().__init__()
        logger.info("🔄 McpConnectionService compatibility layer initialized")


# Global instance for backward compatibility
mcp_orchestrator = McpOrchestrator()

# For complete backward compatibility, create global instance with old name
mcp_connection_service = McpConnectionService()