#!/usr/bin/env python3
"""
전체 모델과 데이터베이스 스키마 비교 도구
모든 불일치를 한 번에 찾아서 수정 계획을 제시합니다.
"""

import asyncio
import asyncpg
import importlib
import inspect
from pathlib import Path
from sqlalchemy import Column
from sqlalchemy.sql.sqltypes import TypeEngine


async def get_all_database_schemas():
    """데이터베이스의 모든 테이블 스키마를 가져옵니다."""
    conn = await asyncpg.connect('postgresql://postgres:1234@localhost:5432/mcp_orch')
    
    # 모든 테이블 목록 가져오기
    tables_result = await conn.fetch("""
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' AND tablename != 'alembic_version'
        ORDER BY tablename;
    """)
    
    table_schemas = {}
    
    for table_row in tables_result:
        table_name = table_row['tablename']
        
        # 각 테이블의 컬럼 정보 가져오기
        columns_result = await conn.fetch("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = $1 
            ORDER BY ordinal_position;
        """, table_name)
        
        table_schemas[table_name] = {
            'columns': {row['column_name']: {
                'type': row['data_type'],
                'nullable': row['is_nullable'] == 'YES',
                'default': row['column_default']
            } for row in columns_result}
        }
    
    await conn.close()
    return table_schemas


def get_all_model_schemas():
    """모든 SQLAlchemy 모델의 예상 스키마를 가져옵니다."""
    models_dir = Path("src/mcp_orch/models")
    model_schemas = {}
    
    # 모든 모델 파일 찾기
    for model_file in models_dir.glob("*.py"):
        if model_file.name.startswith("__"):
            continue
            
        module_name = f"mcp_orch.models.{model_file.stem}"
        try:
            module = importlib.import_module(module_name)
            
            # 모듈에서 Base를 상속받는 클래스 찾기
            for name, obj in inspect.getmembers(module):
                if (inspect.isclass(obj) and 
                    hasattr(obj, '__tablename__') and 
                    hasattr(obj, '__table__')):
                    
                    table_name = obj.__tablename__
                    columns = {}
                    
                    # 모델의 컬럼 정보 추출
                    for column_name, column_obj in obj.__table__.columns.items():
                        column_type = str(column_obj.type)
                        columns[column_name] = {
                            'type': column_type,
                            'nullable': column_obj.nullable,
                            'default': column_obj.default,
                            'primary_key': column_obj.primary_key
                        }
                    
                    model_schemas[table_name] = {
                        'model_class': name,
                        'file': model_file.name,
                        'columns': columns
                    }
                    
        except ImportError as e:
            print(f"Warning: Could not import {module_name}: {e}")
            continue
    
    return model_schemas


def compare_schemas(db_schemas, model_schemas):
    """데이터베이스와 모델 스키마를 비교합니다."""
    comparison_results = {
        'missing_tables': [],
        'extra_tables': [],
        'table_differences': {}
    }
    
    # 테이블 존재 여부 비교
    db_tables = set(db_schemas.keys())
    model_tables = set(model_schemas.keys())
    
    comparison_results['missing_tables'] = list(model_tables - db_tables)
    comparison_results['extra_tables'] = list(db_tables - model_tables)
    
    # 공통 테이블의 컬럼 비교
    common_tables = db_tables & model_tables
    
    for table_name in common_tables:
        db_columns = set(db_schemas[table_name]['columns'].keys())
        model_columns = set(model_schemas[table_name]['columns'].keys())
        
        missing_columns = list(model_columns - db_columns)
        extra_columns = list(db_columns - model_columns)
        
        if missing_columns or extra_columns:
            comparison_results['table_differences'][table_name] = {
                'missing_columns': missing_columns,
                'extra_columns': extra_columns,
                'model_info': {
                    'class': model_schemas[table_name]['model_class'],
                    'file': model_schemas[table_name]['file']
                }
            }
    
    return comparison_results


def print_analysis_report(results, model_schemas):
    """분석 결과를 보고서 형태로 출력합니다."""
    print("=" * 80)
    print("🔍 DATABASE vs MODEL SCHEMA ANALYSIS REPORT")
    print("=" * 80)
    
    if results['missing_tables']:
        print(f"\n❌ MISSING TABLES IN DATABASE ({len(results['missing_tables'])}):")
        for table in results['missing_tables']:
            model_info = model_schemas[table]
            print(f"  • {table} (from {model_info['file']} - {model_info['model_class']})")
    
    if results['extra_tables']:
        print(f"\n⚠️  EXTRA TABLES IN DATABASE ({len(results['extra_tables'])}):")
        for table in results['extra_tables']:
            print(f"  • {table}")
    
    if results['table_differences']:
        print(f"\n🔧 TABLES WITH COLUMN DIFFERENCES ({len(results['table_differences'])}):")
        for table_name, diff in results['table_differences'].items():
            print(f"\n  📋 {table_name.upper()}")
            print(f"     Model: {diff['model_info']['class']} ({diff['model_info']['file']})")
            
            if diff['missing_columns']:
                print(f"     ❌ Missing in DB: {diff['missing_columns']}")
            
            if diff['extra_columns']:
                print(f"     ⚠️  Extra in DB: {diff['extra_columns']}")
    
    # 요약
    total_issues = (len(results['missing_tables']) + 
                   len(results['extra_tables']) + 
                   len(results['table_differences']))
    
    print(f"\n" + "=" * 80)
    print(f"📊 SUMMARY: {total_issues} issues found")
    if total_issues == 0:
        print("✅ All schemas are in sync!")
    else:
        print("❌ Schema synchronization required")
    print("=" * 80)


async def main():
    """메인 분석 함수"""
    print("🔍 Starting comprehensive schema analysis...")
    
    print("📚 Collecting model schemas...")
    model_schemas = get_all_model_schemas()
    print(f"   Found {len(model_schemas)} model tables")
    
    print("🗃️  Collecting database schemas...")
    db_schemas = await get_all_database_schemas()
    print(f"   Found {len(db_schemas)} database tables")
    
    print("⚖️  Comparing schemas...")
    results = compare_schemas(db_schemas, model_schemas)
    
    print_analysis_report(results, model_schemas)
    
    return results


if __name__ == "__main__":
    results = asyncio.run(main())