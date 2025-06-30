"""
초기 관리자 계정 생성 서비스

서버 시작 시 환경변수에 설정된 관리자 계정을 자동으로 생성하거나 권한을 부여합니다.
"""

import logging
from typing import Optional
from sqlalchemy.orm import Session

from ..models.user import User
from ..database import get_db
from ..config import Settings

logger = logging.getLogger(__name__)


async def initialize_admin_user(settings: Settings) -> Optional[str]:
    """
    환경변수 기반 초기 관리자 계정 생성/업데이트
    
    Args:
        settings: 애플리케이션 설정
        
    Returns:
        처리 결과 메시지 (성공/실패/스킵)
    """
    try:
        # 초기 관리자 설정 확인
        admin_email = settings.security.initial_admin_email
        
        if not admin_email:
            logger.info("INITIAL_ADMIN_EMAIL이 설정되지 않음. 관리자 초기화 스킵.")
            return "초기 관리자 설정이 없음 - 스킵"
        
        logger.info(f"초기 관리자 설정 발견: {admin_email}")
        
        # 데이터베이스 세션 생성
        db = next(get_db())
        try:
            # 기존 사용자 확인
            existing_user = db.query(User).filter(User.email == admin_email).first()
            
            if existing_user:
                # 하이브리드 로직을 사용한 기존 사용자 권한 업데이트
                from .admin_utils import update_existing_user_admin_privileges
                
                privilege_changed, change_reason = update_existing_user_admin_privileges(existing_user, db)
                
                if privilege_changed:
                    logger.info(f"사용자 {admin_email} 권한 업데이트 완료: {change_reason}")
                    return f"사용자 {admin_email} 권한 업데이트: {change_reason}"
                else:
                    logger.info(f"사용자 {admin_email} 권한 변경 없음: {change_reason}")
                    return f"사용자 {admin_email}: {change_reason}"
            else:
                # 새 관리자 계정 생성 비활성화 - 기존 사용자만 권한 부여
                logger.info(f"사용자 {admin_email}이 존재하지 않음. 자동 계정 생성이 비활성화되었습니다. 먼저 회원가입을 완료해주세요.")
                return f"사용자 {admin_email}이 존재하지 않음 - 먼저 회원가입 필요"
                
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"초기 관리자 계정 생성 실패: {e}")
        return f"초기 관리자 계정 생성 실패: {str(e)}"