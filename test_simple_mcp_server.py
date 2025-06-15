#!/usr/bin/env python3
"""
간단한 MCP 서버 테스트 구현

Cursor, Claude Code, Cline에서 테스트할 수 있는 최소 기능 MCP 서버
"""

import json
import sys
import asyncio
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def main():
    """간단한 MCP 서버 메인 루프"""
    
    logger.info("Simple MCP Server starting...")
    
    try:
        while True:
            # stdin에서 JSON-RPC 메시지 읽기
            line = await asyncio.get_event_loop().run_in_executor(None, sys.stdin.readline)
            
            if not line:
                logger.info("EOF received, shutting down")
                break
            
            line = line.strip()
            if not line:
                continue
            
            try:
                # JSON 파싱
                message = json.loads(line)
                logger.info(f"Received message: {message}")
                
                # 메시지 처리
                response = await handle_message(message)
                
                if response:
                    # JSON-RPC 응답 전송
                    response_json = json.dumps(response)
                    print(response_json, flush=True)
                    logger.info(f"Sent response: {response}")
                
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON: {e}")
                continue
            except Exception as e:
                logger.error(f"Error handling message: {e}")
                continue
                
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
    
    logger.info("Simple MCP Server shutting down")


async def handle_message(message):
    """MCP 메시지 처리"""
    
    method = message.get("method")
    message_id = message.get("id")
    params = message.get("params", {})
    
    if method == "initialize":
        # 초기화 응답
        return {
            "jsonrpc": "2.0",
            "id": message_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {},
                    "logging": {},
                    "prompts": {},
                    "resources": {}
                },
                "serverInfo": {
                    "name": "simple-test-server",
                    "version": "1.0.0"
                }
            }
        }
    
    elif method == "notifications/initialized":
        # 초기화 완료 알림 (응답 없음)
        logger.info("Client initialized")
        return None
    
    elif method == "tools/list":
        # 도구 목록 반환
        return {
            "jsonrpc": "2.0",
            "id": message_id,
            "result": {
                "tools": [
                    {
                        "name": "echo",
                        "description": "Echo the input text",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "text": {
                                    "type": "string",
                                    "description": "Text to echo"
                                }
                            },
                            "required": ["text"]
                        }
                    },
                    {
                        "name": "hello",
                        "description": "Say hello",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "name": {
                                    "type": "string",
                                    "description": "Name to greet"
                                }
                            },
                            "required": ["name"]
                        }
                    }
                ]
            }
        }
    
    elif method == "tools/call":
        # 도구 호출
        tool_name = params.get("name")
        arguments = params.get("arguments", {})
        
        if tool_name == "echo":
            text = arguments.get("text", "")
            result_text = f"Echo: {text}"
        elif tool_name == "hello":
            name = arguments.get("name", "World")
            result_text = f"Hello, {name}!"
        else:
            return {
                "jsonrpc": "2.0",
                "id": message_id,
                "error": {
                    "code": -32601,
                    "message": f"Unknown tool: {tool_name}"
                }
            }
        
        return {
            "jsonrpc": "2.0",
            "id": message_id,
            "result": {
                "content": [
                    {
                        "type": "text",
                        "text": result_text
                    }
                ]
            }
        }
    
    else:
        # 알 수 없는 메서드
        return {
            "jsonrpc": "2.0",
            "id": message_id,
            "error": {
                "code": -32601,
                "message": f"Method not found: {method}"
            }
        }


if __name__ == "__main__":
    asyncio.run(main())