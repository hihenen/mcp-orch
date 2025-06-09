"""Base model for SQLAlchemy."""
from datetime import datetime
from typing import Any

from sqlalchemy import Column, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base model with common fields."""
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def to_dict(self) -> dict[str, Any]:
        """Convert model instance to dictionary."""
        return {
            column.name: getattr(self, column.name)
            for column in self.__table__.columns
        }
