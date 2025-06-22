"""Migration tool for encrypting existing plaintext server data."""

import sys
import argparse
from typing import List, Tuple, Optional
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.mcp_server import McpServer
from ..security import SecretManager
from ..security.exceptions import SecurityError


class EncryptionMigrationTool:
    """Tool for migrating server data to encrypted storage."""
    
    def __init__(self):
        self.secret_manager = SecretManager()
        
    def migrate_all_servers(self, dry_run: bool = True) -> Tuple[int, int, List[str]]:
        """Migrate all servers from plaintext to encrypted storage.
        
        Args:
            dry_run: If True, only simulate migration without making changes
            
        Returns:
            Tuple of (total_servers, migrated_servers, errors)
        """
        db: Session = next(get_db())
        errors = []
        migrated_count = 0
        
        try:
            # Find servers that need migration (have plaintext but no encrypted data)
            servers_to_migrate = db.query(McpServer).filter(
                (McpServer.args.isnot(None) | 
                 McpServer.env.isnot(None)) &
                ((McpServer._args_encrypted.is_(None)) | 
                 (McpServer._env_encrypted.is_(None)))
            ).all()
            
            total_count = len(servers_to_migrate)
            
            print(f"🔍 Found {total_count} servers to migrate")
            print(f"🔄 Mode: {'DRY RUN' if dry_run else 'LIVE MIGRATION'}")
            print()
            
            for server in servers_to_migrate:
                try:
                    self._migrate_server(server, dry_run)
                    migrated_count += 1
                    print(f"✅ Migrated server: {server.name} (ID: {server.id})")
                    
                except Exception as e:
                    error_msg = f"Failed to migrate server {server.name} (ID: {server.id}): {e}"
                    errors.append(error_msg)
                    print(f"❌ {error_msg}")
            
            if not dry_run and migrated_count > 0:
                db.commit()
                print(f"\n💾 Committed {migrated_count} migrations to database")
            elif dry_run:
                print(f"\n🚀 Ready to migrate {migrated_count} servers")
                print("   Run with --execute to perform actual migration")
                
        except Exception as e:
            db.rollback()
            errors.append(f"Migration failed: {e}")
            print(f"❌ Migration failed: {e}")
        finally:
            db.close()
            
        return total_count, migrated_count, errors
    
    def _migrate_server(self, server: McpServer, dry_run: bool):
        """Migrate a single server to encrypted storage."""
        
        # Migrate args if needed - use actual args field (not _args_legacy yet)
        if hasattr(server, 'args') and server.args and not server._args_encrypted:
            if not dry_run:
                encrypted_args = self.secret_manager.backend.encrypt_json(server.args)
                server._args_encrypted = encrypted_args
            args_count = len(server.args) if server.args else 0
            print(f"    📦 Args: {args_count} items → encrypted")
        
        # Migrate env if needed - use actual env field (not _env_legacy yet)
        if hasattr(server, 'env') and server.env and not server._env_encrypted:
            if not dry_run:
                encrypted_env = self.secret_manager.backend.encrypt_json(server.env)
                server._env_encrypted = encrypted_env
            env_count = len(server.env) if server.env else 0
            print(f"    🌍 Env: {env_count} variables → encrypted")
    
    def verify_migration(self) -> Tuple[int, int, List[str]]:
        """Verify migration by checking encrypted data can be decrypted.
        
        Returns:
            Tuple of (total_encrypted, verified_count, errors)
        """
        db: Session = next(get_db())
        errors = []
        verified_count = 0
        
        try:
            encrypted_servers = db.query(McpServer).filter(
                (McpServer._args_encrypted.isnot(None)) | 
                (McpServer._env_encrypted.isnot(None))
            ).all()
            
            total_count = len(encrypted_servers)
            print(f"🔍 Verifying {total_count} encrypted servers")
            
            for server in encrypted_servers:
                try:
                    # Test decryption
                    if server._args_encrypted:
                        decrypted_args = self.secret_manager.backend.decrypt_json(server._args_encrypted)
                        assert isinstance(decrypted_args, list)
                    
                    if server._env_encrypted:
                        decrypted_env = self.secret_manager.backend.decrypt_json(server._env_encrypted)
                        assert isinstance(decrypted_env, dict)
                    
                    verified_count += 1
                    print(f"✅ Verified server: {server.name}")
                    
                except Exception as e:
                    error_msg = f"Verification failed for server {server.name}: {e}"
                    errors.append(error_msg)
                    print(f"❌ {error_msg}")
                    
        except Exception as e:
            errors.append(f"Verification process failed: {e}")
            print(f"❌ Verification process failed: {e}")
        finally:
            db.close()
            
        return total_count, verified_count, errors
    
    def show_migration_status(self):
        """Show current migration status."""
        db: Session = next(get_db())
        
        try:
            total_servers = db.query(McpServer).count()
            
            encrypted_servers = db.query(McpServer).filter(
                (McpServer._args_encrypted.isnot(None)) | 
                (McpServer._env_encrypted.isnot(None))
            ).count()
            
            plaintext_servers = db.query(McpServer).filter(
                (McpServer._args_legacy.isnot(None)) | 
                (McpServer._env_legacy.isnot(None))
            ).count()
            
            fully_migrated = db.query(McpServer).filter(
                (McpServer._args_encrypted.isnot(None)) &
                (McpServer._env_encrypted.isnot(None)) &
                (McpServer._args_legacy.is_(None)) &
                (McpServer._env_legacy.is_(None))
            ).count()
            
            print("📊 Migration Status Summary")
            print("=" * 30)
            print(f"Total servers: {total_servers}")
            print(f"Encrypted servers: {encrypted_servers}")
            print(f"Plaintext servers: {plaintext_servers}")
            print(f"Fully migrated: {fully_migrated}")
            print(f"Migration progress: {(fully_migrated/total_servers*100):.1f}%" if total_servers > 0 else "N/A")
            
            # Health check
            health = self.secret_manager.health_check()
            print(f"\n🏥 Encryption Health: {'✅ Healthy' if health['is_healthy'] else '❌ Unhealthy'}")
            print(f"Backend: {health['backend_type']}")
            
        except Exception as e:
            print(f"❌ Failed to get migration status: {e}")
        finally:
            db.close()


def main():
    """Main entry point for the migration tool."""
    parser = argparse.ArgumentParser(
        description="Migrate MCP server data from plaintext to encrypted storage"
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Status command
    status_parser = subparsers.add_parser('status', help='Show migration status')
    
    # Migrate command
    migrate_parser = subparsers.add_parser('migrate', help='Migrate plaintext data to encrypted storage')
    migrate_parser.add_argument('--execute', action='store_true', 
                               help='Actually perform migration (default is dry run)')
    
    # Verify command
    verify_parser = subparsers.add_parser('verify', help='Verify encrypted data can be decrypted')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    tool = EncryptionMigrationTool()
    
    try:
        if args.command == 'status':
            tool.show_migration_status()
            
        elif args.command == 'migrate':
            dry_run = not args.execute
            total, migrated, errors = tool.migrate_all_servers(dry_run)
            
            print(f"\n📈 Migration Summary")
            print(f"Total servers: {total}")
            print(f"Migrated: {migrated}")
            print(f"Errors: {len(errors)}")
            
            if errors:
                print("\n❌ Errors encountered:")
                for error in errors:
                    print(f"  • {error}")
                sys.exit(1)
                
        elif args.command == 'verify':
            total, verified, errors = tool.verify_migration()
            
            print(f"\n📈 Verification Summary")
            print(f"Total encrypted: {total}")
            print(f"Verified: {verified}")
            print(f"Errors: {len(errors)}")
            
            if errors:
                print("\n❌ Verification errors:")
                for error in errors:
                    print(f"  • {error}")
                sys.exit(1)
                
    except SecurityError as e:
        print(f"❌ Security error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()