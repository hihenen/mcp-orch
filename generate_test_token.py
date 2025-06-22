#!/usr/bin/env python3
"""
테스트용 JWT 토큰 생성 스크립트
"""

import os
import json
from datetime import datetime, timezone, timedelta
from jose import jwt

# JWT 설정 (jwt_auth.py와 동일)
AUTH_SECRET = os.getenv("AUTH_SECRET", "your-secret-key-here-change-in-production")
ALGORITHM = "HS256"

def generate_test_token():
    """테스트용 JWT 토큰 생성"""
    
    # 테스트 사용자 정보
    payload = {
        "id": "test-user-123",
        "email": "test@example.com",
        "name": "Test User",
        "organizationId": "550e8400-e29b-41d4-a716-446655440000",
        "organizationRole": "admin",
        "organizationName": "Test Organization",
        "iat": int(datetime.now(timezone.utc).timestamp()),
        "exp": int((datetime.now(timezone.utc) + timedelta(hours=24)).timestamp())
    }
    
    # JWT 토큰 생성
    token = jwt.encode(payload, AUTH_SECRET, algorithm=ALGORITHM)
    
    return token, payload

if __name__ == "__main__":
    token, payload = generate_test_token()
    
    print("=== 테스트용 JWT 토큰 생성 완료 ===")
    print(f"토큰: {token}")
    print(f"\n페이로드:")
    print(json.dumps(payload, indent=2, ensure_ascii=False))
    print(f"\n만료 시간: {datetime.fromtimestamp(payload['exp'], tz=timezone.utc)}")
    print(f"\n프론트엔드에서 사용법:")
    print(f"localStorage.setItem('api_token', '{token}');")
