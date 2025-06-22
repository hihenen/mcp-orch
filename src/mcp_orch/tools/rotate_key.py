"""Tool for rotating encryption keys and re-encrypting data."""

import sys
import argparse
import os
from typing import List, Tuple
from sqlalchemy.orm import Session
from cryptography.fernet import Fernet

from ..database import get_db
from ..models.mcp_server import McpServer
from ..security.backends.database import DatabaseEncryptionBackend
from ..security.exceptions import SecurityError, DecryptionError


class KeyRotationTool:
    """Tool for rotating encryption keys and re-encrypting existing data."""
    
    def rotate_key(self, old_key: str, new_key: str, dry_run: bool = True) -> Tuple[int, int, List[str]]:
        """Rotate encryption key and re-encrypt all data.
        
        Args:
            old_key: Current encryption key (base64-encoded Fernet key)
            new_key: New encryption key (base64-encoded Fernet key)
            dry_run: If True, only simulate rotation without making changes
            
        Returns:
            Tuple of (total_servers, rotated_servers, errors)
        """
        errors = []
        rotated_count = 0
        
        # Validate keys
        try:
            old_backend = DatabaseEncryptionBackend(old_key)
            new_backend = DatabaseEncryptionBackend(new_key)
            
            # Test both keys
            if not old_backend.health_check():
                raise SecurityError("Old encryption key failed health check")
            if not new_backend.health_check():
                raise SecurityError("New encryption key failed health check")
                
        except Exception as e:
            raise SecurityError(f"Key validation failed: {e}")
        
        db: Session = next(get_db())
        
        try:
            # Find all servers with encrypted data
            encrypted_servers = db.query(McpServer).filter(
                (McpServer._args_encrypted.isnot(None)) | 
                (McpServer._env_encrypted.isnot(None))
            ).all()
            
            total_count = len(encrypted_servers)
            
            print(f"🔍 Found {total_count} servers with encrypted data")
            print(f"🔄 Mode: {'DRY RUN' if dry_run else 'LIVE KEY ROTATION'}")
            print(f"🔑 Old key preview: {old_key[:8]}...")
            print(f"🔑 New key preview: {new_key[:8]}...")
            print()
            
            for server in encrypted_servers:
                try:
                    self._rotate_server_key(server, old_backend, new_backend, dry_run)
                    rotated_count += 1
                    print(f"✅ Rotated server: {server.name} (ID: {server.id})")
                    
                except Exception as e:
                    error_msg = f"Failed to rotate server {server.name} (ID: {server.id}): {e}"
                    errors.append(error_msg)
                    print(f"❌ {error_msg}")
            
            if not dry_run and rotated_count > 0:
                db.commit()
                print(f"\n💾 Committed {rotated_count} key rotations to database")
                print(f"🔧 Update your .env file with: MCP_ENCRYPTION_KEY={new_key}")
            elif dry_run:
                print(f"\n🚀 Ready to rotate keys for {rotated_count} servers")
                print("   Run with --execute to perform actual rotation")
                
        except Exception as e:
            db.rollback()
            errors.append(f"Key rotation failed: {e}")
            print(f"❌ Key rotation failed: {e}")
        finally:
            db.close()
            
        return total_count, rotated_count, errors
    
    def _rotate_server_key(self, server: McpServer, old_backend: DatabaseEncryptionBackend, 
                          new_backend: DatabaseEncryptionBackend, dry_run: bool):
        """Rotate encryption key for a single server."""
        
        # Rotate args if present
        if server._args_encrypted:
            # Decrypt with old key
            args_data = old_backend.decrypt_json(server._args_encrypted)
            
            if not dry_run:
                # Re-encrypt with new key
                server._args_encrypted = new_backend.encrypt_json(args_data)
            
            print(f"    📦 Args: {len(args_data)} items re-encrypted")
        
        # Rotate env if present
        if server._env_encrypted:
            # Decrypt with old key
            env_data = old_backend.decrypt_json(server._env_encrypted)
            
            if not dry_run:
                # Re-encrypt with new key
                server._env_encrypted = new_backend.encrypt_json(env_data)
            
            print(f"    🌍 Env: {len(env_data)} variables re-encrypted")
    
    def generate_new_key(self) -> str:
        """Generate a new Fernet encryption key.
        
        Returns:
            Base64-encoded Fernet key
        """
        key = Fernet.generate_key().decode()
        print(f"🔑 Generated new encryption key: {key}")
        print()
        print("📝 To use this key:")
        print(f"   1. Update .env file: MCP_ENCRYPTION_KEY={key}")
        print(f"   2. Run key rotation: python -m mcp_orch.tools.rotate_key rotate --old-key <old_key> --new-key {key} --execute")
        print()
        print("⚠️  IMPORTANT:")
        print("   - Save the old key until rotation is complete and verified")
        print("   - Test the new key before rotating")
        print("   - Have a backup plan in case rotation fails")
        
        return key
    
    def verify_key_rotation(self, new_key: str) -> Tuple[int, int, List[str]]:
        """Verify that all data can be decrypted with the new key.
        
        Args:
            new_key: New encryption key to test
            
        Returns:
            Tuple of (total_servers, verified_count, errors)
        """
        errors = []
        verified_count = 0
        
        try:
            new_backend = DatabaseEncryptionBackend(new_key)
            if not new_backend.health_check():
                raise SecurityError("New encryption key failed health check")
        except Exception as e:
            raise SecurityError(f"New key validation failed: {e}")
        
        db: Session = next(get_db())
        
        try:
            encrypted_servers = db.query(McpServer).filter(
                (McpServer._args_encrypted.isnot(None)) | 
                (McpServer._env_encrypted.isnot(None))
            ).all()
            
            total_count = len(encrypted_servers)
            print(f"🔍 Verifying {total_count} servers with new key")
            
            for server in encrypted_servers:
                try:
                    # Try to decrypt with new key
                    if server._args_encrypted:
                        new_backend.decrypt_json(server._args_encrypted)
                    
                    if server._env_encrypted:
                        new_backend.decrypt_json(server._env_encrypted)
                    
                    verified_count += 1
                    print(f"✅ Verified server: {server.name}")
                    
                except DecryptionError as e:
                    error_msg = f"Cannot decrypt server {server.name} with new key: {e}"
                    errors.append(error_msg)
                    print(f"❌ {error_msg}")
                    
        except Exception as e:
            errors.append(f"Verification failed: {e}")
            print(f"❌ Verification failed: {e}")
        finally:
            db.close()
            
        return total_count, verified_count, errors


def main():
    """Main entry point for the key rotation tool."""
    parser = argparse.ArgumentParser(
        description="Rotate encryption keys for MCP server data"
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Generate command
    generate_parser = subparsers.add_parser('generate', help='Generate a new encryption key')
    
    # Rotate command
    rotate_parser = subparsers.add_parser('rotate', help='Rotate encryption key')
    rotate_parser.add_argument('--old-key', required=True,
                              help='Current encryption key (or set OLD_KEY env var)')
    rotate_parser.add_argument('--new-key', required=True,
                              help='New encryption key (or set NEW_KEY env var)')
    rotate_parser.add_argument('--execute', action='store_true',
                              help='Actually perform rotation (default is dry run)')
    
    # Verify command
    verify_parser = subparsers.add_parser('verify', help='Verify data with new key')
    verify_parser.add_argument('--new-key', required=True,
                              help='New encryption key to verify')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    tool = KeyRotationTool()
    
    try:
        if args.command == 'generate':
            tool.generate_new_key()
            
        elif args.command == 'rotate':
            # Allow keys from environment variables for security
            old_key = args.old_key or os.getenv('OLD_KEY')
            new_key = args.new_key or os.getenv('NEW_KEY')
            
            if not old_key or not new_key:
                print("❌ Both old and new keys are required")
                print("   Use --old-key and --new-key, or set OLD_KEY and NEW_KEY environment variables")
                sys.exit(1)
            
            dry_run = not args.execute
            total, rotated, errors = tool.rotate_key(old_key, new_key, dry_run)
            
            print(f"\n📈 Key Rotation Summary")
            print(f"Total servers: {total}")
            print(f"Rotated: {rotated}")
            print(f"Errors: {len(errors)}")
            
            if errors:
                print("\n❌ Errors encountered:")
                for error in errors:
                    print(f"  • {error}")
                sys.exit(1)
                
        elif args.command == 'verify':
            new_key = args.new_key or os.getenv('NEW_KEY')
            
            if not new_key:
                print("❌ New key is required")
                print("   Use --new-key or set NEW_KEY environment variable")
                sys.exit(1)
            
            total, verified, errors = tool.verify_key_rotation(new_key)
            
            print(f"\n📈 Verification Summary")
            print(f"Total servers: {total}")
            print(f"Verified: {verified}")
            print(f"Errors: {len(errors)}")
            
            if errors:
                print("\n❌ Verification errors:")
                for error in errors:
                    print(f"  • {error}")
                sys.exit(1)
            else:
                print(f"\n✅ All servers verified with new key!")
                
    except SecurityError as e:
        print(f"❌ Security error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()