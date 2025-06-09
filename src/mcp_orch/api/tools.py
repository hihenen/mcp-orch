"""Tool management API endpoints."""
from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.mcp_server import McpServer
from ..models.user import User
from .header_auth import get_user_from_headers

router = APIRouter(prefix="/api/tools", tags=["tools"])


# Pydantic models for API
class ToolResponse(BaseModel):
    """Tool information."""
    id: str
    name: str
    description: Optional[str] = None
    server_name: str
    server_id: str
    usage_count: int = 0
    last_used: Optional[datetime] = None
    parameters: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class ExecuteToolRequest(BaseModel):
    """Request to execute a tool."""
    tool_name: str = Field(..., description="Name of the tool to execute")
    server_id: str = Field(..., description="ID of the server containing the tool")
    parameters: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Tool parameters")


class ToolExecutionResponse(BaseModel):
    """Tool execution result."""
    success: bool
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    execution_time: Optional[float] = None


@router.get("/", response_model=List[ToolResponse])
async def get_tools(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get all tools that the current user has access to."""
    current_user = get_user_from_headers(request, db)
    
    # Get all servers and their tools
    servers = db.query(McpServer).filter(McpServer.is_enabled == True).all()
    
    tools = []
    for server in servers:
        if server.tools:
            for tool in server.tools:
                tools.append(
                    ToolResponse(
                        id=f"{server.id}_{tool.name}",
                        name=tool.name,
                        description=tool.description,
                        server_name=server.name,
                        server_id=str(server.id),
                        usage_count=tool.call_count or 0,
                        last_used=tool.last_called_at,
                        parameters=tool.input_schema
                    )
                )
    
    return tools


@router.get("/servers/{server_id}", response_model=List[ToolResponse])
async def get_server_tools(
    server_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Get all tools for a specific server."""
    current_user = get_user_from_headers(request, db)
    
    try:
        server_uuid = UUID(server_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid server ID format"
        )
    
    server = db.query(McpServer).filter(
        McpServer.id == server_uuid,
        McpServer.is_enabled == True
    ).first()
    
    if not server:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Server not found or disabled"
        )
    
    tools = []
    if server.tools:
        for tool in server.tools:
            tools.append(
                ToolResponse(
                    id=f"{server.id}_{tool.name}",
                    name=tool.name,
                    description=tool.description,
                    server_name=server.name,
                    server_id=str(server.id),
                    usage_count=tool.call_count or 0,
                    last_used=tool.last_called_at,
                    parameters=tool.input_schema
                )
            )
    
    return tools


@router.post("/execute", response_model=ToolExecutionResponse)
async def execute_tool(
    execute_request: ExecuteToolRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Execute a tool."""
    current_user = get_user_from_headers(request, db)
    
    try:
        server_uuid = UUID(execute_request.server_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid server ID format"
        )
    
    server = db.query(McpServer).filter(
        McpServer.id == server_uuid,
        McpServer.is_enabled == True
    ).first()
    
    if not server:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Server not found or disabled"
        )
    
    # Find the tool
    tool = None
    if server.tools:
        for t in server.tools:
            if t.name == execute_request.tool_name:
                tool = t
                break
    
    if not tool:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tool '{execute_request.tool_name}' not found on server '{server.name}'"
        )
    
    # TODO: Implement actual tool execution
    # For now, return a mock response
    import time
    start_time = time.time()
    
    try:
        # Mock execution - replace with actual MCP tool execution
        result = {
            "message": f"Tool '{execute_request.tool_name}' executed successfully",
            "parameters": execute_request.parameters,
            "server": server.name,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        execution_time = time.time() - start_time
        
        # Update tool usage statistics
        tool.call_count = (tool.call_count or 0) + 1
        tool.last_called_at = datetime.utcnow()
        server.last_used_at = datetime.utcnow()
        
        db.commit()
        
        return ToolExecutionResponse(
            success=True,
            result=result,
            execution_time=execution_time
        )
        
    except Exception as e:
        execution_time = time.time() - start_time
        return ToolExecutionResponse(
            success=False,
            error=str(e),
            execution_time=execution_time
        )


@router.get("/{tool_id}", response_model=ToolResponse)
async def get_tool(
    tool_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Get a specific tool."""
    current_user = get_user_from_headers(request, db)
    
    # Parse tool_id (format: server_id_tool_name)
    try:
        parts = tool_id.split('_', 1)
        if len(parts) != 2:
            raise ValueError("Invalid tool ID format")
        
        server_uuid = UUID(parts[0])
        tool_name = parts[1]
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid tool ID format. Expected: server_id_tool_name"
        )
    
    server = db.query(McpServer).filter(
        McpServer.id == server_uuid,
        McpServer.is_enabled == True
    ).first()
    
    if not server:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Server not found or disabled"
        )
    
    # Find the tool
    tool = None
    if server.tools:
        for t in server.tools:
            if t.name == tool_name:
                tool = t
                break
    
    if not tool:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tool '{tool_name}' not found on server '{server.name}'"
        )
    
    return ToolResponse(
        id=tool_id,
        name=tool.name,
        description=tool.description,
        server_name=server.name,
        server_id=str(server.id),
        usage_count=tool.call_count or 0,
        last_used=tool.last_called_at,
        parameters=tool.input_schema
    )
