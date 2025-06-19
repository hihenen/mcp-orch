"""Worker configuration model for persistent scheduler settings."""

from datetime import datetime
from sqlalchemy import Column, Integer, Boolean, DateTime, String, Text
from sqlalchemy.orm import Session

from .base import Base


class WorkerConfig(Base):
    """Worker configuration model for scheduler settings persistence."""
    
    __tablename__ = "worker_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Scheduler settings
    server_check_interval = Column(Integer, default=300, comment="Server status check interval in seconds")
    coalesce = Column(Boolean, default=True, comment="Merge duplicate jobs")
    max_instances = Column(Integer, default=1, comment="Maximum number of job instances")
    
    # Metadata
    description = Column(String(255), default="Worker Configuration", comment="Configuration description")
    notes = Column(Text, nullable=True, comment="Additional configuration notes")
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, comment="Configuration creation time")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="Last update time")
    
    def to_dict(self) -> dict:
        """Convert to dictionary for scheduler service."""
        return {
            'server_check_interval': self.server_check_interval,
            'coalesce': self.coalesce,
            'max_instances': self.max_instances,
        }
    
    @classmethod
    def get_default_config(cls) -> dict:
        """Get default configuration values."""
        return {
            'server_check_interval': 300,  # 5 minutes
            'coalesce': True,
            'max_instances': 1,
        }
    
    @classmethod
    def load_or_create_config(cls, db: Session) -> 'WorkerConfig':
        """Load existing config or create default one."""
        config = db.query(cls).first()
        
        if not config:
            # Create default configuration
            config = cls(
                server_check_interval=300,
                coalesce=True,
                max_instances=1,
                description="Default Worker Configuration",
                notes="Auto-generated default configuration"
            )
            db.add(config)
            db.commit()
            db.refresh(config)
            
        return config
    
    def update_from_dict(self, config_dict: dict) -> None:
        """Update configuration from dictionary."""
        if 'server_check_interval' in config_dict:
            self.server_check_interval = config_dict['server_check_interval']
        if 'coalesce' in config_dict:
            self.coalesce = config_dict['coalesce']
        if 'max_instances' in config_dict:
            self.max_instances = config_dict['max_instances']
        
        self.updated_at = datetime.utcnow()