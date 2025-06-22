"""Secret backend implementations."""

from abc import ABC, abstractmethod
from typing import Any


class SecretBackend(ABC):
    """Abstract base class for secret backends."""
    
    @abstractmethod
    def encrypt(self, plaintext: str) -> str:
        """Encrypt plaintext string.
        
        Args:
            plaintext: String to encrypt
            
        Returns:
            Encrypted string
            
        Raises:
            EncryptionError: If encryption fails
        """
        pass
    
    @abstractmethod
    def decrypt(self, encrypted_text: str) -> str:
        """Decrypt encrypted string.
        
        Args:
            encrypted_text: String to decrypt
            
        Returns:
            Decrypted plaintext string
            
        Raises:
            DecryptionError: If decryption fails
        """
        pass
    
    def encrypt_json(self, data: Any) -> str:
        """Encrypt JSON-serializable data.
        
        Args:
            data: Data to encrypt (will be JSON-serialized)
            
        Returns:
            Encrypted string
        """
        import json
        json_str = json.dumps(data, ensure_ascii=False)
        return self.encrypt(json_str)
    
    def decrypt_json(self, encrypted_text: str) -> Any:
        """Decrypt JSON data.
        
        Args:
            encrypted_text: Encrypted string to decrypt
            
        Returns:
            Deserialized JSON data
        """
        import json
        decrypted = self.decrypt(encrypted_text)
        return json.loads(decrypted)
    
    @abstractmethod
    def health_check(self) -> bool:
        """Check if backend is healthy and available.
        
        Returns:
            True if backend is available, False otherwise
        """
        pass