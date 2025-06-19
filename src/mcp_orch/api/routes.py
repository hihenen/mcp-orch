"""
API 라우터 등록
모든 API 엔드포인트를 중앙에서 관리
"""

from fastapi import APIRouter

from .projects import router as projects_router
from .project_security import router as project_security_router
from .project_members import router as project_members_router
from .project_servers import router as project_servers_router
from .project_api_keys import router as project_api_keys_router
from .project_favorites import router as project_favorites_router
from .teams import router as teams_router
from .organizations import router as organizations_router
from .users import router as users_router
from .admin_teams import router as admin_teams_router
from .admin_projects import router as admin_projects_router
from .tools import router as tools_router
from .servers import router as servers_router
from .server_logs import router as server_logs_router
from .auth import router as auth_router
from .mcp_sse_server import router as mcp_sse_router
from .cline_sse import router as cline_sse_router
from .project_sse import router as project_sse_router
from starlette.routing import Mount
from mcp.server.sse import SseServerTransport
from .mcp_proxy_mode import router as mcp_proxy_router

# 메인 API 라우터
api_router = APIRouter()

# 모든 라우터 등록
api_router.include_router(projects_router)
api_router.include_router(project_security_router)
api_router.include_router(project_members_router)
api_router.include_router(project_servers_router)
api_router.include_router(project_api_keys_router)
api_router.include_router(project_favorites_router)
api_router.include_router(teams_router)
api_router.include_router(organizations_router)
api_router.include_router(users_router)
api_router.include_router(admin_teams_router)
api_router.include_router(admin_projects_router)
api_router.include_router(tools_router)
api_router.include_router(servers_router)
api_router.include_router(server_logs_router)
api_router.include_router(auth_router)
api_router.include_router(mcp_sse_router)
api_router.include_router(cline_sse_router)
api_router.include_router(project_sse_router)
api_router.include_router(mcp_proxy_router)
