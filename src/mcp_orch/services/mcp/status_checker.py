"""
MCP Status Checker

Responsible for monitoring and checking MCP server status:
- Real-time server status verification
- Health monitoring and diagnostics
- Configuration validation
- Server availability assessment

Extracted from mcp_connection_service.py to follow Single Responsibility Principle.
"""

import asyncio
import logging
from typing import Dict, Optional, Any
from datetime import datetime, timedelta

from .interfaces import IMcpStatusChecker
from .connection_manager import McpConnectionManager
from .error_handler import McpErrorHandler


logger = logging.getLogger(__name__)


class McpStatusChecker(IMcpStatusChecker):
    """
    MCP Status Checker Implementation
    
    Monitors MCP server status and health with caching and intelligent checking.
    """
    
    def __init__(
        self, 
        connection_manager: Optional[McpConnectionManager] = None,
        error_handler: Optional[McpErrorHandler] = None
    ):
        self.connection_manager = connection_manager or McpConnectionManager()
        self.error_handler = error_handler or McpErrorHandler()
        
        # Status caching to avoid excessive checks
        self.status_cache: Dict[str, Dict] = {}
        self.cache_duration = timedelta(seconds=30)  # Cache status for 30 seconds
        
    async def check_server_status(self, server_id: str, server_config: Dict) -> str:
        """
        Check real-time status of MCP server
        
        Args:
            server_id: Unique identifier for the server
            server_config: Server configuration dictionary
            
        Returns:
            str: Server status (online, offline, disabled, error)
        """
        try:
            # Check if server is disabled
            if not server_config.get('is_enabled', True):
                return "disabled"
            
            # Check cache first
            cached_status = self._get_cached_status(server_id)
            if cached_status:
                logger.debug(f"📋 Using cached status for server {server_id}: {cached_status}")
                return cached_status
            
            # Perform actual status check
            logger.debug(f"🔍 Checking real-time status for server {server_id}")
            
            # Test connection to determine status
            is_online = await self.connection_manager.test_connection(server_config)
            
            if is_online:
                status = "online"
                logger.debug(f"✅ Server {server_id} is online")
            else:
                status = "offline"
                logger.debug(f"❌ Server {server_id} is offline")
            
            # Cache the result
            self._cache_status(server_id, status)
            
            return status
            
        except Exception as e:
            logger.error(f"Error checking server {server_id} status: {e}")
            
            # Cache error status briefly to avoid spam
            self._cache_status(server_id, "error", cache_duration=timedelta(seconds=10))
            
            return "error"
    
    async def validate_server_config(self, server_config: Dict) -> bool:
        """
        Validate server configuration
        
        Args:
            server_config: Server configuration to validate
            
        Returns:
            bool: True if configuration is valid
        """
        try:
            # Required fields
            required_fields = ['command']
            for field in required_fields:
                if not server_config.get(field):
                    logger.warning(f"❌ Missing required field: {field}")
                    return False
            
            # Validate command exists and is executable
            command = server_config.get('command', '')
            if not command:
                logger.warning("❌ Empty command specified")
                return False
            
            # Validate arguments if present
            args = server_config.get('args', [])
            if args and not isinstance(args, list):
                logger.warning("❌ Arguments must be a list")
                return False
            
            # Validate environment if present
            env = server_config.get('env', {})
            if env and not isinstance(env, dict):
                logger.warning("❌ Environment must be a dictionary")
                return False
            
            # Validate timeout if present
            timeout = server_config.get('timeout')
            if timeout is not None:
                try:
                    timeout_val = float(timeout)
                    if timeout_val <= 0:
                        logger.warning("❌ Timeout must be positive")
                        return False
                except (ValueError, TypeError):
                    logger.warning("❌ Invalid timeout value")
                    return False
            
            logger.debug("✅ Server configuration validation passed")
            return True
            
        except Exception as e:
            logger.error(f"Error validating server config: {e}")
            return False
    
    async def get_server_health(self, server_id: str, server_config: Dict) -> Dict:
        """
        Get detailed health information for server
        
        Args:
            server_id: Unique identifier for the server
            server_config: Server configuration dictionary
            
        Returns:
            Dict: Detailed health information
        """
        try:
            health_info = {
                "server_id": server_id,
                "timestamp": datetime.now().isoformat(),
                "status": "unknown",
                "checks": {}
            }
            
            # Basic status check
            try:
                status = await self.check_server_status(server_id, server_config)
                health_info["status"] = status
                health_info["checks"]["status_check"] = {
                    "passed": status in ["online", "disabled"],
                    "result": status
                }
            except Exception as e:
                health_info["checks"]["status_check"] = {
                    "passed": False,
                    "error": str(e)
                }
            
            # Configuration validation
            try:
                config_valid = await self.validate_server_config(server_config)
                health_info["checks"]["config_validation"] = {
                    "passed": config_valid,
                    "result": "valid" if config_valid else "invalid"
                }
            except Exception as e:
                health_info["checks"]["config_validation"] = {
                    "passed": False,
                    "error": str(e)
                }
            
            # Connection test (if not disabled)
            if server_config.get('is_enabled', True):
                try:
                    connection_test = await self.connection_manager.test_connection(server_config)
                    health_info["checks"]["connection_test"] = {
                        "passed": connection_test,
                        "result": "success" if connection_test else "failed"
                    }
                except Exception as e:
                    health_info["checks"]["connection_test"] = {
                        "passed": False,
                        "error": str(e)
                    }
            else:
                health_info["checks"]["connection_test"] = {
                    "passed": True,
                    "result": "skipped (server disabled)"
                }
            
            # Overall health assessment
            all_checks_passed = all(
                check.get("passed", False) 
                for check in health_info["checks"].values()
            )
            
            health_info["healthy"] = all_checks_passed
            health_info["summary"] = "All checks passed" if all_checks_passed else "Some checks failed"
            
            return health_info
            
        except Exception as e:
            logger.error(f"Error getting health info for server {server_id}: {e}")
            return {
                "server_id": server_id,
                "timestamp": datetime.now().isoformat(),
                "status": "error",
                "healthy": False,
                "error": str(e),
                "checks": {}
            }
    
    def _get_cached_status(self, server_id: str) -> Optional[str]:
        """Get cached status if still valid"""
        if server_id in self.status_cache:
            cache_entry = self.status_cache[server_id]
            if datetime.now() - cache_entry["timestamp"] < cache_entry["duration"]:
                return cache_entry["status"]
            else:
                # Cache expired, remove it
                del self.status_cache[server_id]
        return None
    
    def _cache_status(self, server_id: str, status: str, cache_duration: Optional[timedelta] = None) -> None:
        """Cache server status with timestamp"""
        duration = cache_duration or self.cache_duration
        self.status_cache[server_id] = {
            "status": status,
            "timestamp": datetime.now(),
            "duration": duration
        }
    
    def clear_cache(self, server_id: Optional[str] = None) -> None:
        """
        Clear status cache
        
        Args:
            server_id: Specific server to clear cache for, or None to clear all
        """
        if server_id:
            self.status_cache.pop(server_id, None)
            logger.debug(f"🧹 Cleared status cache for server {server_id}")
        else:
            self.status_cache.clear()
            logger.debug("🧹 Cleared all status cache")
    
    def get_cache_stats(self) -> Dict:
        """Get cache statistics for monitoring"""
        now = datetime.now()
        valid_entries = 0
        expired_entries = 0
        
        for cache_entry in self.status_cache.values():
            if now - cache_entry["timestamp"] < cache_entry["duration"]:
                valid_entries += 1
            else:
                expired_entries += 1
        
        return {
            "total_entries": len(self.status_cache),
            "valid_entries": valid_entries,
            "expired_entries": expired_entries,
            "cache_hit_ratio": valid_entries / max(len(self.status_cache), 1)
        }