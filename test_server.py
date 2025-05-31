#!/usr/bin/env python3
"""
MCP Orch 서버 테스트 스크립트
"""

import requests
import json
import sys

def test_server():
    """서버 테스트"""
    base_url = "http://localhost:8000"
    
    print("MCP Orch 서버 테스트 시작...\n")
    
    # 1. 서버 상태 확인
    print("1. 서버 상태 확인")
    try:
        response = requests.get(f"{base_url}/status")
        if response.status_code == 200:
            print("✅ 서버가 정상적으로 실행 중입니다.")
            print(f"   응답: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        else:
            print(f"❌ 서버 상태 확인 실패: {response.status_code}")
            print(f"   응답: {response.text}")
    except requests.exceptions.ConnectionError:
        print("❌ 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요.")
        return
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        return
    
    print("\n" + "-"*50 + "\n")
    
    # 2. 등록된 서버 목록 확인
    print("2. 등록된 MCP 서버 목록")
    try:
        response = requests.get(f"{base_url}/servers")
        if response.status_code == 200:
            servers = response.json()
            print(f"✅ 등록된 서버 수: {len(servers)}")
            for server in servers:
                print(f"   - {server['name']}: {server['status']}")
        else:
            print(f"❌ 서버 목록 조회 실패: {response.status_code}")
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
    
    print("\n" + "-"*50 + "\n")
    
    # 3. 도구 목록 확인
    print("3. 사용 가능한 도구 목록")
    try:
        response = requests.get(f"{base_url}/tools")
        if response.status_code == 200:
            tools = response.json()
            print(f"✅ 사용 가능한 도구 수: {len(tools)}")
            for tool in tools[:5]:  # 처음 5개만 표시
                print(f"   - {tool['namespace']}: {tool.get('description', 'No description')[:50]}...")
            if len(tools) > 5:
                print(f"   ... 그 외 {len(tools) - 5}개 도구")
        else:
            print(f"❌ 도구 목록 조회 실패: {response.status_code}")
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
    
    print("\n" + "-"*50 + "\n")
    
    # 4. SSE 엔드포인트 확인
    print("4. SSE 엔드포인트 확인")
    try:
        response = requests.get(f"{base_url}/servers")
        if response.status_code == 200:
            servers = response.json()
            if servers:
                server_name = servers[0]['name']
                print(f"   테스트 서버: {server_name}")
                print(f"   SSE URL: {base_url}/sse/{server_name}")
                print(f"   MCP URL: {base_url}/mcp/{server_name}")
                print("✅ SSE 엔드포인트가 준비되었습니다.")
            else:
                print("⚠️  등록된 서버가 없습니다.")
        else:
            print(f"❌ 서버 목록 조회 실패: {response.status_code}")
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
    
    print("\n테스트 완료!")

if __name__ == "__main__":
    test_server()
