#!/usr/bin/env python3
"""
Cline SSE 연결 상세 디버깅 스크립트
실제 Cline이 받는 메시지를 정확히 확인
"""

import asyncio
import aiohttp
import json
import sys
from datetime import datetime

async def test_cline_sse_connection():
    """Cline SSE 연결 테스트 및 메시지 디버깅"""
    
    url = "http://localhost:8000/projects/c41aa472-15c3-4336-bcf8-21b464253d62/servers/brave-search/sse"
    
    print(f"🔍 Cline SSE 연결 테스트 시작")
    print(f"📡 URL: {url}")
    print(f"⏰ 시작 시간: {datetime.now()}")
    print("=" * 80)
    
    try:
        # Cline과 동일한 헤더로 요청
        headers = {
            'Accept': 'text/event-stream',
            'Accept-Language': '*',
            'Sec-Fetch-Mode': 'cors',
            'User-Agent': 'node',
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache',
            'Accept-Encoding': 'gzip, deflate'
        }
        
        print("📤 요청 헤더:")
        for key, value in headers.items():
            print(f"  {key}: {value}")
        print()
        
        timeout = aiohttp.ClientTimeout(total=30)
        
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(url, headers=headers) as response:
                print(f"📥 응답 상태: {response.status}")
                print(f"📥 응답 헤더:")
                for key, value in response.headers.items():
                    print(f"  {key}: {value}")
                print()
                
                if response.status != 200:
                    print(f"❌ HTTP 오류: {response.status}")
                    text = await response.text()
                    print(f"오류 내용: {text}")
                    return
                
                print("🔄 SSE 스트림 수신 중...")
                print("=" * 80)
                
                message_count = 0
                
                async for line in response.content:
                    try:
                        line_text = line.decode('utf-8').strip()
                        
                        if not line_text:
                            continue
                            
                        print(f"📨 원시 라인 #{message_count + 1}: {repr(line_text)}")
                        
                        # SSE 데이터 라인 파싱
                        if line_text.startswith('data: '):
                            data_content = line_text[6:]  # 'data: ' 제거
                            
                            try:
                                # JSON 파싱 시도
                                json_data = json.loads(data_content)
                                print(f"✅ JSON 파싱 성공:")
                                print(json.dumps(json_data, indent=2, ensure_ascii=False))
                                
                                # MCP 메시지 타입 확인
                                method = json_data.get('method')
                                if method:
                                    print(f"🎯 MCP 메서드: {method}")
                                    
                                    if method == 'notifications/initialized':
                                        print("🚀 초기화 알림 수신됨")
                                    elif method == 'notifications/tools/list_changed':
                                        tools = json_data.get('params', {}).get('tools', [])
                                        print(f"🔧 도구 목록 알림 수신됨 ({len(tools)}개 도구)")
                                        for i, tool in enumerate(tools):
                                            print(f"  도구 #{i+1}: {tool.get('name', 'Unknown')}")
                                
                            except json.JSONDecodeError as e:
                                print(f"❌ JSON 파싱 실패: {e}")
                                print(f"원시 데이터: {repr(data_content)}")
                        
                        elif line_text.startswith(': '):
                            # SSE 주석 (keepalive)
                            print(f"💓 Keepalive: {line_text}")
                        
                        else:
                            print(f"❓ 알 수 없는 라인: {repr(line_text)}")
                        
                        message_count += 1
                        print("-" * 40)
                        
                        # 처음 몇 개 메시지만 확인
                        if message_count >= 5:
                            print("🛑 충분한 메시지를 수신했습니다. 연결을 종료합니다.")
                            break
                            
                    except Exception as line_error:
                        print(f"❌ 라인 처리 오류: {line_error}")
                        print(f"문제 라인: {repr(line)}")
                        continue
                
    except asyncio.TimeoutError:
        print("⏰ 연결 타임아웃")
    except Exception as e:
        print(f"❌ 연결 오류: {e}")
        import traceback
        traceback.print_exc()
    
    print("=" * 80)
    print(f"⏰ 종료 시간: {datetime.now()}")
    print("🔍 Cline SSE 연결 테스트 완료")

if __name__ == "__main__":
    print("Cline SSE 상세 디버깅 스크립트")
    print("Ctrl+C로 중단 가능")
    print()
    
    try:
        asyncio.run(test_cline_sse_connection())
    except KeyboardInterrupt:
        print("\n🛑 사용자에 의해 중단됨")
    except Exception as e:
        print(f"\n❌ 실행 오류: {e}")
        sys.exit(1)
