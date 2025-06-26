"""Database configuration and session management."""
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool

from .models.base import Base

# Database configuration from environment variables
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "1234")
DB_NAME = os.getenv("DB_NAME", "mcp_orch")

# Construct database URL from components
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"postgresql+asyncpg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

# Create async engine with search_path for mcp_orch schema
engine = create_async_engine(
    DATABASE_URL,
    echo=bool(os.getenv("SQL_ECHO", False)),
    poolclass=NullPool,  # Disable pooling for async safety
    connect_args={
        "server_settings": {
            "search_path": "mcp_orch"
        }
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
sync_engine = create_engine(
    sync_database_url,
    echo=bool(os.getenv("SQL_ECHO", False)),
    poolclass=NullPool,
    connect_args={
        "options": "-c search_path=mcp_orch"
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
