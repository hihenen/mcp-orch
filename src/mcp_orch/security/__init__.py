"""Security module for MCP Orchestrator.

This module provides comprehensive encryption and secret management capabilities
for protecting sensitive data like API keys, passwords, and configuration secrets.

Key Features:
- Fernet symmetric encryption (AES-128-CBC with HMAC authentication)
- Transparent encryption/decryption via SQLAlchemy hybrid properties
- Pluggable backend architecture for future extensibility
- Zero-downtime migration from plaintext to encrypted storage

Usage Examples:
    Basic encryption operations:
    ```python
    from mcp_orch.security import SecretManager
    
    # Initialize secret manager (auto-detects backend)
    manager = SecretManager()
    
    # Encrypt server configuration
    encrypted_args, encrypted_env = manager.encrypt_server_config(
        args=["--api-key", "secret-123"],
        env={"TOKEN": "secret-token"}
    )
    
    # Decrypt server configuration
    decrypted_args, decrypted_env = manager.decrypt_server_config(
        encrypted_args, encrypted_env
    )
    ```
    
    Health monitoring:
    ```python
    # Check encryption system health
    health_status = manager.health_check()
    if health_status["is_healthy"]:
        print("✅ Encryption system operational")
    else:
        print("❌ Encryption system issues detected")
        print(f"Backend: {health_status['backend_type']}")
    ```
    
    Direct backend usage:
    ```python
    from mcp_orch.security.backends.database import DatabaseEncryptionBackend
    
    # Use specific backend directly
    backend = DatabaseEncryptionBackend()
    encrypted_data = backend.encrypt_json({"secret": "value"})
    decrypted_data = backend.decrypt_json(encrypted_data)
    ```

Security Requirements:
- MCP_ENCRYPTION_KEY environment variable must be set
- All sensitive data MUST be encrypted before database storage
- Never log decrypted sensitive data
- Regular key rotation is recommended (quarterly)
- Use secure key backup and recovery procedures

Environment Variables:
- MCP_ENCRYPTION_KEY: Base64-encoded Fernet encryption key (required)
- MCP_SECRET_BACKEND: Backend type ("database", "vault", "aws") (optional, defaults to "database")

Error Handling:
All security operations raise specific exceptions from the exceptions module:
- SecurityError: Base security exception
- EncryptionError: Failed to encrypt data
- DecryptionError: Failed to decrypt data (wrong key, corrupted data)
- KeyNotFoundError: Encryption key not available
- BackendNotAvailableError: Requested backend not available

See docs/encryption_system.md for complete documentation and operational guides.
"""

from .manager import SecretManager
from .exceptions import (
    SecurityError,
    EncryptionError,
    DecryptionError,
    KeyNotFoundError,
    BackendNotAvailableError,
)

__all__ = [
    "SecretManager",
    "SecurityError",
    "EncryptionError", 
    "DecryptionError",
    "KeyNotFoundError",
    "BackendNotAvailableError",
]