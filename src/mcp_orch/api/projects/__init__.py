"""
프로젝트 API 모듈
리팩토링된 프로젝트 관련 API 엔드포인트들을 통합
"""

from fastapi import APIRouter

# 개별 모듈의 라우터 import
from .favorites import router as favorites_router
from .api_keys import router as api_keys_router

# 메인 라우터 생성
router = APIRouter(prefix="/api", tags=["projects"])

# 서브 라우터들을 메인 라우터에 포함
router.include_router(favorites_router, tags=["favorites"])
router.include_router(api_keys_router, tags=["api-keys"])

# 향후 추가될 라우터들
# router.include_router(core_router, tags=["projects-core"])
# router.include_router(members_router, tags=["members"])
# router.include_router(servers_router, tags=["servers"])
# router.include_router(teams_router, tags=["teams"])

__all__ = ["router"]