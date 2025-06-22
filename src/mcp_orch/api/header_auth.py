"""Header-based authentication for NextAuth.js integration."""
import base64
from typing import Optional
from fastapi import HTTPException, status, Request
from sqlalchemy.orm import Session
from ..models.user import User
from ..database import get_db


def get_user_from_headers(request: Request, db: Session) -> Optional[User]:
    """Extract user information from NextAuth.js headers."""
    user_id = request.headers.get("X-User-ID")
    user_email = request.headers.get("X-User-Email")
    user_name = request.headers.get("X-User-Name")
    
    if not user_id or not user_email:
        return None
    
    # 사용자 이름 처리 (Base64 디코딩 제거 - NextAuth.js v5는 직접 전송)
    # user_name은 이미 위에서 헤더에서 가져옴
    
    # Find existing user by email
    user = db.query(User).filter(User.email == user_email).first()
    
    if not user:
        # Create new user if not exists
        user = User(
            email=user_email,
            name=user_name or user_email.split('@')[0],
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update user name if provided and different
        if user_name and user.name != user_name:
            user.name = user_name
            db.commit()
    
    return user


def require_user_from_headers(request: Request, db: Session) -> User:
    """Require user authentication from headers, raise exception if not found."""
    user = get_user_from_headers(request, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    return user
