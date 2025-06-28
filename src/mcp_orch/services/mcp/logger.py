"""
MCP Logger

Responsible for MCP-specific logging operations:
- Connection event logging
- Tool execution logging
- Server status change logging
- Structured logging with proper categorization

Extracted from mcp_connection_service.py to follow Single Responsibility Principle.
"""

import json
import logging
from typing import Dict, Optional, Any
from datetime import datetime
from uuid import UUID

# Conditional imports for optional dependencies
try:
    from sqlalchemy.orm import Session
except ImportError:
    Session = Any

from .interfaces import IMcpLogger

try:
    from ...models import ServerLog, ToolCallLog, LogLevel, LogCategory, CallStatus
except ImportError:
    # Fallback for testing environments
    ServerLog = Any
    ToolCallLog = Any
    LogLevel = Any
    LogCategory = Any
    CallStatus = Any


logger = logging.getLogger(__name__)


class McpLogger(IMcpLogger):
    """
    MCP Logger Implementation
    
    Handles all MCP-related logging with proper categorization and structure.
    """
    
    def __init__(self):
        self.source_name = "mcp_logger"
        
    async def log_connection_event(
        self,
        db: Session,
        server_id: str,
        project_id: str,
        level: LogLevel,
        category: LogCategory,
        message: str,
        details: Optional[str] = None
    ) -> None:
        """
        Log connection-related events
        
        Args:
            db: Database session
            server_id: Server identifier
            project_id: Project identifier
            level: Log level
            category: Log category
            message: Log message
            details: Additional details (optional)
        """
        try:
            log_entry = ServerLog(
                server_id=UUID(server_id),
                project_id=UUID(project_id),
                level=level,
                category=category,
                message=message,
                details=details,
                source=self.source_name
            )
            
            db.add(log_entry)
            db.commit()
            
            # Also log to application logger
            log_level = self._map_log_level_to_python(level)
            logger.log(log_level, f"[{server_id}] {message}")
            
        except Exception as e:
            logger.error(f"Failed to log connection event: {e}")
            db.rollback()
    
    async def log_tool_execution(
        self,
        db: Session,
        server_id: str,
        project_id: str,
        tool_name: str,
        execution_time: float,
        success: bool,
        error_message: Optional[str] = None,
        details: Optional[Dict] = None
    ) -> None:
        """
        Log tool execution events
        
        Args:
            db: Database session
            server_id: Server identifier
            project_id: Project identifier
            tool_name: Name of executed tool
            execution_time: Execution time in seconds
            success: Whether execution was successful
            error_message: Error message if failed
            details: Additional execution details
        """
        try:
            # Create tool call log
            tool_log = ToolCallLog(
                server_id=UUID(server_id),
                project_id=UUID(project_id),
                tool_name=tool_name,
                input_data=details.get("arguments", {}) if details else {},
                output_data=details.get("result") if success and details else None,
                status=CallStatus.SUCCESS if success else CallStatus.FAILED,
                execution_time=execution_time,
                error_message=error_message
            )
            
            db.add(tool_log)
            
            # Create server log
            log_message = f"Tool '{tool_name}' {'succeeded' if success else 'failed'}"
            if execution_time:
                log_message += f" in {execution_time:.3f}s"
            
            log_details = {
                "tool_name": tool_name,
                "execution_time": execution_time,
                "success": success
            }
            
            if error_message:
                log_details["error"] = error_message
            
            if details:
                log_details.update(details)
            
            server_log = ServerLog(
                server_id=UUID(server_id),
                project_id=UUID(project_id),
                level=LogLevel.INFO if success else LogLevel.ERROR,
                category=LogCategory.TOOL_EXECUTION,
                message=log_message,
                details=json.dumps(log_details),
                source=self.source_name
            )
            
            db.add(server_log)
            db.commit()
            
            # Application logging
            log_level = logging.INFO if success else logging.ERROR
            logger.log(log_level, f"[{server_id}] {log_message}")
            
        except Exception as e:
            logger.error(f"Failed to log tool execution: {e}")
            db.rollback()
    
    async def log_server_status_change(
        self,
        db: Session,
        server_id: str,
        project_id: str,
        old_status: str,
        new_status: str,
        details: Optional[str] = None
    ) -> None:
        """
        Log server status changes
        
        Args:
            db: Database session
            server_id: Server identifier
            project_id: Project identifier
            old_status: Previous status
            new_status: New status
            details: Additional details about the change
        """
        try:
            message = f"Server status changed: {old_status} → {new_status}"
            
            # Determine log level based on status change
            level = self._determine_status_change_level(old_status, new_status)
            
            log_details = {
                "old_status": old_status,
                "new_status": new_status,
                "timestamp": datetime.now().isoformat()
            }
            
            if details:
                log_details["details"] = details
            
            log_entry = ServerLog(
                server_id=UUID(server_id),
                project_id=UUID(project_id),
                level=level,
                category=LogCategory.SERVER_STATUS,
                message=message,
                details=json.dumps(log_details),
                source=self.source_name
            )
            
            db.add(log_entry)
            db.commit()
            
            # Application logging
            log_level = self._map_log_level_to_python(level)
            logger.log(log_level, f"[{server_id}] {message}")
            
        except Exception as e:
            logger.error(f"Failed to log status change: {e}")
            db.rollback()
    
    async def log_configuration_change(
        self,
        db: Session,
        server_id: str,
        project_id: str,
        change_type: str,
        old_config: Optional[Dict] = None,
        new_config: Optional[Dict] = None,
        user_id: Optional[str] = None
    ) -> None:
        """
        Log configuration changes
        
        Args:
            db: Database session
            server_id: Server identifier
            project_id: Project identifier
            change_type: Type of change (create, update, delete)
            old_config: Previous configuration
            new_config: New configuration
            user_id: User who made the change
        """
        try:
            message = f"Server configuration {change_type}"
            
            log_details = {
                "change_type": change_type,
                "timestamp": datetime.now().isoformat()
            }
            
            if user_id:
                log_details["user_id"] = user_id
            
            if old_config:
                log_details["old_config"] = old_config
            
            if new_config:
                log_details["new_config"] = new_config
            
            # Calculate configuration diff for updates
            if change_type == "update" and old_config and new_config:
                log_details["changes"] = self._calculate_config_diff(old_config, new_config)
            
            log_entry = ServerLog(
                server_id=UUID(server_id),
                project_id=UUID(project_id),
                level=LogLevel.INFO,
                category=LogCategory.CONFIGURATION,
                message=message,
                details=json.dumps(log_details, default=str),
                source=self.source_name
            )
            
            db.add(log_entry)
            db.commit()
            
            logger.info(f"[{server_id}] {message}")
            
        except Exception as e:
            logger.error(f"Failed to log configuration change: {e}")
            db.rollback()
    
    async def log_performance_metrics(
        self,
        db: Session,
        server_id: str,
        project_id: str,
        metrics: Dict[str, Any]
    ) -> None:
        """
        Log performance metrics
        
        Args:
            db: Database session
            server_id: Server identifier
            project_id: Project identifier
            metrics: Performance metrics dictionary
        """
        try:
            message = "Performance metrics recorded"
            
            log_details = {
                "metrics": metrics,
                "timestamp": datetime.now().isoformat()
            }
            
            log_entry = ServerLog(
                server_id=UUID(server_id),
                project_id=UUID(project_id),
                level=LogLevel.DEBUG,
                category=LogCategory.PERFORMANCE,
                message=message,
                details=json.dumps(log_details),
                source=self.source_name
            )
            
            db.add(log_entry)
            db.commit()
            
            logger.debug(f"[{server_id}] {message}: {metrics}")
            
        except Exception as e:
            logger.error(f"Failed to log performance metrics: {e}")
            db.rollback()
    
    def _map_log_level_to_python(self, level: LogLevel) -> int:
        """Map LogLevel enum to Python logging level"""
        mapping = {
            LogLevel.DEBUG: logging.DEBUG,
            LogLevel.INFO: logging.INFO,
            LogLevel.WARNING: logging.WARNING,
            LogLevel.ERROR: logging.ERROR,
        }
        return mapping.get(level, logging.INFO)
    
    def _determine_status_change_level(self, old_status: str, new_status: str) -> LogLevel:
        """Determine appropriate log level for status change"""
        # Status change severity mapping
        status_severity = {
            "online": 0,
            "offline": 1,
            "error": 2,
            "disabled": 0
        }
        
        old_severity = status_severity.get(old_status, 1)
        new_severity = status_severity.get(new_status, 1)
        
        if new_severity > old_severity:
            # Status got worse
            return LogLevel.WARNING if new_severity == 1 else LogLevel.ERROR
        elif new_severity < old_severity:
            # Status improved
            return LogLevel.INFO
        else:
            # Same severity level
            return LogLevel.INFO
    
    def _calculate_config_diff(self, old_config: Dict, new_config: Dict) -> Dict:
        """Calculate differences between configurations"""
        changes = {
            "added": {},
            "modified": {},
            "removed": {}
        }
        
        # Find added and modified keys
        for key, new_value in new_config.items():
            if key not in old_config:
                changes["added"][key] = new_value
            elif old_config[key] != new_value:
                changes["modified"][key] = {
                    "old": old_config[key],
                    "new": new_value
                }
        
        # Find removed keys
        for key, old_value in old_config.items():
            if key not in new_config:
                changes["removed"][key] = old_value
        
        return changes
    
    async def get_log_statistics(
        self,
        db: Session,
        server_id: Optional[str] = None,
        project_id: Optional[str] = None,
        hours: int = 24
    ) -> Dict[str, Any]:
        """
        Get logging statistics for monitoring
        
        Args:
            db: Database session
            server_id: Server to filter by (optional)
            project_id: Project to filter by (optional)
            hours: Number of hours to look back
            
        Returns:
            Dict: Logging statistics
        """
        try:
            from datetime import timedelta
            cutoff_time = datetime.now() - timedelta(hours=hours)
            
            # Build query
            query = db.query(ServerLog).filter(ServerLog.created_at >= cutoff_time)
            
            if server_id:
                query = query.filter(ServerLog.server_id == UUID(server_id))
            
            if project_id:
                query = query.filter(ServerLog.project_id == UUID(project_id))
            
            logs = query.all()
            
            # Calculate statistics
            stats = {
                "total_logs": len(logs),
                "by_level": {},
                "by_category": {},
                "error_rate": 0,
                "most_active_servers": {},
                "time_range": {
                    "start": cutoff_time.isoformat(),
                    "end": datetime.now().isoformat(),
                    "hours": hours
                }
            }
            
            error_count = 0
            for log in logs:
                # Count by level
                level = log.level.value if hasattr(log.level, 'value') else str(log.level)
                stats["by_level"][level] = stats["by_level"].get(level, 0) + 1
                
                # Count by category
                category = log.category.value if hasattr(log.category, 'value') else str(log.category)
                stats["by_category"][category] = stats["by_category"].get(category, 0) + 1
                
                # Count errors
                if log.level == LogLevel.ERROR:
                    error_count += 1
                
                # Count by server
                server_str = str(log.server_id)
                stats["most_active_servers"][server_str] = stats["most_active_servers"].get(server_str, 0) + 1
            
            # Calculate error rate
            stats["error_rate"] = error_count / max(len(logs), 1)
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting log statistics: {e}")
            return {
                "error": str(e),
                "total_logs": 0,
                "by_level": {},
                "by_category": {},
                "error_rate": 0
            }