"""
Configuration parser for MCP Orch.
Handles loading and parsing of mcp-config.json files.
"""

import json
import os
from pathlib import Path
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
import logging

logger = logging.getLogger(__name__)


@dataclass
class MCPServerConfig:
    """Configuration for a single MCP server."""
    name: str
    command: str
    args: List[str] = field(default_factory=list)
    env: Dict[str, str] = field(default_factory=dict)
    timeout: int = 60
    auto_approve: List[str] = field(default_factory=list)
    transport_type: str = "stdio"
    disabled: bool = False
    
    @classmethod
    def from_dict(cls, name: str, data: Dict[str, Any]) -> 'MCPServerConfig':
        """Create MCPServerConfig from dictionary."""
        return cls(
            name=name,
            command=data.get('command', ''),
            args=data.get('args', []),
            env=data.get('env', {}),
            timeout=data.get('timeout', 60),
            auto_approve=data.get('autoApprove', []),
            transport_type=data.get('transportType', 'stdio'),
            disabled=data.get('disabled', False)
        )


@dataclass
class MCPConfig:
    """Main configuration for MCP Orch."""
    servers: Dict[str, MCPServerConfig] = field(default_factory=dict)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'MCPConfig':
        """Create MCPConfig from dictionary."""
        config = cls()
        
        # Parse MCP servers
        mcp_servers = data.get('mcpServers', {})
        for name, server_data in mcp_servers.items():
            if isinstance(server_data, dict):
                config.servers[name] = MCPServerConfig.from_dict(name, server_data)
        
        return config


class ConfigParser:
    """Parser for MCP configuration files."""
    
    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize the config parser.
        
        Args:
            config_path: Path to the configuration file. If None, will search for default locations.
        """
        self.config_path = self._resolve_config_path(config_path)
        self._config: Optional[MCPConfig] = None
        self._last_modified: Optional[float] = None
    
    def _resolve_config_path(self, config_path: Optional[str]) -> Path:
        """Resolve the configuration file path."""
        if config_path:
            return Path(config_path)
        
        # Search for config file in common locations
        search_paths = [
            Path.cwd() / "mcp-config.json",
            Path.home() / ".mcp" / "config.json",
            Path("/etc/mcp/config.json"),
        ]
        
        for path in search_paths:
            if path.exists():
                logger.info(f"Found configuration file at: {path}")
                return path
        
        # Default to current directory
        default_path = Path.cwd() / "mcp-config.json"
        logger.warning(f"No configuration file found. Using default path: {default_path}")
        return default_path
    
    def load(self) -> MCPConfig:
        """
        Load the configuration from file.
        
        Returns:
            MCPConfig object
            
        Raises:
            FileNotFoundError: If config file doesn't exist
            json.JSONDecodeError: If config file is invalid JSON
        """
        if not self.config_path.exists():
            logger.warning(f"Configuration file not found: {self.config_path}")
            return MCPConfig()
        
        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            self._config = MCPConfig.from_dict(data)
            self._last_modified = os.path.getmtime(self.config_path)
            
            logger.info(f"Loaded configuration with {len(self._config.servers)} servers")
            return self._config
            
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in configuration file: {e}")
            raise
        except Exception as e:
            logger.error(f"Error loading configuration: {e}")
            raise
    
    def reload_if_changed(self) -> bool:
        """
        Reload configuration if the file has been modified.
        
        Returns:
            True if configuration was reloaded, False otherwise
        """
        if not self.config_path.exists():
            return False
        
        current_mtime = os.path.getmtime(self.config_path)
        if self._last_modified is None or current_mtime > self._last_modified:
            logger.info("Configuration file changed, reloading...")
            try:
                self.load()
                return True
            except Exception as e:
                logger.error(f"Error reloading configuration: {e}")
                return False
        
        return False
    
    def get_active_servers(self) -> Dict[str, MCPServerConfig]:
        """
        Get all active (non-disabled) server configurations.
        
        Returns:
            Dictionary of active server configurations
        """
        if not self._config:
            self.load()
        
        return {
            name: config 
            for name, config in self._config.servers.items() 
            if not config.disabled
        }
    
    def save_example(self, path: Optional[str] = None) -> None:
        """
        Save an example configuration file.
        
        Args:
            path: Path to save the example file. If None, uses 'mcp-config.example.json'
        """
        example_path = Path(path) if path else Path("mcp-config.example.json")
        
        example_config = {
            "mcpServers": {
                "github-server": {
                    "command": "npx",
                    "args": ["-y", "@modelcontextprotocol/server-github"],
                    "env": {
                        "GITHUB_TOKEN": "your-github-token"
                    },
                    "timeout": 60,
                    "autoApprove": ["list_issues", "create_issue"],
                    "transportType": "stdio",
                    "disabled": False
                },
                "notion-server": {
                    "command": "node",
                    "args": ["/path/to/notion-server"],
                    "env": {
                        "NOTION_API_KEY": "your-notion-api-key"
                    },
                    "transportType": "stdio",
                    "disabled": True
                },
                "local-server": {
                    "command": "python",
                    "args": ["-m", "my_mcp_server"],
                    "env": {
                        "SERVER_PORT": "8080"
                    },
                    "timeout": 30,
                    "autoApprove": [],
                    "transportType": "stdio",
                    "disabled": False
                }
            }
        }
        
        with open(example_path, 'w', encoding='utf-8') as f:
            json.dump(example_config, f, indent=2)
        
        logger.info(f"Example configuration saved to: {example_path}")


# Convenience functions
def load_config(config_path: Optional[str] = None) -> MCPConfig:
    """
    Load MCP configuration from file.
    
    Args:
        config_path: Optional path to configuration file
        
    Returns:
        MCPConfig object
    """
    parser = ConfigParser(config_path)
    return parser.load()


def create_example_config(path: Optional[str] = None) -> None:
    """
    Create an example configuration file.
    
    Args:
        path: Optional path for the example file
    """
    parser = ConfigParser()
    parser.save_example(path)
