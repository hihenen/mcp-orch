"""Database configuration and session management."""
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool

from .models.base import Base

# Database configuration from environment variables
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "1234")
DB_NAME = os.getenv("DB_NAME", "mcp_orch")

# Connection pool configuration optimized for Aurora RDS
POOL_SIZE = int(os.getenv("DB_POOL_SIZE", "30"))  # Aurora can handle more concurrent connections
MAX_OVERFLOW = int(os.getenv("DB_MAX_OVERFLOW", "70"))  # Total max: 100 connections
POOL_TIMEOUT = int(os.getenv("DB_POOL_TIMEOUT", "60"))  # Increased timeout for high load
POOL_RECYCLE = int(os.getenv("DB_POOL_RECYCLE", "3600"))  # 1 hour

# Aurora-specific optimizations
POOL_PRE_PING = os.getenv("DB_POOL_PRE_PING", "true").lower() == "true"  # Validate connections
POOL_RESET_ON_RETURN = os.getenv("DB_POOL_RESET_ON_RETURN", "commit")  # commit, rollback, none

# SSL configuration
SSL_MODE = os.getenv("DB_SSL_MODE", "prefer")  # prefer, require, disable
SSL_CERT = os.getenv("DB_SSL_CERT")
SSL_KEY = os.getenv("DB_SSL_KEY")
SSL_ROOT_CERT = os.getenv("DB_SSL_ROOT_CERT")

# Construct database URL from components
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"postgresql+asyncpg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

# Prepare SSL connect_args
ssl_context = {}
if SSL_MODE != "disable":
    ssl_context["ssl"] = SSL_MODE
    if SSL_CERT:
        ssl_context["ssl_cert"] = SSL_CERT
    if SSL_KEY:
        ssl_context["ssl_key"] = SSL_KEY
    if SSL_ROOT_CERT:
        ssl_context["ssl_ca"] = SSL_ROOT_CERT

# Create async engine with Aurora RDS optimized connection pool  
# Note: poolclass is omitted for async engines - SQLAlchemy automatically uses AsyncAdaptedQueuePool
engine = create_async_engine(
    DATABASE_URL,
    echo=bool(os.getenv("SQL_ECHO", False)),
    pool_size=POOL_SIZE,
    max_overflow=MAX_OVERFLOW,
    pool_timeout=POOL_TIMEOUT,
    pool_recycle=POOL_RECYCLE,
    pool_pre_ping=POOL_PRE_PING,  # Validate connections before use
    pool_reset_on_return=POOL_RESET_ON_RETURN,  # Aurora connection state management
    connect_args={
        "server_settings": {
            "search_path": "mcp_orch",
            "application_name": "mcp-orch"
        },
        **ssl_context
    }
)

# Create async session factory
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Create sync engine and session for compatibility
sync_database_url = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

# Prepare sync SSL connect_args (different format for psycopg2)
sync_ssl_context = {}
if SSL_MODE != "disable":
    sync_ssl_context["sslmode"] = SSL_MODE
    if SSL_CERT:
        sync_ssl_context["sslcert"] = SSL_CERT
    if SSL_KEY:
        sync_ssl_context["sslkey"] = SSL_KEY
    if SSL_ROOT_CERT:
        sync_ssl_context["sslrootcert"] = SSL_ROOT_CERT

sync_engine = create_engine(
    sync_database_url,
    echo=bool(os.getenv("SQL_ECHO", False)),
    poolclass=QueuePool,
    pool_size=POOL_SIZE,
    max_overflow=MAX_OVERFLOW,
    pool_timeout=POOL_TIMEOUT,
    pool_recycle=POOL_RECYCLE,
    pool_pre_ping=POOL_PRE_PING,  # Validate connections before use
    pool_reset_on_return=POOL_RESET_ON_RETURN,  # Aurora connection state management
    connect_args={
        "options": "-c search_path=mcp_orch -c application_name=mcp-orch-sync",
        **sync_ssl_context
    }
)

# Create sync session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=sync_engine
)


async def init_db() -> None:
    """Initialize database tables."""
    async with engine.begin() as conn:
        # Create mcp_orch schema if it doesn't exist
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS mcp_orch"))
        
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Get database session for dependency injection."""
    async with async_session() as session:
        yield session


@asynccontextmanager
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Context manager for database sessions."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


def get_db():
    """Get sync database session for FastAPI dependency injection."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_sync_db() -> None:
    """Initialize database tables (sync version)."""
    # Create mcp_orch schema if it doesn't exist
    with sync_engine.connect() as conn:
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS mcp_orch"))
        conn.commit()
    
    Base.metadata.create_all(bind=sync_engine)


def get_db_session() -> Session:
    """Get sync database session for direct use."""
    return SessionLocal()
