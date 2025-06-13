#!/usr/bin/env python3
"""
관리자 사용자 생성 스크립트
"""

import asyncio
import bcrypt
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from src.mcp_orch.models.user import User
from src.mcp_orch.models.team import Team
from src.mcp_orch.models.base import Base
import os

# 데이터베이스 URL - 환경 변수에서 읽기
from dotenv import load_dotenv
load_dotenv("web/.env.local")

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ DATABASE_URL 환경 변수가 설정되지 않았습니다.")
    print("   web/.env.local 파일에서 DATABASE_URL을 확인해주세요.")
    exit(1)

# asyncpg를 위해 URL 변경
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

print(f"🔗 데이터베이스 연결: {DATABASE_URL.split('@')[0]}@***")

async def create_admin_user():
    """관리자 사용자 생성"""
    
    # 데이터베이스 엔진 생성
    engine = create_async_engine(DATABASE_URL, echo=True)
    
    # 세션 팩토리 생성
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session() as session:
        try:
            # 기존 사용자 확인
            existing_user = await session.get(User, "admin@test.com")
            if existing_user:
                print("✅ 관리자 사용자가 이미 존재합니다.")
                # 관리자 권한 업데이트
                existing_user.is_admin = True
                await session.commit()
                print("✅ 관리자 권한이 업데이트되었습니다.")
                return
            
            # 비밀번호 해시
            password_hash = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            # 관리자 사용자 생성 (간단한 버전)
            admin_user = User(
                id="admin@test.com",
                email="admin@test.com",
                name="Admin User",
                password_hash=password_hash,
                is_admin=True  # 관리자 권한 설정
            )
            session.add(admin_user)
            
            # 커밋
            await session.commit()
            
            print("✅ 관리자 사용자가 성공적으로 생성되었습니다!")
            print(f"   이메일: {admin_user.email}")
            print(f"   이름: {admin_user.name}")
            print(f"   관리자 권한: {admin_user.is_admin}")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ 오류 발생: {e}")
            raise
        finally:
            await engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_admin_user())
