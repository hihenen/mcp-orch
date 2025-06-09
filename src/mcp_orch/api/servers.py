"""Server management API endpoints."""
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.mcp_server import McpServer
from ..models.user import User
from .header_auth import get_user_from_headers

router = APIRouter(prefix="/api/servers", tags=["servers"])


# Pydantic models for API
class ServerResponse(BaseModel):
    """Server information."""
    id: str
    name: str
    description: Optional[str] = None
    status: str = "active"  # active, inactive, error
    tool_count: int = 0
    last_used: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CreateServerRequest(BaseModel):
    """Request to create a new server."""
    name: str = Field(..., description="Name of the server")
    description: Optional[str] = Field(None, description="Description of the server")


@router.get("/", response_model=List[ServerResponse])
async def get_servers(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get all servers that the current user has access to."""
    current_user = get_user_from_headers(request, db)
    
    # Get all servers (for now, return all servers)
    # TODO: Implement proper access control based on teams
    servers = db.query(McpServer).all()
    
    return [
        ServerResponse(
            id=str(server.id),
            name=server.name,
            description=server.description,
            status="active" if server.is_enabled else "inactive",
            tool_count=len(server.tools) if server.tools else 0,
            last_used=server.last_used_at,
            created_at=server.created_at,
            updated_at=server.updated_at
        )
        for server in servers
    ]


@router.post("/", response_model=ServerResponse)
async def create_server(
    server_request: CreateServerRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Create a new server."""
    current_user = get_user_from_headers(request, db)
    
    # Create server
    server = McpServer(
        name=server_request.name,
        description=server_request.description,
        is_enabled=True
    )
    
    db.add(server)
    db.commit()
    db.refresh(server)
    
    return ServerResponse(
        id=str(server.id),
        name=server.name,
        description=server.description,
        status="active",
        tool_count=0,
        last_used=None,
        created_at=server.created_at,
        updated_at=server.updated_at
    )


@router.get("/{server_id}", response_model=ServerResponse)
async def get_server(
    server_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Get a specific server."""
    current_user = get_user_from_headers(request, db)
    
    try:
        server_uuid = UUID(server_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid server ID format"
        )
    
    server = db.query(McpServer).filter(McpServer.id == server_uuid).first()
    if not server:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Server not found"
        )
    
    return ServerResponse(
        id=str(server.id),
        name=server.name,
        description=server.description,
        status="active" if server.is_enabled else "inactive",
        tool_count=len(server.tools) if server.tools else 0,
        last_used=server.last_used_at,
        created_at=server.created_at,
        updated_at=server.updated_at
    )


@router.delete("/{server_id}")
async def delete_server(
    server_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Delete a server."""
    current_user = get_user_from_headers(request, db)
    
    try:
        server_uuid = UUID(server_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid server ID format"
        )
    
    server = db.query(McpServer).filter(McpServer.id == server_uuid).first()
    if not server:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Server not found"
        )
    
    db.delete(server)
    db.commit()
    
    return {"message": "Server deleted successfully"}
