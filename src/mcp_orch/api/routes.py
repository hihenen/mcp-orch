"""
API 라우트 정의

REST API 엔드포인트를 정의합니다.
"""

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from ..core.controller import OperationMode

logger = logging.getLogger(__name__)

router = APIRouter()
sse_handler = None  # SSE 핸들러는 앱 초기화 시 설정됨


# Pydantic 모델 정의
class ToolCallRequest(BaseModel):
    """도구 호출 요청"""
    arguments: Dict[str, Any] = Field(default_factory=dict)


class ToolCallResponse(BaseModel):
    """도구 호출 응답"""
    status: str
    result: Optional[Any] = None
    namespace: Optional[str] = None
    server: Optional[str] = None
    error: Optional[str] = None


class BatchExecuteRequest(BaseModel):
    """배치 실행 요청"""
    request: str = Field(..., description="자연어 작업 요청")
    context: Optional[Dict[str, Any]] = Field(default=None, description="추가 컨텍스트")


class BatchExecuteResponse(BaseModel):
    """배치 실행 응답"""
    status: str
    task_id: Optional[str] = None
    message: Optional[str] = None
    error: Optional[str] = None


class ModeSwitchRequest(BaseModel):
    """모드 전환 요청"""
    mode: OperationMode


# 도구 관련 엔드포인트
@router.get("/tools", tags=["Tools"])
async def list_all_tools(request: Request):
    """모든 사용 가능한 도구 목록 조회"""
    from .app import get_controller
    controller = get_controller(request)
    
    result = await controller.handle_request({
        "type": "list_tools"
    })
    
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["error"])
        
    return result["tools"]


@router.get("/tools/{server_name}", tags=["Tools"])
async def list_server_tools(server_name: str, request: Request):
    """특정 서버의 도구 목록 조회"""
    from .app import get_controller
    controller = get_controller(request)
    
    result = await controller.handle_request({
        "type": "list_tools",
        "server_name": server_name
    })
    
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["error"])
        
    return result["tools"]


@router.post("/tools/{namespace}", response_model=ToolCallResponse, tags=["Tools"])
async def call_tool(
    namespace: str,
    tool_request: ToolCallRequest,
    request: Request
):
    """
    도구 호출
    
    네임스페이스 형식: server_name.tool_name
    예: github.create_issue, notion.create_page
    """
    from .app import get_controller
    controller = get_controller(request)
    
    result = await controller.handle_request({
        "type": "call_tool",
        "namespace": namespace,
        "arguments": tool_request.arguments
    })
    
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["error"])
        
    return ToolCallResponse(**result)


@router.post("/tools/{namespace}/{tool_name}", response_model=ToolCallResponse, tags=["Tools"])
async def call_tool_direct(
    namespace: str,
    tool_name: str,
    tool_request: ToolCallRequest,
    request: Request
):
    """
    도구 호출 (직접 경로)
    
    서버와 도구 이름을 분리하여 호출
    """
    full_namespace = f"{namespace}.{tool_name}"
    return await call_tool(full_namespace, tool_request, request)


# 서버 관련 엔드포인트
@router.get("/servers", tags=["Servers"])
async def list_servers(request: Request):
    """연결된 MCP 서버 목록 조회"""
    from .app import get_controller
    controller = get_controller(request)
    
    result = await controller.handle_request({
        "type": "list_servers"
    })
    
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["error"])
        
    return result["servers"]


@router.get("/servers/{server_name}/status", tags=["Servers"])
async def get_server_status(server_name: str, request: Request):
    """특정 서버의 상태 조회"""
    from .app import get_controller
    controller = get_controller(request)
    
    result = await controller.handle_request({
        "type": "server_status",
        "server_name": server_name
    })
    
    if result["status"] == "error":
        if "not found" in result["error"]:
            raise HTTPException(status_code=404, detail=result["error"])
        raise HTTPException(status_code=500, detail=result["error"])
        
    return result["server"]


@router.post("/servers/reload", tags=["Servers"])
async def reload_servers(request: Request):
    """서버 설정 리로드"""
    from .app import get_controller
    controller = get_controller(request)
    
    result = await controller.reload_configuration()
    
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["error"])
        
    return result


# 배치 실행 관련 엔드포인트 (병렬화 모드)
@router.post("/batch/execute", response_model=BatchExecuteResponse, tags=["Batch"])
async def execute_batch(
    batch_request: BatchExecuteRequest,
    request: Request
):
    """
    배치 작업 실행
    
    자연어로 작업을 요청하면 LLM이 분석하여 자동으로 병렬 처리합니다.
    """
    from .app import get_controller, get_settings
    controller = get_controller(request)
    settings = get_settings(request)
    
    # 병렬화 모드 확인
    if settings.server.mode != "batch":
        raise HTTPException(
            status_code=400,
            detail="Batch execution is only available in batch mode"
        )
        
    result = await controller.handle_request({
        "type": "batch_execute",
        "request": batch_request.request,
        "context": batch_request.context
    })
    
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["error"])
        
    return BatchExecuteResponse(**result)


@router.get("/batch/status/{task_id}", tags=["Batch"])
async def get_task_status(task_id: str, request: Request):
    """작업 상태 조회"""
    from .app import get_controller, get_settings
    controller = get_controller(request)
    settings = get_settings(request)
    
    if settings.server.mode != "batch":
        raise HTTPException(
            status_code=400,
            detail="Task status is only available in batch mode"
        )
        
    result = await controller.handle_request({
        "type": "task_status",
        "task_id": task_id
    })
    
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["error"])
        
    return result


@router.get("/batch/result/{task_id}", tags=["Batch"])
async def get_task_result(task_id: str, request: Request):
    """작업 결과 조회"""
    from .app import get_controller, get_settings
    controller = get_controller(request)
    settings = get_settings(request)
    
    if settings.server.mode != "batch":
        raise HTTPException(
            status_code=400,
            detail="Task result is only available in batch mode"
        )
        
    result = await controller.handle_request({
        "type": "task_result",
        "task_id": task_id
    })
    
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["error"])
        
    return result


@router.delete("/batch/cancel/{task_id}", tags=["Batch"])
async def cancel_task(task_id: str, request: Request):
    """작업 취소"""
    from .app import get_controller, get_settings
    controller = get_controller(request)
    settings = get_settings(request)
    
    if settings.server.mode != "batch":
        raise HTTPException(
            status_code=400,
            detail="Task cancellation is only available in batch mode"
        )
        
    result = await controller.handle_request({
        "type": "cancel_task",
        "task_id": task_id
    })
    
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["error"])
        
    return result


# 시스템 관련 엔드포인트
@router.get("/status", tags=["System"])
async def get_system_status(request: Request):
    """시스템 상태 조회"""
    from .app import get_controller
    controller = get_controller(request)
    
    status = await controller.get_status()
    
    return status


@router.post("/mode/switch", tags=["System"])
async def switch_mode(mode_request: ModeSwitchRequest, request: Request):
    """운영 모드 전환"""
    from .app import get_controller
    controller = get_controller(request)
    
    result = await controller.switch_mode(mode_request.mode)
    
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["error"])
        
    return result


@router.get("/config", tags=["System"])
async def get_configuration(request: Request):
    """현재 설정 조회"""
    from .app import get_settings
    settings = get_settings(request)
    
    # 민감한 정보 제외
    config = settings.to_dict()
    
    return config


@router.get("/api/config", tags=["Configuration"])
async def get_config_file(request: Request):
    """MCP 설정 파일 내용 조회"""
    import json
    from pathlib import Path
    
    config_path = Path("mcp-config.json")
    if not config_path.exists():
        raise HTTPException(status_code=404, detail="Configuration file not found")
    
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            config = json.load(f)
        return config
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read configuration: {str(e)}")


@router.put("/api/config", tags=["Configuration"])
async def update_config_file(config: Dict[str, Any], request: Request):
    """MCP 설정 파일 업데이트"""
    import json
    from pathlib import Path
    
    config_path = Path("mcp-config.json")
    
    # 설정 검증
    if "servers" not in config:
        raise HTTPException(status_code=400, detail="Invalid configuration: 'servers' field is required")
    
    # 백업 생성
    if config_path.exists():
        backup_path = config_path.with_suffix(".json.backup")
        try:
            import shutil
            shutil.copy2(config_path, backup_path)
        except Exception as e:
            logger.warning(f"Failed to create backup: {e}")
    
    # 설정 저장
    try:
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        return {"status": "success", "message": "Configuration updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save configuration: {str(e)}")


@router.post("/api/config/reload", tags=["Configuration"])
async def reload_config(request: Request):
    """설정 재로드 및 서버 재시작"""
    from .app import get_controller
    controller = get_controller(request)
    
    try:
        # 설정 재로드
        result = await controller.reload_configuration()
        
        if result["status"] == "error":
            raise HTTPException(status_code=500, detail=result["error"])
        
        return {
            "status": "success",
            "message": "Configuration reloaded successfully",
            "servers": result.get("servers", [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reload configuration: {str(e)}")


@router.post("/api/config/validate", tags=["Configuration"])
async def validate_config(config: Dict[str, Any]):
    """설정 검증"""
    errors = []
    warnings = []
    
    # 필수 필드 검증
    if "servers" not in config:
        errors.append("Missing required field: 'servers'")
    elif not isinstance(config["servers"], dict):
        errors.append("'servers' must be an object")
    else:
        # 각 서버 설정 검증
        for server_name, server_config in config["servers"].items():
            if "command" not in server_config:
                errors.append(f"Server '{server_name}': missing required field 'command'")
            
            if "args" in server_config and not isinstance(server_config["args"], list):
                errors.append(f"Server '{server_name}': 'args' must be an array")
            
            if "env" in server_config and not isinstance(server_config["env"], dict):
                errors.append(f"Server '{server_name}': 'env' must be an object")
    
    # 선택적 필드 검증
    if "mode" in config and config["mode"] not in ["proxy", "batch"]:
        warnings.append("'mode' should be either 'proxy' or 'batch'")
    
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings
    }


# SSE/MCP 엔드포인트
@router.get("/sse/{server_name}", tags=["SSE"])
async def sse_endpoint(server_name: str, request: Request):
    """서버별 SSE 연결 엔드포인트"""
    from .app import get_controller
    controller = get_controller(request)
    
    # 서버 존재 확인
    servers_response = await controller.handle_request({
        "type": "list_servers"
    })
    
    servers = servers_response.get("servers", [])
    server_exists = any(s["name"] == server_name for s in servers)
    
    if not server_exists:
        raise HTTPException(status_code=404, detail=f"Server '{server_name}' not found")
    
    # 서버별 SSE 핸들러 가져오기 (재사용)
    if server_name not in _sse_handlers:
        if hasattr(controller, '_proxy_handler'):
            from .cline_sse import ClineSSEHandler
            _sse_handlers[server_name] = ClineSSEHandler(controller._proxy_handler, server_name)
        else:
            raise HTTPException(status_code=500, detail="SSE not available")
    
    sse_handler = _sse_handlers[server_name]
    return await sse_handler.handle_sse_connection(request)


@router.post("/mcp/{server_name}", tags=["MCP"])
async def mcp_endpoint(server_name: str, request: Request):
    """서버별 MCP JSON-RPC 엔드포인트"""
    from .app import get_controller
    controller = get_controller(request)
    
    # 서버 존재 확인
    servers_response = await controller.handle_request({
        "type": "list_servers"
    })
    
    servers = servers_response.get("servers", [])
    server_exists = any(s["name"] == server_name for s in servers)
    
    if not server_exists:
        raise HTTPException(status_code=404, detail=f"Server '{server_name}' not found")
    
    # 서버별 SSE 핸들러 생성 (Cline 호환)
    if hasattr(controller, '_proxy_handler'):
        from .cline_sse import ClineSSEHandler
        sse_handler = ClineSSEHandler(controller._proxy_handler, server_name)
    else:
        raise HTTPException(status_code=500, detail="MCP not available")
    
    # JSON-RPC 요청 파싱
    try:
        json_data = await request.json()
        logger.info(f"Received JSON-RPC request: {json_data}")
    except Exception as e:
        logger.error(f"Failed to parse JSON: {e}")
        return {
            "jsonrpc": "2.0",
            "error": {
                "code": -32700,
                "message": "Parse error"
            },
            "id": None
        }
    
    # MCP 요청 처리
    return await sse_handler.handle_json_rpc_request(json_data)


# SSE 메시지 엔드포인트 추가 (Cline SSE 통신용)
@router.post("/sse/{server_name}/message", tags=["SSE"])
async def sse_message_endpoint(server_name: str, request: Request):
    """SSE 메시지 엔드포인트 (클라이언트->서버 통신)"""
    from .app import get_controller
    controller = get_controller(request)
    
    # 서버 존재 확인
    servers_response = await controller.handle_request({
        "type": "list_servers"
    })
    
    servers = servers_response.get("servers", [])
    server_exists = any(s["name"] == server_name for s in servers)
    
    if not server_exists:
        raise HTTPException(status_code=404, detail=f"Server '{server_name}' not found")
    
    # 서버별 SSE 핸들러 생성
    if hasattr(controller, '_proxy_handler'):
        from .cline_sse import ClineSSEHandler
        sse_handler = ClineSSEHandler(controller._proxy_handler, server_name)
    else:
        raise HTTPException(status_code=500, detail="SSE not available")
    
    # JSON-RPC 요청 파싱
    try:
        json_data = await request.json()
    except Exception as e:
        return {
            "jsonrpc": "2.0",
            "error": {
                "code": -32700,
                "message": "Parse error"
            },
            "id": None
        }
    
    # MCP 요청 처리
    return await sse_handler.handle_json_rpc_request(json_data)


# SSE 핸들러 인스턴스를 저장할 전역 딕셔너리
_sse_handlers: Dict[str, Any] = {}

# 실행 히스토리를 저장할 임시 저장소 (실제로는 DB 사용 권장)
_execution_history: List[Dict[str, Any]] = []

# 실행 히스토리 관련 엔드포인트
@router.get("/api/executions", tags=["Executions"])
async def get_executions(
    limit: int = 100,
    server_id: Optional[str] = None,
    tool_id: Optional[str] = None,
    status: Optional[str] = None
):
    """실행 히스토리 조회"""
    import uuid
    from datetime import datetime, timedelta
    import random
    
    # 필터링된 실행 목록
    filtered_executions = _execution_history.copy()
    
    if server_id:
        filtered_executions = [e for e in filtered_executions if e.get("serverId") == server_id]
    if tool_id:
        filtered_executions = [e for e in filtered_executions if e.get("toolId") == tool_id]
    if status:
        filtered_executions = [e for e in filtered_executions if e.get("status") == status]
    
    # 최신순 정렬 및 제한
    filtered_executions.sort(key=lambda x: x.get("startTime", ""), reverse=True)
    filtered_executions = filtered_executions[:limit]
    
    # 데모용 데이터 추가 (실행 히스토리가 없을 경우)
    if len(filtered_executions) == 0 and not (server_id or tool_id or status):
        # 샘플 실행 데이터 생성
        sample_tools = [
            ("brave-search", "search", "Search the web"),
            ("excel-mcp-server", "excel_read_sheet", "Read Excel sheet"),
            ("github", "create_issue", "Create GitHub issue"),
            ("notion", "create_page", "Create Notion page")
        ]
        
        now = datetime.now()
        for i in range(5):
            server, tool, tool_display = random.choice(sample_tools)
            start_time = now - timedelta(hours=i*2, minutes=random.randint(0, 59))
            duration = random.randint(500, 5000)
            status = random.choice(["completed", "completed", "completed", "failed"])
            
            execution = {
                "id": str(uuid.uuid4()),
                "serverId": server,
                "toolId": f"{server}.{tool}",
                "toolName": tool_display,
                "status": status,
                "startTime": start_time.isoformat(),
                "endTime": (start_time + timedelta(milliseconds=duration)).isoformat(),
                "duration": duration,
                "parameters": {
                    "query": f"Sample query {i+1}"
                } if "search" in tool else {
                    "title": f"Sample {tool_display} {i+1}"
                },
                "result": {
                    "success": True,
                    "data": f"Sample result for {tool_display}"
                } if status == "completed" else None,
                "error": "Connection timeout" if status == "failed" else None
            }
            filtered_executions.append(execution)
    
    return filtered_executions


@router.get("/api/executions/{execution_id}", tags=["Executions"])
async def get_execution(execution_id: str):
    """특정 실행 상세 정보 조회"""
    execution = next((e for e in _execution_history if e["id"] == execution_id), None)
    
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    return execution


@router.post("/api/executions", tags=["Executions"])
async def create_execution(execution: Dict[str, Any]):
    """새 실행 기록 생성"""
    import uuid
    from datetime import datetime
    
    # ID 생성
    if "id" not in execution:
        execution["id"] = str(uuid.uuid4())
    
    # 시작 시간 설정
    if "startTime" not in execution:
        execution["startTime"] = datetime.now().isoformat()
    
    # 상태 기본값
    if "status" not in execution:
        execution["status"] = "pending"
    
    _execution_history.insert(0, execution)
    
    # 최대 1000개까지만 유지
    if len(_execution_history) > 1000:
        _execution_history.pop()
    
    return execution


@router.patch("/api/executions/{execution_id}", tags=["Executions"])
async def update_execution(execution_id: str, updates: Dict[str, Any]):
    """실행 상태 업데이트"""
    execution = next((e for e in _execution_history if e["id"] == execution_id), None)
    
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    # 업데이트 적용
    execution.update(updates)
    
    # 종료 시간 및 duration 계산
    if updates.get("status") in ["completed", "failed"] and "endTime" not in execution:
        from datetime import datetime
        execution["endTime"] = datetime.now().isoformat()
        
        if "startTime" in execution:
            start = datetime.fromisoformat(execution["startTime"].replace("Z", "+00:00"))
            end = datetime.fromisoformat(execution["endTime"].replace("Z", "+00:00"))
            execution["duration"] = int((end - start).total_seconds() * 1000)
    
    return execution


# Cline이 사용하는 messages 엔드포인트 추가
@router.post("/messages/{server_name}/", tags=["SSE"])
@router.post("/{server_name}messages/", tags=["SSE"])  # Cline 버그 대응
async def messages_endpoint(server_name: str, request: Request):
    """Cline이 사용하는 메시지 엔드포인트"""
    logger.info(f"POST /messages/{server_name}/ received")
    from .app import get_controller
    controller = get_controller(request)
    
    # 서버 존재 확인
    servers_response = await controller.handle_request({
        "type": "list_servers"
    })
    
    servers = servers_response.get("servers", [])
    server_exists = any(s["name"] == server_name for s in servers)
    
    if not server_exists:
        raise HTTPException(status_code=404, detail=f"Server '{server_name}' not found")
    
    # 서버별 SSE 핸들러 가져오기 (재사용)
    if server_name not in _sse_handlers:
        if hasattr(controller, '_proxy_handler'):
            from .cline_sse import ClineSSEHandler
            _sse_handlers[server_name] = ClineSSEHandler(controller._proxy_handler, server_name)
        else:
            raise HTTPException(status_code=500, detail="SSE not available")
    
    sse_handler = _sse_handlers[server_name]
    
    # JSON-RPC 요청 파싱
    try:
        json_data = await request.json()
    except Exception as e:
        return {
            "jsonrpc": "2.0",
            "error": {
                "code": -32700,
                "message": "Parse error"
            },
            "id": None
        }
    
    # 가장 최근 SSE 연결의 connection_id 찾기
    connection_id = None
    if sse_handler.active_connections:
        # 가장 최근 연결 사용
        connection_id = list(sse_handler.active_connections.keys())[-1]
    
    # MCP 요청 처리
    return await sse_handler.handle_json_rpc_request(json_data, connection_id)
