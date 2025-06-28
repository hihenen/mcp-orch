"""
MCP Configuration Manager

Responsible for MCP server configuration management:
- Building configuration from database models
- Configuration validation and normalization
- Environment variable integration
- Server ID generation and management

Extracted from mcp_connection_service.py to follow Single Responsibility Principle.
"""

import os
import logging
from typing import Dict, Optional, Any, List
from uuid import UUID

from .interfaces import IMcpConfigManager


logger = logging.getLogger(__name__)


class McpConfigManager(IMcpConfigManager):
    """
    MCP Configuration Manager Implementation
    
    Handles all aspects of MCP server configuration management.
    """
    
    def __init__(self):
        # Default configuration values
        self.default_timeout = 30
        self.default_env = {}
        
    def build_config_from_db(self, db_server) -> Dict:
        """
        Build server configuration from database model
        
        Args:
            db_server: Database server model object
            
        Returns:
            Dict: Complete server configuration
        """
        try:
            # Extract basic configuration
            config = {
                "id": str(db_server.id),
                "name": db_server.name,
                "command": db_server.command,
                "args": db_server.args or [],
                "env": db_server.env or {},
                "timeout": db_server.timeout or self.default_timeout,
                "is_enabled": db_server.is_enabled,
                "project_id": str(db_server.project_id)
            }
            
            # Add optional fields if present
            if hasattr(db_server, 'description') and db_server.description:
                config["description"] = db_server.description
            
            if hasattr(db_server, 'tags') and db_server.tags:
                config["tags"] = db_server.tags
            
            if hasattr(db_server, 'created_at'):
                config["created_at"] = db_server.created_at.isoformat() if db_server.created_at else None
            
            if hasattr(db_server, 'updated_at'):
                config["updated_at"] = db_server.updated_at.isoformat() if db_server.updated_at else None
            
            # Validate and normalize the configuration
            normalized_config = self.validate_config(config)
            
            logger.debug(f"✅ Built configuration for server {config['name']}")
            return normalized_config
            
        except Exception as e:
            logger.error(f"Error building config from DB server: {e}")
            raise ValueError(f"Failed to build server configuration: {e}")
    
    def generate_unique_server_id(self, db_server) -> str:
        """
        Generate unique server ID for project scope
        
        Args:
            db_server: Database server model object
            
        Returns:
            str: Unique server ID within project scope
        """
        try:
            # Format: project_id:server_id for uniqueness across projects
            project_id = str(db_server.project_id)
            server_id = str(db_server.id)
            
            unique_id = f"{project_id}:{server_id}"
            
            logger.debug(f"Generated unique server ID: {unique_id}")
            return unique_id
            
        except Exception as e:
            logger.error(f"Error generating unique server ID: {e}")
            # Fallback to just server ID
            return str(db_server.id)
    
    def validate_config(self, config: Dict) -> Dict:
        """
        Validate and normalize configuration
        
        Args:
            config: Configuration dictionary to validate
            
        Returns:
            Dict: Validated and normalized configuration
        """
        try:
            # Create a copy to avoid modifying original
            validated_config = config.copy()
            
            # Validate required fields
            required_fields = ["command"]
            for field in required_fields:
                if not validated_config.get(field):
                    raise ValueError(f"Missing required field: {field}")
            
            # Normalize command
            command = validated_config["command"].strip()
            if not command:
                raise ValueError("Command cannot be empty")
            validated_config["command"] = command
            
            # Normalize arguments
            args = validated_config.get("args", [])
            if not isinstance(args, list):
                if isinstance(args, str):
                    # Split string arguments
                    args = args.split() if args.strip() else []
                else:
                    args = []
            validated_config["args"] = args
            
            # Normalize environment
            env = validated_config.get("env", {})
            if not isinstance(env, dict):
                logger.warning("Environment must be a dictionary, using default")
                env = {}
            validated_config["env"] = env
            
            # Validate and normalize timeout
            timeout = validated_config.get("timeout", self.default_timeout)
            try:
                timeout = max(1, int(timeout))  # Minimum 1 second
            except (ValueError, TypeError):
                logger.warning(f"Invalid timeout value, using default: {self.default_timeout}")
                timeout = self.default_timeout
            validated_config["timeout"] = timeout
            
            # Normalize enabled flag
            is_enabled = validated_config.get("is_enabled", True)
            validated_config["is_enabled"] = bool(is_enabled)
            
            # Ensure ID is present
            if "id" not in validated_config:
                validated_config["id"] = "unknown"
            
            # Ensure name is present
            if "name" not in validated_config:
                validated_config["name"] = f"Server {validated_config['id']}"
            
            logger.debug(f"✅ Validated configuration for {validated_config['name']}")
            return validated_config
            
        except Exception as e:
            logger.error(f"Configuration validation failed: {e}")
            raise ValueError(f"Invalid configuration: {e}")
    
    def merge_environment_config(self, base_config: Dict, env_config: Dict) -> Dict:
        """
        Merge base configuration with environment-specific settings
        
        Args:
            base_config: Base configuration dictionary
            env_config: Environment-specific configuration
            
        Returns:
            Dict: Merged configuration
        """
        try:
            # Create a deep copy of base config
            merged_config = base_config.copy()
            
            # Merge environment variables
            base_env = merged_config.get("env", {})
            env_overrides = env_config.get("env", {})
            merged_env = {**base_env, **env_overrides}
            merged_config["env"] = merged_env
            
            # Merge other settings (env_config takes precedence)
            merge_fields = ["timeout", "is_enabled", "args"]
            for field in merge_fields:
                if field in env_config:
                    merged_config[field] = env_config[field]
            
            # Re-validate merged configuration
            validated_config = self.validate_config(merged_config)
            
            logger.debug(f"✅ Merged environment config for {merged_config.get('name', 'unknown')}")
            return validated_config
            
        except Exception as e:
            logger.error(f"Error merging environment config: {e}")
            raise ValueError(f"Failed to merge configuration: {e}")
    
    def get_runtime_config(self, base_config: Dict) -> Dict:
        """
        Get configuration with runtime environment variables applied
        
        Args:
            base_config: Base configuration dictionary
            
        Returns:
            Dict: Configuration with runtime environment applied
        """
        try:
            runtime_config = base_config.copy()
            
            # Apply runtime environment variables
            runtime_env = self._get_runtime_environment_overrides(base_config)
            if runtime_env:
                current_env = runtime_config.get("env", {})
                runtime_config["env"] = {**current_env, **runtime_env}
            
            # Apply runtime timeout override
            runtime_timeout = os.getenv("MCP_DEFAULT_TIMEOUT")
            if runtime_timeout:
                try:
                    runtime_config["timeout"] = max(1, int(runtime_timeout))
                except (ValueError, TypeError):
                    logger.warning(f"Invalid MCP_DEFAULT_TIMEOUT value: {runtime_timeout}")
            
            logger.debug(f"✅ Applied runtime config for {runtime_config.get('name', 'unknown')}")
            return runtime_config
            
        except Exception as e:
            logger.error(f"Error getting runtime config: {e}")
            return base_config
    
    def _get_runtime_environment_overrides(self, config: Dict) -> Dict:
        """Get environment variable overrides for runtime"""
        env_overrides = {}
        
        # Check for server-specific environment overrides
        server_id = config.get("id", "")
        if server_id:
            # Format: MCP_SERVER_{SERVER_ID}_{VAR_NAME}
            safe_server_id = server_id.replace("-", "_").replace(":", "_").upper()
            
            for env_var in os.environ:
                prefix = f"MCP_SERVER_{safe_server_id}_"
                if env_var.startswith(prefix):
                    var_name = env_var[len(prefix):]
                    env_overrides[var_name] = os.environ[env_var]
        
        # Check for global MCP environment overrides
        for env_var in os.environ:
            if env_var.startswith("MCP_GLOBAL_"):
                var_name = env_var[11:]  # Remove "MCP_GLOBAL_" prefix
                env_overrides[var_name] = os.environ[env_var]
        
        return env_overrides
    
    def create_config_template(self, server_type: str = "default") -> Dict:
        """
        Create a configuration template for new servers
        
        Args:
            server_type: Type of server template to create
            
        Returns:
            Dict: Configuration template
        """
        templates = {
            "default": {
                "name": "New MCP Server",
                "command": "",
                "args": [],
                "env": {},
                "timeout": self.default_timeout,
                "is_enabled": True,
                "description": "New MCP server configuration"
            },
            "python": {
                "name": "Python MCP Server",
                "command": "python",
                "args": ["-m", "your_mcp_server"],
                "env": {},
                "timeout": self.default_timeout,
                "is_enabled": True,
                "description": "Python-based MCP server"
            },
            "node": {
                "name": "Node.js MCP Server",
                "command": "node",
                "args": ["server.js"],
                "env": {},
                "timeout": self.default_timeout,
                "is_enabled": True,
                "description": "Node.js-based MCP server"
            }
        }
        
        template = templates.get(server_type, templates["default"])
        logger.debug(f"Created {server_type} configuration template")
        return template.copy()
    
    def export_config(self, config: Dict, format: str = "json") -> str:
        """
        Export configuration in specified format
        
        Args:
            config: Configuration to export
            format: Export format (json, yaml, env)
            
        Returns:
            str: Exported configuration string
        """
        try:
            if format.lower() == "json":
                import json
                return json.dumps(config, indent=2)
            
            elif format.lower() == "yaml":
                try:
                    import yaml
                    return yaml.dump(config, default_flow_style=False)
                except ImportError:
                    logger.warning("PyYAML not available, falling back to JSON")
                    import json
                    return json.dumps(config, indent=2)
            
            elif format.lower() == "env":
                # Export as environment variables
                lines = []
                for key, value in config.get("env", {}).items():
                    lines.append(f"{key}={value}")
                return "\n".join(lines)
            
            else:
                raise ValueError(f"Unsupported export format: {format}")
            
        except Exception as e:
            logger.error(f"Error exporting config: {e}")
            raise ValueError(f"Failed to export configuration: {e}")