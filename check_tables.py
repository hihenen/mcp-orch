#!/usr/bin/env python3
"""
데이터베이스 테이블 및 컬럼 확인 스크립트
"""

import asyncio
import asyncpg


async def check_tables():
    conn = await asyncpg.connect('postgresql://postgres:1234@localhost:5432/mcp_orch')
    
    # 모든 테이블 목록
    tables = await conn.fetch("""
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' AND tablename != 'alembic_version'
        ORDER BY tablename;
    """)
    
    print('=== CREATED TABLES ===')
    for table in tables:
        print(f'📋 {table["tablename"]}')
    print()
    
    # 각 테이블의 컬럼 수 확인
    print('=== TABLE COLUMN COUNTS ===')
    for table in tables:
        table_name = table['tablename']
        columns = await conn.fetch("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = $1 
            ORDER BY ordinal_position;
        """, table_name)
        print(f'{table_name}: {len(columns)} columns')
    
    # 특정 테이블들의 상세 정보 확인
    check_tables = ['api_keys', 'api_usage', 'teams', 'team_members', 'client_sessions']
    print('\n=== SPECIFIC TABLE DETAILS ===')
    for table_name in check_tables:
        if any(t['tablename'] == table_name for t in tables):
            columns = await conn.fetch("""
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = $1 
                ORDER BY ordinal_position;
            """, table_name)
            print(f'\n📋 {table_name.upper()} ({len(columns)} columns):')
            for col in columns:
                nullable = '🔸' if col['is_nullable'] == 'YES' else '🔹'
                print(f'  {nullable} {col["column_name"]} ({col["data_type"]})')
    
    await conn.close()


if __name__ == "__main__":
    asyncio.run(check_tables())