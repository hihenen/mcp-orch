#!/usr/bin/env python3
"""Simple test script for the encryption system."""

import os
import sys
sys.path.insert(0, 'src')

from mcp_orch.security import SecretManager
from mcp_orch.security.backends.database import DatabaseEncryptionBackend


def test_database_encryption():
    """Test database encryption backend."""
    print("🧪 Testing Database Encryption Backend")
    print("=" * 40)
    
    # Test with a generated key
    backend = DatabaseEncryptionBackend()
    
    # Test basic encryption/decryption
    test_data = "Hello, World! This is a secret message."
    print(f"Original: {test_data}")
    
    encrypted = backend.encrypt(test_data)
    print(f"Encrypted: {encrypted[:50]}...")
    
    decrypted = backend.decrypt(encrypted)
    print(f"Decrypted: {decrypted}")
    
    assert decrypted == test_data, "Encryption/decryption failed"
    print("✅ Basic encryption test passed")
    
    # Test JSON encryption
    test_json = {
        "api_key": "sk-1234567890abcdef",
        "database_url": "postgresql://user:pass@host:5432/db",
        "webhook_secret": "secret_webhook_key"
    }
    
    encrypted_json = backend.encrypt_json(test_json)
    decrypted_json = backend.decrypt_json(encrypted_json)
    
    assert decrypted_json == test_json, "JSON encryption/decryption failed"
    print("✅ JSON encryption test passed")
    
    # Test health check
    is_healthy = backend.health_check()
    assert is_healthy, "Health check failed"
    print("✅ Health check passed")
    
    # Get key info
    key_info = backend.get_key_info()
    print(f"✅ Key info: {key_info}")


def test_secret_manager():
    """Test secret manager."""
    print("\n🧪 Testing Secret Manager")
    print("=" * 30)
    
    manager = SecretManager()
    
    # Test server config encryption
    args = ["--api-key", "sk-test123", "--verbose"]
    env = {
        "API_TOKEN": "token_abc123",
        "DATABASE_URL": "postgresql://localhost/test"
    }
    
    print(f"Original args: {args}")
    print(f"Original env: {env}")
    
    encrypted_args, encrypted_env = manager.encrypt_server_config(args, env)
    print(f"Encrypted args: {encrypted_args[:50]}...")
    print(f"Encrypted env: {encrypted_env[:50]}...")
    
    decrypted_args, decrypted_env = manager.decrypt_server_config(encrypted_args, encrypted_env)
    print(f"Decrypted args: {decrypted_args}")
    print(f"Decrypted env: {decrypted_env}")
    
    assert decrypted_args == args, "Args encryption/decryption failed"
    assert decrypted_env == env, "Env encryption/decryption failed"
    print("✅ Server config encryption test passed")
    
    # Test health check
    health = manager.health_check()
    print(f"✅ Manager health: {health}")
    
    # Test available backends
    backends = manager.list_available_backends()
    print(f"✅ Available backends: {backends}")


def main():
    """Run all tests."""
    try:
        print("🔐 MCP Orchestrator Encryption System Test")
        print("=" * 50)
        
        test_database_encryption()
        test_secret_manager()
        
        print("\n🎉 All tests passed!")
        print("\n📝 Next steps:")
        print("1. Run database migration: alembic upgrade head")
        print("2. Migrate existing data: python -m mcp_orch.tools.migrate_encryption migrate --execute")
        print("3. Verify migration: python -m mcp_orch.tools.migrate_encryption verify")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()