#!/usr/bin/env python3
"""
임시 스크립트: 데이터베이스 스키마 확인
"""
import asyncio
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://postgres:1234@localhost:5432/mcp_orch"

def check_database_schema():
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # mcp_servers 테이블 스키마 확인
        result = conn.execute(text("""
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'mcp_servers' 
            ORDER BY ordinal_position;
        """))
        
        print("=== mcp_servers table schema ===")
        for row in result:
            print(f"{row.column_name}: {row.data_type} (nullable: {row.is_nullable}, default: {row.column_default})")
        
        # server_type 컬럼 존재 여부 확인
        result = conn.execute(text("""
            SELECT EXISTS(
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'mcp_servers' AND column_name = 'server_type'
            );
        """))
        
        server_type_exists = result.scalar()
        print(f"\nserver_type column exists: {server_type_exists}")
        
        # 기존 서버 개수 확인
        result = conn.execute(text("SELECT COUNT(*) FROM mcp_servers;"))
        server_count = result.scalar()
        print(f"Total servers in database: {server_count}")
        
        if server_type_exists:
            # server_type 값 분포 확인
            result = conn.execute(text("SELECT server_type, COUNT(*) FROM mcp_servers GROUP BY server_type;"))
            print("\nServer type distribution:")
            for row in result:
                print(f"  {row[0]}: {row[1]}")

if __name__ == "__main__":
    check_database_schema()