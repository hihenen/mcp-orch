"""
관리자 권한 부여 유틸리티

하이브리드 관리자 권한 부여 시스템:
1순위: INITIAL_ADMIN_EMAIL 환경변수에 지정된 이메일
2순위: 데이터베이스의 첫 번째 사용자 (자동 관리자)
"""

import logging
import os
from typing import Optional
from sqlalchemy.orm import Session

from ..models.user import User

logger = logging.getLogger(__name__)


def should_grant_admin_privileges(user_email: str, db: Session) -> tuple[bool, str]:
    """
    사용자에게 관리자 권한을 부여해야 하는지 결정합니다.
    
    Args:
        user_email: 확인할 사용자 이메일
        db: 데이터베이스 세션
        
    Returns:
        tuple[bool, str]: (권한부여여부, 부여사유)
    """
    try:
        # 1순위: 환경변수에 지정된 초기 관리자 이메일
        initial_admin_email = os.getenv('INITIAL_ADMIN_EMAIL')
        if initial_admin_email and user_email == initial_admin_email:
            logger.info(f"Admin privileges granted to {user_email} (specified in INITIAL_ADMIN_EMAIL)")
            return True, "INITIAL_ADMIN_EMAIL 환경변수에 지정된 관리자"
        
        # 2순위: 첫 번째 사용자 (데이터베이스에 사용자가 없을 때)
        user_count = db.query(User).count()
        if user_count == 0:
            logger.info(f"Admin privileges granted to {user_email} (first user in database)")
            return True, "데이터베이스 첫 번째 사용자 (자동 관리자)"
        
        # 관리자 권한 부여 조건에 해당하지 않음
        return False, "관리자 권한 부여 조건 미충족"
        
    except Exception as e:
        logger.error(f"Error checking admin privileges for {user_email}: {e}")
        return False, f"관리자 권한 확인 중 오류: {str(e)}"


def create_user_with_auto_admin(
    email: str, 
    name: str, 
    db: Session,
    password: Optional[str] = None,
    provider: Optional[str] = None,
    provider_id: Optional[str] = None,
    id: Optional[str] = None,
    **kwargs
) -> tuple[User, bool, str]:
    """
    사용자를 생성하고 하이브리드 로직에 따라 관리자 권한을 자동 부여합니다.
    
    Args:
        email: 사용자 이메일
        name: 사용자 이름
        db: 데이터베이스 세션
        password: 비밀번호 (선택적)
        provider: OAuth 제공자 (선택적)
        provider_id: OAuth 제공자 ID (선택적)
        **kwargs: 추가 사용자 속성
        
    Returns:
        tuple[User, bool, str]: (생성된사용자, 관리자권한부여여부, 부여사유)
    """
    try:
        # 관리자 권한 부여 여부 확인 (사용자 생성 전에 확인)
        should_be_admin, admin_reason = should_grant_admin_privileges(email, db)
        
        # 사용자 생성
        user_data = {
            "email": email,
            "name": name,
            "password": password,
            "provider": provider,
            "provider_id": provider_id,
            "is_admin": should_be_admin,  # 하이브리드 로직 결과 적용
            **kwargs
        }
        
        # id가 제공된 경우 추가 (JWT 인증 시)
        if id is not None:
            user_data["id"] = id
            
        user = User(**user_data)
        
        # 데이터베이스에 저장
        db.add(user)
        db.commit()
        db.refresh(user)
        
        if should_be_admin:
            logger.info(f"✅ User {email} created with admin privileges: {admin_reason}")
        else:
            logger.info(f"👤 User {email} created without admin privileges: {admin_reason}")
            
        return user, should_be_admin, admin_reason
        
    except Exception as e:
        logger.error(f"Error creating user {email}: {e}")
        db.rollback()
        raise


def update_existing_user_admin_privileges(user: User, db: Session) -> tuple[bool, str]:
    """
    기존 사용자의 관리자 권한을 하이브리드 로직에 따라 업데이트합니다.
    
    Args:
        user: 업데이트할 사용자 객체
        db: 데이터베이스 세션
        
    Returns:
        tuple[bool, str]: (권한변경여부, 변경사유)
    """
    try:
        original_admin_status = user.is_admin
        should_be_admin, admin_reason = should_grant_admin_privileges(user.email, db)
        
        if should_be_admin and not original_admin_status:
            # 관리자 권한 부여
            user.is_admin = True
            db.commit()
            logger.info(f"✅ Admin privileges granted to existing user {user.email}: {admin_reason}")
            return True, f"관리자 권한 부여: {admin_reason}"
            
        elif original_admin_status and not should_be_admin:
            # 관리자 권한 제거 (환경변수에서 제거된 경우)
            # 단, 첫 번째 사용자는 권한 유지
            user_count = db.query(User).count()
            if user_count > 1:  # 다른 사용자가 있으면 권한 제거 가능
                user.is_admin = False
                db.commit()
                logger.info(f"⚠️ Admin privileges revoked from user {user.email}: {admin_reason}")
                return True, f"관리자 권한 제거: {admin_reason}"
            else:
                logger.info(f"🔒 Admin privileges retained for user {user.email} (only user in database)")
                return False, "유일한 사용자로 관리자 권한 유지"
        
        # 권한 변경 필요 없음
        return False, "관리자 권한 변경 필요 없음"
        
    except Exception as e:
        logger.error(f"Error updating admin privileges for {user.email}: {e}")
        db.rollback()
        return False, f"권한 업데이트 중 오류: {str(e)}"


def get_admin_status_info(db: Session) -> dict:
    """
    현재 관리자 권한 상태 정보를 반환합니다.
    
    Args:
        db: 데이터베이스 세션
        
    Returns:
        dict: 관리자 권한 상태 정보
    """
    try:
        total_users = db.query(User).count()
        admin_users = db.query(User).filter(User.is_admin == True).count()
        initial_admin_email = os.getenv('INITIAL_ADMIN_EMAIL')
        
        # 초기 관리자가 설정되어 있고 존재하는지 확인
        initial_admin_exists = False
        if initial_admin_email:
            initial_admin_user = db.query(User).filter(User.email == initial_admin_email).first()
            initial_admin_exists = initial_admin_user is not None and initial_admin_user.is_admin
        
        return {
            "total_users": total_users,
            "admin_users": admin_users,
            "initial_admin_email": initial_admin_email,
            "initial_admin_exists": initial_admin_exists,
            "first_user_auto_admin": total_users == 0,  # 다음 사용자가 자동 관리자가 될지
        }
        
    except Exception as e:
        logger.error(f"Error getting admin status info: {e}")
        return {
            "error": str(e)
        }