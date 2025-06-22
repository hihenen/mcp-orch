"""Secret manager for handling different encryption backends.

This module provides the SecretManager class, which acts as the main orchestrator
for different encryption backends. It handles backend selection, configuration,
and provides a unified interface for encryption operations.

Example Usage:
    Basic operations:
    ```python
    from mcp_orch.security.manager import SecretManager
    
    # Create manager with default backend (database)
    manager = SecretManager()
    
    # Encrypt server configuration
    encrypted_args, encrypted_env = manager.encrypt_server_config(
        args=["--api-key", "secret-key"],
        env={"TOKEN": "secret-token"}
    )
    
    # Decrypt server configuration
    args, env = manager.decrypt_server_config(encrypted_args, encrypted_env)
    ```
    
    Backend selection:
    ```python
    # Use specific backend
    manager = SecretManager(backend_type="database")
    
    # Or via environment variable
    # export SECRET_BACKEND=vault
    manager = SecretManager()  # Will use vault backend
    ```
    
    Health monitoring:
    ```python
    # Check system health
    health = manager.health_check()
    print(f"Status: {health['status']}")
    print(f"Backend: {health['backend_type']}")
    
    # List available backends
    backends = manager.list_available_backends()
    for name, status in backends.items():
        print(f"{name}: {status}")
    ```

Environment Variables:
    SECRET_BACKEND: Backend type to use ("database", "vault", "aws")
    MCP_ENCRYPTION_KEY: Encryption key (for database backend)
    VAULT_URL: Vault server URL (for vault backend)
    VAULT_TOKEN: Vault authentication token (for vault backend)
    AWS_REGION: AWS region (for AWS Secrets Manager backend)

Backend Architecture:
    The SecretManager uses a plugin architecture where different backends
    can be added without changing the core functionality. All backends
    implement the SecretBackend abstract interface.
    
    Current backends:
    - database: Local encryption using Fernet (Production ready)
    
    Future backends (Phase 2):
    - vault: HashiCorp Vault integration
    - aws: AWS Secrets Manager integration
    - azure: Azure Key Vault integration
"""

import os
from typing import Dict, Any, Optional

from .backends import SecretBackend
from .backends.database import DatabaseEncryptionBackend
from .exceptions import BackendNotAvailableError


class SecretManager:
    """Secret manager that handles different encryption backends."""
    
    AVAILABLE_BACKENDS = {
        "database": DatabaseEncryptionBackend,
        # Future backends (Phase 2):
        # "vault": VaultBackend,
        # "aws": AWSSecretsBackend,
        # "azure": AzureKeyVaultBackend,
    }
    
    def __init__(self, backend_type: Optional[str] = None):
        """Initialize secret manager with specified backend.
        
        Args:
            backend_type: Type of backend to use. Defaults to 'database'.
                         Can also be set via SECRET_BACKEND environment variable.
        """
        self.backend_type = backend_type or os.getenv("SECRET_BACKEND", "database")
        self.backend = self._create_backend()
    
    def _create_backend(self) -> SecretBackend:
        """Create and return the appropriate backend instance.
        
        Returns:
            Configured secret backend instance
            
        Raises:
            BackendNotAvailableError: If backend type is not available
        """
        if self.backend_type not in self.AVAILABLE_BACKENDS:
            available = ", ".join(self.AVAILABLE_BACKENDS.keys())
            raise BackendNotAvailableError(
                f"Backend '{self.backend_type}' not available. "
                f"Available backends: {available}"
            )
        
        backend_class = self.AVAILABLE_BACKENDS[self.backend_type]
        
        try:
            if self.backend_type == "database":
                return backend_class()
            elif self.backend_type == "vault":
                # Phase 2: Vault implementation
                vault_url = os.getenv("VAULT_URL")
                vault_token = os.getenv("VAULT_TOKEN")
                if not vault_url or not vault_token:
                    raise BackendNotAvailableError(
                        "Vault backend requires VAULT_URL and VAULT_TOKEN environment variables"
                    )
                return backend_class(vault_url, vault_token)
            elif self.backend_type == "aws":
                # Phase 2: AWS Secrets Manager implementation
                aws_region = os.getenv("AWS_REGION")
                if not aws_region:
                    raise BackendNotAvailableError(
                        "AWS backend requires AWS_REGION environment variable"
                    )
                return backend_class(aws_region)
            else:
                # This should not happen due to the check above
                raise BackendNotAvailableError(f"Unknown backend type: {self.backend_type}")
                
        except ImportError as e:
            raise BackendNotAvailableError(
                f"Backend '{self.backend_type}' is not available. "
                f"Missing dependencies: {e}"
            )
    
    def encrypt_server_config(self, args: list, env: dict) -> tuple[str, str]:
        """Encrypt server configuration (args and env).
        
        Args:
            args: List of command arguments
            env: Dictionary of environment variables
            
        Returns:
            Tuple of (encrypted_args, encrypted_env)
        """
        encrypted_args = self.backend.encrypt_json(args)
        encrypted_env = self.backend.encrypt_json(env)
        return encrypted_args, encrypted_env
    
    def decrypt_server_config(self, encrypted_args: str, encrypted_env: str) -> tuple[list, dict]:
        """Decrypt server configuration.
        
        Args:
            encrypted_args: Encrypted JSON string of arguments
            encrypted_env: Encrypted JSON string of environment variables
            
        Returns:
            Tuple of (args_list, env_dict)
        """
        args = self.backend.decrypt_json(encrypted_args)
        env = self.backend.decrypt_json(encrypted_env)
        return args, env
    
    def encrypt(self, plaintext: str) -> str:
        """Encrypt plaintext string.
        
        Args:
            plaintext: String to encrypt
            
        Returns:
            Encrypted string
        """
        return self.backend.encrypt(plaintext)
    
    def decrypt(self, encrypted_text: str) -> str:
        """Decrypt encrypted string.
        
        Args:
            encrypted_text: String to decrypt
            
        Returns:
            Decrypted plaintext string
        """
        return self.backend.decrypt(encrypted_text)
    
    def health_check(self) -> Dict[str, Any]:
        """Perform health check on the current backend.
        
        Returns:
            Dictionary with health check results
        """
        try:
            is_healthy = self.backend.health_check()
            result = {
                "backend_type": self.backend_type,
                "is_healthy": is_healthy,
                "status": "healthy" if is_healthy else "unhealthy",
            }
            
            # Add backend-specific info if available
            if hasattr(self.backend, "get_key_info"):
                result.update(self.backend.get_key_info())
                
            return result
        except Exception as e:
            return {
                "backend_type": self.backend_type,
                "is_healthy": False,
                "status": "error",
                "error": str(e),
            }
    
    def list_available_backends(self) -> Dict[str, str]:
        """List all available backends and their status.
        
        Returns:
            Dictionary mapping backend names to their availability status
        """
        result = {}
        for backend_name in self.AVAILABLE_BACKENDS:
            try:
                # Try to create a temporary instance to check availability
                temp_manager = SecretManager(backend_name)
                result[backend_name] = "available"
            except BackendNotAvailableError:
                result[backend_name] = "unavailable"
            except Exception as e:
                result[backend_name] = f"error: {e}"
        
        return result