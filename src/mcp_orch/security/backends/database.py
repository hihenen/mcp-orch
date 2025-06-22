"""Database encryption backend using Fernet symmetric encryption."""

import os
import base64
from typing import Optional
from cryptography.fernet import Fernet, InvalidToken

from . import SecretBackend
from ..exceptions import (
    EncryptionError,
    DecryptionError,
    KeyNotFoundError,
    InvalidKeyError,
)


class DatabaseEncryptionBackend(SecretBackend):
    """Database-based encryption backend using Fernet symmetric encryption.
    
    This backend provides local encryption using the Fernet symmetric encryption
    algorithm (AES-128-CBC with HMAC-SHA256 authentication). It's designed for
    simplicity and reliability, following industry best practices used by
    GitLab, Django, and other major projects.
    
    Key Features:
    - AES-128-CBC encryption with HMAC authentication
    - Automatic key generation on first use
    - Environment variable key management
    - JSON serialization support for complex data types
    
    Security Properties:
    - Cryptographic Algorithm: AES-128-CBC
    - Authentication: HMAC-SHA256
    - Key Format: Base64-encoded Fernet key (32 bytes)
    - Data Format: Base64-encoded ciphertext with embedded IV and MAC
    
    Usage:
        backend = DatabaseEncryptionBackend()
        encrypted_data = backend.encrypt_json({"api_key": "secret"})
        decrypted_data = backend.decrypt_json(encrypted_data)
    
    Environment Variables:
        MCP_ENCRYPTION_KEY: Base64-encoded Fernet encryption key
    
    Security Considerations:
    - Keys must be stored securely and rotated regularly
    - Never log encryption keys or decrypted sensitive data
    - Ensure proper access controls on environment variables
    - Consider using hardware security modules in production
    """
    
    def __init__(self, encryption_key: Optional[str] = None):
        """Initialize database encryption backend.
        
        Args:
            encryption_key: Base64-encoded Fernet key. If None, will try to load from environment.
            
        Raises:
            KeyNotFoundError: If no encryption key is available
            InvalidKeyError: If provided key is invalid
        """
        self._key = self._get_encryption_key(encryption_key)
        try:
            self._fernet = Fernet(self._key.encode())
        except (ValueError, TypeError) as e:
            raise InvalidKeyError(f"Invalid encryption key format: {e}")
    
    def _get_encryption_key(self, provided_key: Optional[str] = None) -> str:
        """Get encryption key from parameter or environment.
        
        Args:
            provided_key: Optional key to use instead of environment
            
        Returns:
            Base64-encoded Fernet key
            
        Raises:
            KeyNotFoundError: If no key is available
        """
        if provided_key:
            return provided_key
        
        # Try to get from environment
        key = os.getenv("MCP_ENCRYPTION_KEY")
        if key:
            return key
        
        # If no key exists, generate a new one and show instructions
        return self._generate_and_show_key()
    
    def _generate_and_show_key(self) -> str:
        """Generate new encryption key and show setup instructions.
        
        Returns:
            Base64-encoded Fernet key
        """
        key = Fernet.generate_key().decode()
        
        print("🔐 No encryption key found. Generated new key for you:")
        print(f"   MCP_ENCRYPTION_KEY={key}")
        print()
        print("📝 Please add this to your .env file:")
        print(f"   echo 'MCP_ENCRYPTION_KEY={key}' >> .env")
        print()
        print("⚠️  IMPORTANT: Save this key securely!")
        print("   - If you lose this key, encrypted data cannot be recovered")
        print("   - Use the same key across all environments for this database")
        print("   - Never commit this key to version control")
        print()
        
        return key
    
    def encrypt(self, plaintext: str) -> str:
        """Encrypt plaintext string using Fernet.
        
        Args:
            plaintext: String to encrypt
            
        Returns:
            Base64-encoded encrypted string
            
        Raises:
            EncryptionError: If encryption fails
        """
        try:
            encrypted = self._fernet.encrypt(plaintext.encode('utf-8'))
            return encrypted.decode('ascii')
        except Exception as e:
            raise EncryptionError(f"Failed to encrypt data: {e}")
    
    def decrypt(self, encrypted_text: str) -> str:
        """Decrypt encrypted string using Fernet.
        
        Args:
            encrypted_text: Base64-encoded encrypted string
            
        Returns:
            Decrypted plaintext string
            
        Raises:
            DecryptionError: If decryption fails
        """
        try:
            encrypted_bytes = encrypted_text.encode('ascii')
            decrypted = self._fernet.decrypt(encrypted_bytes)
            return decrypted.decode('utf-8')
        except InvalidToken:
            raise DecryptionError("Invalid encrypted data or wrong encryption key")
        except Exception as e:
            raise DecryptionError(f"Failed to decrypt data: {e}")
    
    def health_check(self) -> bool:
        """Check if encryption backend is healthy.
        
        Returns:
            True if backend can encrypt/decrypt successfully
        """
        try:
            test_data = "health_check_test_data"
            encrypted = self.encrypt(test_data)
            decrypted = self.decrypt(encrypted)
            return decrypted == test_data
        except Exception:
            return False
    
    def get_key_info(self) -> dict:
        """Get information about the current encryption key.
        
        Returns:
            Dictionary with key information
        """
        return {
            "backend_type": "database",
            "encryption_algorithm": "Fernet (AES 128 CBC)",
            "key_source": "environment_variable" if os.getenv("MCP_ENCRYPTION_KEY") else "generated",
            "key_length": len(self._key),
            "is_healthy": self.health_check(),
        }