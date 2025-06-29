"""
Teams API 모듈화 라우터 통합
모든 팀 관련 API 엔드포인트를 단일 라우터로 통합
"""

from fastapi import APIRouter

from . import core, members, api_keys, projects, settings, activity

# 메인 팀 라우터 생성
router = APIRouter(prefix="/api/teams", tags=["teams"])

# 서브 라우터들을 메인 라우터에 포함
router.include_router(core.router, tags=["teams-core"])
router.include_router(members.router, tags=["teams-members"])
router.include_router(api_keys.router, tags=["teams-api-keys"])
router.include_router(projects.router, tags=["teams-projects"])
router.include_router(settings.router, tags=["teams-settings"])
router.include_router(activity.router, tags=["teams-activity"])

# 하위 호환성을 위한 라우터 정보
__all__ = ['router']

# 리팩토링 정보
__refactoring_info__ = {
    "original_file": "teams.py",
    "original_lines": 1069,
    "new_modules": 7,
    "total_endpoints": 14,
    "refactoring_date": "2025-06-29",
    "modules": {
        "common.py": "공통 구성 요소 (Pydantic 모델, 헬퍼 함수)",
        "core.py": "팀 기본 CRUD (3개 엔드포인트)",
        "members.py": "멤버 관리 (4개 엔드포인트)",
        "api_keys.py": "API 키 관리 (3개 엔드포인트)",
        "projects.py": "프로젝트 관리 (2개 엔드포인트)",
        "settings.py": "설정 관리 (1개 엔드포인트)",
        "activity.py": "활동 피드 (1개 엔드포인트)"
    }
}