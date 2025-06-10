"""
프로젝트 중심 SSE 엔드포인트
프로젝트별 MCP 서버 접근 및 권한 제어
"""

from typing import Dict, Any, Optional
from uuid import UUID
import json
import logging

from fastapi import APIRouter, Request, HTTPException, status, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ..database import get_db
from ..models import Project, ProjectMember, User, McpServer, ApiKey
from .jwt_auth import get_user_from_jwt_token
from ..core.controller import DualModeController

logger = logging.getLogger(__name__)

router = APIRouter(tags=["project-sse"])


# 사용자 인증 dependency 함수
async def get_current_user_for_project_sse(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    """프로젝트 SSE API용 사용자 인증 함수"""
    user = await get_user_from_jwt_token(request, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    return user


async def _verify_project_access(
    project_id: UUID,
    current_user: User,
    db: Session
) -> Project:
    """프로젝트 접근 권한 확인"""
    
    # 프로젝트 멤버십 확인
    project_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id
        )
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied"
        )
    
    # 프로젝트 조회
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    return project


async def _verify_project_server_access(
    project_id: UUID,
    server_name: str,
    current_user: User,
    db: Session
) -> McpServer:
    """프로젝트 서버 접근 권한 확인"""
    
    # 프로젝트 접근 권한 확인
    await _verify_project_access(project_id, current_user, db)
    
    # 서버 존재 및 프로젝트 소속 확인
    server = db.query(McpServer).filter(
        and_(
            McpServer.project_id == project_id,
            McpServer.name == server_name
        )
    ).first()
    
    if not server:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Server '{server_name}' not found in this project"
        )
    
    return server


# 프로젝트별 SSE 엔드포인트
@router.get("/projects/{project_id}/servers/{server_name}/sse")
async def project_server_sse_endpoint(
    project_id: UUID,
    server_name: str,
    request: Request,
    current_user: User = Depends(get_current_user_for_project_sse),
    db: Session = Depends(get_db)
):
    """프로젝트별 MCP 서버 SSE 엔드포인트"""
    
    try:
        # 프로젝트 서버 접근 권한 확인
        server = await _verify_project_server_access(project_id, server_name, current_user, db)
        
        logger.info(f"Project SSE connection: project_id={project_id}, server={server_name}, user={current_user.email}")
        
        # Controller에서 SSE 핸들러 가져오기
        controller = DualModeController()
        
        # 프로젝트별 고유 키 생성
        project_server_key = f"project:{project_id}:{server_name}"
        
        # SSE 핸들러 호출
        if hasattr(controller, 'handle_sse_request'):
            return await controller.handle_sse_request(request, project_server_key)
        else:
            # 기존 방식 호환성
            return await controller.handle_sse(request, server_name)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Project SSE error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.post("/projects/{project_id}/servers/{server_name}/messages")
async def project_server_messages_endpoint(
    project_id: UUID,
    server_name: str,
    request: Request,
    current_user: User = Depends(get_current_user_for_project_sse),
    db: Session = Depends(get_db)
):
    """프로젝트별 MCP 서버 메시지 엔드포인트"""
    
    try:
        # 프로젝트 서버 접근 권한 확인
        server = await _verify_project_server_access(project_id, server_name, current_user, db)
        
        logger.info(f"Project message: project_id={project_id}, server={server_name}, user={current_user.email}")
        
        # 요청 본문 읽기
        body = await request.body()
        
        # Controller에서 메시지 핸들러 가져오기
        controller = DualModeController()
        
        # 프로젝트별 고유 키 생성
        project_server_key = f"project:{project_id}:{server_name}"
        
        # 메시지 핸들러 호출
        if hasattr(controller, 'handle_message_request'):
            return await controller.handle_message_request(body, project_server_key)
        else:
            # 기존 방식 호환성
            return await controller.handle_message(body, server_name)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Project message error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


# 프로젝트별 서버 관리 API
@router.get("/projects/{project_id}/servers")
async def list_project_servers(
    project_id: UUID,
    current_user: User = Depends(get_current_user_for_project_sse),
    db: Session = Depends(get_db)
):
    """프로젝트의 MCP 서버 목록 조회"""
    
    # 프로젝트 접근 권한 확인
    await _verify_project_access(project_id, current_user, db)
    
    # 프로젝트 서버 목록 조회
    servers = db.query(McpServer).filter(
        McpServer.project_id == project_id
    ).all()
    
    result = []
    for server in servers:
        result.append({
            "id": str(server.id),
            "name": server.name,
            "command": server.command,
            "args": server.args,
            "env": server.env,
            "disabled": server.disabled,
            "status": server.status.value if server.status else "unknown",
            "created_at": server.created_at.isoformat() if server.created_at else None,
            "updated_at": server.updated_at.isoformat() if server.updated_at else None
        })
    
    return result


@router.post("/projects/{project_id}/servers")
async def add_project_server(
    project_id: UUID,
    server_data: Dict[str, Any],
    current_user: User = Depends(get_current_user_for_project_sse),
    db: Session = Depends(get_db)
):
    """프로젝트에 MCP 서버 추가 (Owner/Developer만 가능)"""
    
    # 프로젝트 접근 권한 확인 (Owner/Developer)
    project_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
            ProjectMember.role.in_(["owner", "developer"])
        )
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owners and developers can add servers"
        )
    
    # 서버명 중복 확인
    existing_server = db.query(McpServer).filter(
        and_(
            McpServer.project_id == project_id,
            McpServer.name == server_data.get("name")
        )
    ).first()
    
    if existing_server:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Server name already exists in this project"
        )
    
    # 서버 생성
    server = McpServer(
        project_id=project_id,
        name=server_data.get("name"),
        command=server_data.get("command"),
        args=server_data.get("args", []),
        env=server_data.get("env", {}),
        disabled=server_data.get("disabled", False),
        description=server_data.get("description"),
        cwd=server_data.get("cwd")
    )
    
    db.add(server)
    db.commit()
    db.refresh(server)
    
    return {
        "id": str(server.id),
        "name": server.name,
        "command": server.command,
        "args": server.args,
        "env": server.env,
        "disabled": server.disabled,
        "status": server.status.value if server.status else "unknown",
        "created_at": server.created_at.isoformat() if server.created_at else None,
        "updated_at": server.updated_at.isoformat() if server.updated_at else None
    }


@router.put("/projects/{project_id}/servers/{server_id}")
async def update_project_server(
    project_id: UUID,
    server_id: UUID,
    server_data: Dict[str, Any],
    current_user: User = Depends(get_current_user_for_project_sse),
    db: Session = Depends(get_db)
):
    """프로젝트 MCP 서버 정보 수정 (Owner/Developer만 가능)"""
    
    # 프로젝트 접근 권한 확인 (Owner/Developer)
    project_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
            ProjectMember.role.in_(["owner", "developer"])
        )
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owners and developers can update servers"
        )
    
    # 서버 존재 및 프로젝트 소속 확인
    server = db.query(McpServer).filter(
        and_(
            McpServer.id == server_id,
            McpServer.project_id == project_id
        )
    ).first()
    
    if not server:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Server not found in this project"
        )
    
    # 서버명 변경 시 중복 확인
    if "name" in server_data and server_data["name"] != server.name:
        existing_server = db.query(McpServer).filter(
            and_(
                McpServer.project_id == project_id,
                McpServer.name == server_data["name"],
                McpServer.id != server_id
            )
        ).first()
        
        if existing_server:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Server name already exists in this project"
            )
    
    # 서버 정보 업데이트
    if "name" in server_data:
        server.name = server_data["name"]
    if "command" in server_data:
        server.command = server_data["command"]
    if "args" in server_data:
        server.args = server_data["args"]
    if "env" in server_data:
        server.env = server_data["env"]
    if "disabled" in server_data:
        server.disabled = server_data["disabled"]
    
    from datetime import datetime
    server.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(server)
    
    return {
        "id": str(server.id),
        "name": server.name,
        "command": server.command,
        "args": server.args,
        "env": server.env,
        "disabled": server.disabled,
        "status": server.status.value if server.status else "unknown",
        "created_at": server.created_at.isoformat() if server.created_at else None,
        "updated_at": server.updated_at.isoformat() if server.updated_at else None
    }


@router.delete("/projects/{project_id}/servers/{server_id}")
async def delete_project_server(
    project_id: UUID,
    server_id: UUID,
    current_user: User = Depends(get_current_user_for_project_sse),
    db: Session = Depends(get_db)
):
    """프로젝트에서 MCP 서버 삭제 (Owner/Developer만 가능)"""
    
    # 프로젝트 접근 권한 확인 (Owner/Developer)
    project_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
            ProjectMember.role.in_(["owner", "developer"])
        )
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owners and developers can delete servers"
        )
    
    # 서버 존재 및 프로젝트 소속 확인
    server = db.query(McpServer).filter(
        and_(
            McpServer.id == server_id,
            McpServer.project_id == project_id
        )
    ).first()
    
    if not server:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Server not found in this project"
        )
    
    # 서버 삭제
    server_name = server.name
    db.delete(server)
    db.commit()
    
    return {"message": f"Server '{server_name}' deleted successfully"}


@router.post("/projects/{project_id}/servers/{server_id}/toggle")
async def toggle_project_server(
    project_id: UUID,
    server_id: UUID,
    current_user: User = Depends(get_current_user_for_project_sse),
    db: Session = Depends(get_db)
):
    """프로젝트 MCP 서버 활성화/비활성화 토글 (Owner/Developer만 가능)"""
    
    # 프로젝트 접근 권한 확인 (Owner/Developer)
    project_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
            ProjectMember.role.in_(["owner", "developer"])
        )
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owners and developers can toggle servers"
        )
    
    # 서버 존재 및 프로젝트 소속 확인
    server = db.query(McpServer).filter(
        and_(
            McpServer.id == server_id,
            McpServer.project_id == project_id
        )
    ).first()
    
    if not server:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Server not found in this project"
        )
    
    # 서버 상태 토글
    server.disabled = not server.disabled
    
    from datetime import datetime
    server.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(server)
    
    action = "disabled" if server.disabled else "enabled"
    
    return {
        "message": f"Server '{server.name}' {action} successfully",
        "server": {
            "id": str(server.id),
            "name": server.name,
            "disabled": server.disabled,
            "status": server.status.value if server.status else "unknown",
            "updated_at": server.updated_at.isoformat() if server.updated_at else None
        }
    }


# 프로젝트별 API 키 관리
@router.get("/projects/{project_id}/api-keys")
async def list_project_api_keys(
    project_id: UUID,
    current_user: User = Depends(get_current_user_for_project_sse),
    db: Session = Depends(get_db)
):
    """프로젝트 API 키 목록 조회 (Owner/Developer만 가능)"""
    
    # 프로젝트 접근 권한 확인 (Owner/Developer)
    project_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
            ProjectMember.role.in_(["owner", "developer"])
        )
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owners and developers can view API keys"
        )
    
    # API 키 목록 조회
    api_keys = db.query(ApiKey).filter(
        ApiKey.project_id == project_id
    ).all()
    
    result = []
    for key in api_keys:
        result.append({
            "id": str(key.id),
            "name": key.name,
            "key_prefix": key.key_prefix,
            "is_active": key.is_active,
            "expires_at": key.expires_at.isoformat() if key.expires_at else None,
            "last_used_at": key.last_used_at.isoformat() if key.last_used_at else None,
            "created_at": key.created_at.isoformat() if key.created_at else None
        })
    
    return result


@router.post("/projects/{project_id}/api-keys")
async def create_project_api_key(
    project_id: UUID,
    key_data: Dict[str, Any],
    current_user: User = Depends(get_current_user_for_project_sse),
    db: Session = Depends(get_db)
):
    """프로젝트 API 키 생성 (Owner만 가능)"""
    
    # 프로젝트 Owner 권한 확인
    project_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
            ProjectMember.role == "owner"
        )
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owners can create API keys"
        )
    
    # API 키 생성 로직은 기존 ApiKey 모델의 generate_api_key 함수 활용
    from ..models.api_key import generate_api_key
    import hashlib
    
    api_key = generate_api_key()
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()
    key_prefix = api_key[:10]
    
    # API 키 저장
    new_key = ApiKey(
        project_id=project_id,
        name=key_data.get("name", "Default API Key"),
        key_hash=key_hash,
        key_prefix=key_prefix,
        created_by_id=current_user.id,
        permissions=key_data.get("permissions", {})
    )
    
    db.add(new_key)
    db.commit()
    db.refresh(new_key)
    
    return {
        "id": str(new_key.id),
        "name": new_key.name,
        "api_key": api_key,  # 생성 시에만 반환
        "key_prefix": new_key.key_prefix,
        "is_active": new_key.is_active,
        "expires_at": new_key.expires_at.isoformat() if new_key.expires_at else None,
        "created_at": new_key.created_at.isoformat() if new_key.created_at else None
    }


@router.delete("/projects/{project_id}/api-keys/{key_id}")
async def delete_project_api_key(
    project_id: UUID,
    key_id: UUID,
    current_user: User = Depends(get_current_user_for_project_sse),
    db: Session = Depends(get_db)
):
    """프로젝트 API 키 삭제 (Owner/Developer만 가능)"""
    
    # 프로젝트 권한 확인 (Owner 또는 Developer)
    project_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
            ProjectMember.role.in_(["owner", "developer"])
        )
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owners and developers can delete API keys"
        )
    
    # API 키 조회
    api_key = db.query(ApiKey).filter(
        and_(
            ApiKey.id == key_id,
            ApiKey.project_id == project_id
        )
    ).first()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    # API 키 삭제
    key_name = api_key.name
    db.delete(api_key)
    db.commit()
    
    return {"message": f"API key '{key_name}' deleted successfully"}


# 프로젝트별 Cline 설정 생성
@router.get("/projects/{project_id}/cline-config")
async def get_project_cline_config(
    project_id: UUID,
    current_user: User = Depends(get_current_user_for_project_sse),
    db: Session = Depends(get_db)
):
    """프로젝트별 Cline 설정 파일 자동 생성"""
    
    # 프로젝트 접근 권한 확인
    project = await _verify_project_access(project_id, current_user, db)
    
    # 프로젝트 서버 목록 조회
    servers = db.query(McpServer).filter(
        and_(
            McpServer.project_id == project_id,
            McpServer.disabled == False
        )
    ).all()
    
    # 프로젝트 API 키 조회 (첫 번째 활성 키 사용)
    api_key = db.query(ApiKey).filter(
        and_(
            ApiKey.project_id == project_id,
            ApiKey.is_active == True
        )
    ).first()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active API key found for this project. Please create an API key first."
        )
    
    # Cline 설정 생성
    mcp_servers = {}
    base_url = "http://localhost:8000"  # 환경 변수로 설정 가능
    
    for server in servers:
        mcp_servers[server.name] = {
            "transport": "sse",
            "url": f"{base_url}/projects/{project_id}/servers/{server.name}/sse",
            "headers": {
                "Authorization": f"Bearer {api_key.key_prefix}..."  # 보안상 prefix만 표시
            }
        }
    
    config = {
        "mcpServers": mcp_servers
    }
    
    return {
        "project_id": str(project_id),
        "project_name": project.name,
        "config": config,
        "instructions": {
            "1": "Copy the configuration below to your Cline MCP settings",
            "2": f"Replace '{api_key.key_prefix}...' with your actual API key",
            "3": "Save and restart Cline to apply the changes"
        }
    }


# Discovery 엔드포인트
@router.get("/projects/{project_id}/.well-known/mcp-servers")
async def project_mcp_discovery(
    project_id: UUID,
    current_user: User = Depends(get_current_user_for_project_sse),
    db: Session = Depends(get_db)
):
    """프로젝트별 MCP 서버 자동 발견 엔드포인트"""
    
    # 프로젝트 접근 권한 확인
    project = await _verify_project_access(project_id, current_user, db)
    
    # 활성 서버 목록 조회
    servers = db.query(McpServer).filter(
        and_(
            McpServer.project_id == project_id,
            McpServer.disabled == False
        )
    ).all()
    
    # 서버 정보 구성
    server_info = {}
    base_url = "http://localhost:8000"
    
    for server in servers:
        server_info[server.name] = {
            "name": server.name,
            "description": f"MCP Server: {server.name}",
            "sse_endpoint": f"{base_url}/projects/{project_id}/servers/{server.name}/sse",
            "message_endpoint": f"{base_url}/projects/{project_id}/servers/{server.name}/messages",
            "status": server.status.value if server.status else "unknown",
            "transport": "sse"
        }
    
    return {
        "project": {
            "id": str(project.id),
            "name": project.name,
            "slug": project.slug
        },
        "servers": server_info,
        "total_servers": len(servers),
        "discovery_url": f"{base_url}/projects/{project_id}/.well-known/mcp-servers"
    }
