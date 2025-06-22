"""Custom exceptions for the security module.

This module defines all security-related exceptions used throughout the
MCP Orchestrator encryption system. All exceptions inherit from SecurityError
to allow for easy exception handling at different levels.

Exception Hierarchy:
    SecurityError (base)
    ├── EncryptionError
    ├── DecryptionError  
    ├── KeyNotFoundError
    ├── InvalidKeyError
    ├── BackendNotAvailableError
    └── MigrationError

Usage Examples:
    Basic exception handling:
    ```python
    from mcp_orch.security import SecretManager
    from mcp_orch.security.exceptions import (
        SecurityError, EncryptionError, DecryptionError
    )
    
    try:
        manager = SecretManager()
        encrypted = manager.encrypt("sensitive data")
    except KeyNotFoundError:
        print("❌ No encryption key configured")
    except EncryptionError as e:
        print(f"❌ Encryption failed: {e}")
    except SecurityError as e:
        print(f"❌ Security error: {e}")
    ```
    
    Specific error handling:
    ```python
    try:
        decrypted = manager.decrypt(encrypted_data)
    except DecryptionError:
        # Handle wrong key or corrupted data
        print("❌ Unable to decrypt - check encryption key")
    except InvalidKeyError:
        # Handle malformed key
        print("❌ Encryption key format is invalid")
    ```
    
    Backend availability checking:
    ```python
    try:
        manager = SecretManager(backend_type="vault")
    except BackendNotAvailableError as e:
        print(f"❌ Vault backend not available: {e}")
        # Fall back to database backend
        manager = SecretManager(backend_type="database")
    ```
"""


class SecurityError(Exception):
    """Base exception for all security-related errors.
    
    This is the base class for all security exceptions in the MCP Orchestrator
    encryption system. It allows for unified exception handling and provides
    a clear separation between security-related errors and other application errors.
    
    Attributes:
        message: Human-readable error description
        
    Example:
        ```python
        try:
            # Security operations
            pass
        except SecurityError as e:
            # Handle any security-related error
            logger.error(f"Security error occurred: {e}")
        ```
    """
    pass


class EncryptionError(SecurityError):
    """Raised when encryption operation fails.
    
    This exception is raised when data encryption fails for any reason,
    such as invalid input data, key issues, or backend problems.
    
    Common causes:
    - Invalid encryption key
    - Corrupted input data
    - Backend service unavailable
    - Insufficient permissions
    
    Example:
        ```python
        try:
            encrypted = backend.encrypt(data)
        except EncryptionError as e:
            logger.error(f"Failed to encrypt data: {e}")
            # Handle encryption failure
        ```
    """
    pass


class DecryptionError(SecurityError):
    """Raised when decryption operation fails.
    
    This exception is raised when data decryption fails, typically due to
    wrong encryption keys, corrupted data, or backend issues.
    
    Common causes:
    - Wrong encryption key
    - Corrupted encrypted data
    - Data encrypted with different key version
    - Invalid data format
    
    Example:
        ```python
        try:
            decrypted = backend.decrypt(encrypted_data)
        except DecryptionError as e:
            logger.error(f"Failed to decrypt data: {e}")
            # Handle decryption failure - may need key rotation check
        ```
    """
    pass


class KeyNotFoundError(SecurityError):
    """Raised when encryption key is not found.
    
    This exception is raised when the system cannot locate the required
    encryption key, typically from environment variables or key management systems.
    
    Common causes:
    - Missing MCP_ENCRYPTION_KEY environment variable
    - Key not available in key management system
    - Insufficient permissions to access key
    - Key has been deleted or expired
    
    Example:
        ```python
        try:
            backend = DatabaseEncryptionBackend()
        except KeyNotFoundError:
            print("❌ Please set MCP_ENCRYPTION_KEY environment variable")
            # Guide user to generate new key
        ```
    """
    pass


class BackendNotAvailableError(SecurityError):
    """Raised when secret backend is not available.
    
    This exception is raised when the requested encryption backend cannot
    be initialized or is not available in the current environment.
    
    Common causes:
    - Missing backend dependencies
    - Backend service unavailable (Vault, AWS)
    - Incorrect configuration
    - Network connectivity issues
    
    Example:
        ```python
        try:
            manager = SecretManager(backend_type="vault")
        except BackendNotAvailableError as e:
            logger.warning(f"Vault backend unavailable: {e}")
            # Fall back to database backend
            manager = SecretManager(backend_type="database")
        ```
    """
    pass


class InvalidKeyError(SecurityError):
    """Raised when encryption key is invalid or corrupted.
    
    This exception is raised when the encryption key exists but has
    an invalid format, is corrupted, or cannot be used for cryptographic operations.
    
    Common causes:
    - Malformed base64 encoding
    - Wrong key length for algorithm
    - Corrupted key data
    - Incompatible key format
    
    Example:
        ```python
        try:
            backend = DatabaseEncryptionBackend(custom_key)
        except InvalidKeyError as e:
            logger.error(f"Invalid encryption key: {e}")
            # Generate new valid key
            new_key = Fernet.generate_key().decode()
        ```
    """
    pass


class MigrationError(SecurityError):
    """Raised when data migration fails.
    
    This exception is raised during encryption migration operations when
    the process fails due to data issues, key problems, or system errors.
    
    Common causes:
    - Database connectivity issues
    - Insufficient disk space
    - Key rotation during migration
    - Data corruption
    - Transaction timeouts
    
    Example:
        ```python
        try:
            migrate_tool.migrate_all_data()
        except MigrationError as e:
            logger.error(f"Migration failed: {e}")
            # Rollback and retry with smaller batches
            migrate_tool.rollback()
        ```
    """
    pass