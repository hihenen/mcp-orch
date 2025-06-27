"""
서버 상태 자동 업데이트 서비스

MCP 서버의 연결/해제 상태를 자동으로 데이터베이스에 동기화하는 서비스
"""

import logging
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session

from ..models.mcp_server import McpServer, McpServerStatus
from ..database import get_db

logger = logging.getLogger(__name__)

class ServerStatusService:
    """서버 상태 자동 업데이트 서비스"""
    
    @staticmethod
    async def update_server_status_on_connection(
        server_id: str,
        project_id: UUID,
        status: McpServerStatus,
        db: Session = None,
        connection_type: str = "unknown",
        error_message: Optional[str] = None
    ) -> bool:
        """
        서버 연결 상태 변경 시 DB 상태 자동 업데이트
        
        Args:
            server_id: 서버 식별자 (프로젝트별 고유)
            project_id: 프로젝트 ID
            status: 새로운 서버 상태
            db: DB 세션 (선택적)
            connection_type: 연결 타입 (SSE, MCP_SESSION 등)
            error_message: 에러 메시지 (상태가 ERROR인 경우)
            
        Returns:
            bool: 업데이트 성공 여부
        """
        
        # DB 세션이 없으면 새로 생성
        should_close_db = False
        if db is None:
            db = next(get_db())
            should_close_db = True
            
        try:
            # 서버명에서 프로젝트 ID 제거 (server_id가 "project_id.server_name" 형태인 경우)
            if '.' in server_id:
                server_name = server_id.split('.', 1)[1]
            else:
                server_name = server_id
            
            # 프로젝트별 서버 조회
            server = db.query(McpServer).filter(
                McpServer.project_id == project_id,
                McpServer.name == server_name
            ).first()
            
            if not server:
                logger.warning(f"Server not found for update: {server_name} in project {project_id}")
                return False
            
            # 상태 업데이트
            old_status = server.status
            server.status = status
            
            # 연결 성공 시 타임스탬프 업데이트
            if status == McpServerStatus.ACTIVE:
                server.last_used_at = datetime.utcnow()
                server.last_error = None
                logger.info(f"✅ [{connection_type}] Server {server_name} connected (status: {old_status} → {status})")
                
                # 📊 상태 변경 통계 로깅
                if old_status != status:
                    logger.info(f"📈 [METRICS] Server status change: {server_name} ({old_status.value if old_status else 'None'} → {status.value}) via {connection_type}")
            
            # 에러 상태 시 에러 메시지 저장
            elif status == McpServerStatus.ERROR and error_message:
                server.last_error = error_message
                logger.warning(f"❌ [{connection_type}] Server {server_name} error (status: {old_status} → {status}): {error_message}")
                
                # 📊 에러 통계 로깅
                logger.error(f"📈 [METRICS] Server error: {server_name} ({old_status.value if old_status else 'None'} → ERROR) via {connection_type}: {error_message}")
            
            # 연결 해제 시
            elif status == McpServerStatus.INACTIVE:
                logger.info(f"🔌 [{connection_type}] Server {server_name} disconnected (status: {old_status} → {status})")
                
                # 📊 연결 해제 통계 로깅
                if old_status == McpServerStatus.ACTIVE:
                    logger.info(f"📈 [METRICS] Server disconnection: {server_name} (ACTIVE → INACTIVE) via {connection_type}")
            
            # DB 커밋
            db.commit()
            
            logger.info(f"📊 Server status updated: {server_name} ({old_status} → {status}) via {connection_type}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to update server status for {server_id}: {e}")
            if db:
                db.rollback()
            return False
        
        finally:
            if should_close_db and db:
                db.close()
    
    @staticmethod
    async def update_server_status_by_name(
        server_name: str,
        project_id: UUID,
        status: McpServerStatus,
        db: Session = None,
        connection_type: str = "unknown",
        error_message: Optional[str] = None,
        tools_count: Optional[int] = None
    ) -> bool:
        """
        서버명으로 상태 업데이트 (SSE 연결용)
        
        Args:
            server_name: 서버명
            project_id: 프로젝트 ID
            status: 새로운 서버 상태
            db: DB 세션 (선택적)
            connection_type: 연결 타입
            error_message: 에러 메시지
            tools_count: 도구 개수 (선택적)
            
        Returns:
            bool: 업데이트 성공 여부
        """
        
        # 기존 함수 재사용
        return await ServerStatusService.update_server_status_on_connection(
            server_id=server_name,  # 서버명을 server_id로 사용
            project_id=project_id,
            status=status,
            db=db,
            connection_type=connection_type,
            error_message=error_message
        )
    
    @staticmethod
    async def batch_update_server_status(
        status_updates: Dict[str, Dict[str, Any]],
        project_id: UUID,
        db: Session = None,
        connection_type: str = "batch"
    ) -> Dict[str, bool]:
        """
        여러 서버 상태 일괄 업데이트
        
        Args:
            status_updates: {server_name: {"status": McpServerStatus, "error": Optional[str]}}
            project_id: 프로젝트 ID
            db: DB 세션 (선택적)
            connection_type: 연결 타입
            
        Returns:
            Dict[str, bool]: 서버별 업데이트 결과
        """
        
        results = {}
        
        for server_name, update_data in status_updates.items():
            success = await ServerStatusService.update_server_status_by_name(
                server_name=server_name,
                project_id=project_id,
                status=update_data.get("status", McpServerStatus.INACTIVE),
                db=db,
                connection_type=connection_type,
                error_message=update_data.get("error")
            )
            results[server_name] = success
        
        logger.info(f"📊 Batch status update completed: {sum(results.values())}/{len(results)} servers updated")
        return results

    @staticmethod 
    def get_server_by_name(server_name: str, project_id: UUID, db: Session) -> Optional[McpServer]:
        """
        서버명으로 서버 조회
        
        Args:
            server_name: 서버명
            project_id: 프로젝트 ID  
            db: DB 세션
            
        Returns:
            Optional[McpServer]: 서버 객체 또는 None
        """
        return db.query(McpServer).filter(
            McpServer.project_id == project_id,
            McpServer.name == server_name
        ).first()