"""
MCP Process Manager - 완전한 프로세스 라이프사이클 관리
"""
import os
import asyncio
import signal
import psutil
import time
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Set
from contextlib import asynccontextmanager

from sqlalchemy.orm import Session
from sqlalchemy import select, update

from ..database import async_session
from ..models.mcp_server import McpServer, McpServerStatus
from .mcp_session_manager import McpSessionManager

logger = logging.getLogger(__name__)


class ProcessManager:
    """MCP 프로세스 관리자 - 완전한 자동화"""
    
    def __init__(self):
        self.session_manager = McpSessionManager()
        self.health_check_task: Optional[asyncio.Task] = None
        self.is_shutting_down = False
        
        # 설정값들
        self.HEALTH_CHECK_INTERVAL = 300  # 5분
        self.MAX_RESTART_ATTEMPTS = 3
        self.FAILURE_THRESHOLD = 5  # 1시간 내 5회 실패
        self.FAILURE_WINDOW_HOURS = 1
        self.PROCESS_START_TIMEOUT = 30
        
    async def initialize_on_startup(self):
        """FastAPI 시작 시 초기화"""
        logger.info("🚀 ProcessManager 시작: enabled 서버들 자동 시작")
        
        # enabled=True인 서버들 자동 시작
        await self.start_enabled_servers()
        
        # 백그라운드 헬스체크 시작
        self.health_check_task = asyncio.create_task(self._background_health_monitor())
        
        logger.info("✅ ProcessManager 초기화 완료")
    
    async def shutdown(self):
        """시스템 종료 시 정리"""
        logger.info("🛑 ProcessManager 종료 중...")
        self.is_shutting_down = True
        
        # 백그라운드 태스크 중지
        if self.health_check_task:
            self.health_check_task.cancel()
            try:
                await self.health_check_task
            except asyncio.CancelledError:
                pass
        
        # 모든 프로세스 안전하게 종료
        await self.stop_all_servers()
        
        logger.info("✅ ProcessManager 종료 완료")
    
    async def start_enabled_servers(self):
        """enabled=True인 모든 서버 시작"""
        async with async_session() as db:
            # enabled=True인 서버들 조회
            stmt = select(McpServer).where(McpServer.is_enabled == True)
            result = await db.execute(stmt)
            enabled_servers = result.scalars().all()
            
            logger.info(f"📋 {len(enabled_servers)}개의 enabled 서버 발견")
            
            for server in enabled_servers:
                try:
                    success = await self.start_server(server.id)
                    if success:
                        logger.info(f"✅ {server.name} 시작 성공")
                    else:
                        logger.error(f"❌ {server.name} 시작 실패")
                except Exception as e:
                    logger.error(f"❌ {server.name} 시작 중 오류: {e}")
    
    async def start_server(self, server_id: str) -> bool:
        """개별 서버 시작"""
        async with async_session() as db:
            server = await db.get(McpServer, server_id)
            if not server:
                logger.error(f"서버 {server_id} 찾을 수 없음")
                return False
            
            # 이미 실행 중인지 확인
            if server.process_id and await self._check_process_alive(server.process_id):
                logger.info(f"서버 {server.name} 이미 실행 중 (PID: {server.process_id})")
                return True
            
            try:
                # 서버 상태를 STARTING으로 변경
                server.status = McpServerStatus.STARTING
                await db.commit()
                
                # 프로세스 시작
                process = await asyncio.create_subprocess_exec(
                    server.command,
                    *server.args,
                    env={**os.environ, **server.env},
                    cwd=server.cwd,
                    stdin=asyncio.subprocess.PIPE,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                
                # PID 저장 및 상태 업데이트
                server.process_id = process.pid
                server.last_started_at = datetime.utcnow()
                server.status = McpServerStatus.ACTIVE
                server.last_error = None
                await db.commit()
                
                # TODO: 세션 매니저 통합 필요
                # await self.session_manager.register_process(server_id, process)
                
                # 시작 검증 (30초 대기)
                if await self._verify_startup(process.pid):
                    # 프로세스 시작 확인됨, 이제 MCP 초기화 대기
                    logger.info(f"✅ 프로세스 시작 확인됨. MCP 초기화 대기 중... (서버: {server.name}, PID: {process.pid})")
                    
                    # MCP 세션 초기화 시도 (별도 스레드에서 처리하되 결과는 로그로만)
                    asyncio.create_task(self._verify_mcp_initialization(server_id, server.name))
                    
                    logger.info(f"🎉 서버 {server.name} 시작 완료 (PID: {process.pid})")
                    return True
                else:
                    # 시작 실패
                    await self._handle_startup_failure(server, "시작 검증 실패")
                    return False
                    
            except Exception as e:
                await self._handle_startup_failure(server, str(e))
                return False
    
    async def stop_server(self, server_id: str) -> bool:
        """개별 서버 중지"""
        async with async_session() as db:
            server = await db.get(McpServer, server_id)
            if not server:
                return False
            
            if not server.process_id:
                server.status = McpServerStatus.INACTIVE
                await db.commit()
                return True
            
            try:
                # 우아한 종료 시도
                success = await self._terminate_process_gracefully(server.process_id)
                
                # 상태 업데이트
                server.process_id = None
                server.status = McpServerStatus.INACTIVE
                await db.commit()
                
                # TODO: 세션 매니저 통합 필요
                # await self.session_manager.unregister_process(server_id)
                
                logger.info(f"🛑 서버 {server.name} 중지 완료")
                return success
                
            except Exception as e:
                logger.error(f"서버 {server.name} 중지 중 오류: {e}")
                return False
    
    async def restart_server(self, server_id: str) -> bool:
        """서버 재시작"""
        logger.info(f"🔄 서버 {server_id} 재시작 시작")
        
        # 중지 후 시작
        await self.stop_server(server_id)
        await asyncio.sleep(2)  # 잠시 대기
        return await self.start_server(server_id)
    
    async def health_check_all(self):
        """모든 서버 헬스체크"""
        if self.is_shutting_down:
            return
            
        async with async_session() as db:
            # process_id가 있는 서버들만 체크
            stmt = select(McpServer).where(
                McpServer.process_id.isnot(None),
                McpServer.is_enabled == True
            )
            result = await db.execute(stmt)
            servers = result.scalars().all()
            
            logger.debug(f"🔍 {len(servers)}개 서버 헬스체크 시작")
            
            # 각 서버를 개별적으로 처리하여 세션 문제 방지
            for server in servers:
                server_id = str(server.id)
                server_name = server.name
                process_id = server.process_id
                
                is_alive = await self._check_process_alive(process_id)
                
                # 서버 상태를 새로운 쿼리로 가져와서 세션 문제 방지
                fresh_server = await db.get(McpServer, server.id)
                if not fresh_server:
                    continue
                
                if is_alive:
                    # 프로세스 살아있음 - 성공
                    fresh_server.last_health_check = datetime.utcnow()
                    fresh_server.health_check_failures = 0
                    if fresh_server.status != McpServerStatus.ACTIVE:
                        fresh_server.status = McpServerStatus.ACTIVE
                        
                    logger.debug(f"✅ {server_name} (PID {process_id}) 정상")
                    
                else:
                    # 프로세스 죽음 - 실패 처리
                    logger.warning(f"🚨 {server_name} (PID {process_id}) 프로세스 중단 감지!")
                    
                    fresh_server.health_check_failures += 1
                    fresh_server.failure_reason = "프로세스 중단"
                    fresh_server.status = McpServerStatus.INACTIVE
                    fresh_server.process_id = None
                    
                    # 자동 재시작 시도 여부 판단 (현재 세션의 데이터로)
                    should_restart = (
                        fresh_server.is_auto_restart_enabled and
                        fresh_server.health_check_failures < self.FAILURE_THRESHOLD
                    )
                    
                    if should_restart:
                        # 별도 태스크로 재시작 처리
                        asyncio.create_task(self._attempt_auto_restart_async(server_id))
                    else:
                        # 재시작 포기
                        fresh_server.is_enabled = False
                        logger.error(f"❌ {server_name} 자동 재시작 포기 (실패가 너무 많음)")
            
            await db.commit()
    
    
    
    async def _attempt_auto_restart_async(self, server_id: str):
        """별도 세션에서 자동 재시작 시도"""
        await self._attempt_auto_restart(server_id)

    async def _attempt_auto_restart(self, server_id: str):
        """자동 재시작 시도 (서버 ID로 처리)"""
        async with async_session() as db:
            server = await db.get(McpServer, server_id)
            if not server:
                logger.error(f"서버 {server_id} 없음")
                return
            
            server_name = server.name
            server.last_restart_attempt = datetime.utcnow()
            server.restart_count += 1
            await db.commit()
            
            logger.info(f"🔄 {server_name} 자동 재시작 시도 ({server.restart_count}회)")
            
            # 지수 백오프 적용
            base_delay = 5
            max_attempts = self.MAX_RESTART_ATTEMPTS
            
            for attempt in range(max_attempts):
                if attempt > 0:
                    delay = base_delay * (2 ** (attempt - 1))
                    logger.info(f"⏳ 재시작 대기: {delay}초")
                    await asyncio.sleep(delay)
                
                success = await self.start_server(server_id)
                if success:
                    logger.info(f"✅ {server_name} 자동 재시작 성공")
                    
                    # 성공 시 실패 카운터 리셋
                    async with async_session() as db:
                        server = await db.get(McpServer, server_id)
                        if server:
                            server.health_check_failures = 0
                            server.failure_reason = None
                            await db.commit()
                    return
                
                logger.warning(f"❌ {server_name} 재시작 시도 {attempt + 1}/{max_attempts} 실패")
            
            # 모든 재시작 시도 실패
            logger.error(f"💥 {server_name} 자동 재시작 완전 실패")
            async with async_session() as db:
                server = await db.get(McpServer, server_id)
                if server:
                    server.failure_reason = f"자동 재시작 {max_attempts}회 실패"
                    server.status = McpServerStatus.ERROR
                    await db.commit()
    
    async def _background_health_monitor(self):
        """백그라운드 헬스체크 루프"""
        logger.info(f"🔄 백그라운드 헬스체크 시작 (간격: {self.HEALTH_CHECK_INTERVAL}초)")
        
        while not self.is_shutting_down:
            try:
                await self.health_check_all()
                await asyncio.sleep(self.HEALTH_CHECK_INTERVAL)
                
            except asyncio.CancelledError:
                logger.info("헬스체크 태스크 취소됨")
                break
            except Exception as e:
                logger.error(f"헬스체크 중 오류: {e}")
                await asyncio.sleep(60)  # 에러 시 1분 후 재시도
    
    async def _check_process_alive(self, pid: int) -> bool:
        """PID 기반 프로세스 생존 확인 (0.001초 소요)"""
        if not pid:
            return False
        
        try:
            # kill -0과 동일한 효과
            os.kill(pid, 0)
            return True
        except (OSError, ProcessLookupError):
            return False
    
    async def _verify_startup(self, pid: int, timeout: int = 30) -> bool:
        """새 프로세스 시작 검증"""
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            if await self._check_process_alive(pid):
                # 2초 더 대기해서 안정성 확인
                await asyncio.sleep(2)
                if await self._check_process_alive(pid):
                    return True
            
            await asyncio.sleep(1)
        
        return False
    
    async def _terminate_process_gracefully(self, pid: int) -> bool:
        """프로세스 우아한 종료"""
        if not await self._check_process_alive(pid):
            return True
        
        try:
            # 1. SIGTERM으로 우아한 종료 요청
            os.kill(pid, signal.SIGTERM)
            
            # 10초 대기
            for _ in range(100):
                if not await self._check_process_alive(pid):
                    logger.debug(f"프로세스 {pid} 우아하게 종료됨")
                    return True
                await asyncio.sleep(0.1)
            
            # 2. 여전히 살아있으면 SIGKILL
            if await self._check_process_alive(pid):
                logger.warning(f"프로세스 {pid} 강제 종료")
                os.kill(pid, signal.SIGKILL)
                
                # 5초 더 대기
                for _ in range(50):
                    if not await self._check_process_alive(pid):
                        return True
                    await asyncio.sleep(0.1)
            
            return not await self._check_process_alive(pid)
            
        except (OSError, ProcessLookupError):
            return True
    
    async def _handle_startup_failure(self, server: McpServer, error: str):
        """시작 실큨 처리"""
        try:
            # 서버 정보를 새로 가져와서 업데이트
            async with async_session() as db:
                fresh_server = await db.get(McpServer, server.id)
                if fresh_server:
                    fresh_server.status = McpServerStatus.ERROR
                    fresh_server.last_error = error
                    fresh_server.process_id = None
                    fresh_server.health_check_failures += 1
                    await db.commit()
                    logger.error(f"💥 서버 {fresh_server.name} 시작 실패: {error}")
        except Exception as e:
            logger.error(f"시작 실큨 처리 중 오류: {e}")
    
    async def stop_all_servers(self):
        """모든 서버 중지"""
        async with async_session() as db:
            stmt = select(McpServer).where(McpServer.process_id.isnot(None))
            result = await db.execute(stmt)
            running_servers = result.scalars().all()
            
            logger.info(f"🛑 {len(running_servers)}개 서버 중지 중...")
            
            for server in running_servers:
                await self.stop_server(str(server.id))
    
    async def get_server_status(self, server_id: str) -> Optional[Dict]:
        """서버 상태 조회"""
        async with async_session() as db:
            server = await db.get(McpServer, server_id)
            if not server:
                return None
            
            # 실시간 프로세스 확인
            is_running = False
            memory_mb = 0
            cpu_percent = 0
            
            if server.process_id:
                is_running = await self._check_process_alive(server.process_id)
                
                if is_running:
                    try:
                        proc = psutil.Process(server.process_id)
                        memory_mb = proc.memory_info().rss // (1024 * 1024)
                        cpu_percent = proc.cpu_percent()
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        is_running = False
            
            return {
                "id": str(server.id),
                "name": server.name,
                "status": server.status.value,
                "is_enabled": server.is_enabled,
                "is_running": is_running,
                "process_id": server.process_id,
                "last_health_check": server.last_health_check,
                "health_check_failures": server.health_check_failures,
                "last_started_at": server.last_started_at,
                "restart_count": server.restart_count,
                "last_error": server.last_error,
                "memory_mb": memory_mb,
                "cpu_percent": cpu_percent,
                "is_healthy": server.is_healthy,
                "needs_restart": server.needs_restart
            }
    
    async def get_all_status(self) -> List[Dict]:
        """모든 서버 상태 조회"""
        async with async_session() as db:
            stmt = select(McpServer).where(McpServer.is_enabled == True)
            result = await db.execute(stmt)
            servers = result.scalars().all()
            
            statuses = []
            for server in servers:
                status = await self.get_server_status(str(server.id))
                if status:
                    statuses.append(status)
            
            return statuses
    
    async def _verify_mcp_initialization(self, server_id: str, server_name: str):
        """MCP 초기화 검증 (백그라운드 작업)"""
        try:
            logger.info(f"🔄 MCP 초기화 검증 시작: {server_name}")
            
            # 서버 설정 조회
            async with async_session() as db:
                server = await db.get(McpServer, server_id)
                if not server:
                    logger.error(f"❌ 서버 {server_id} 찾을 수 없음")
                    return
                
                server_config = {
                    "command": server.command,
                    "args": server.args or [],
                    "env": server.env or {},
                    "timeout": server.timeout,
                    "is_enabled": server.is_enabled
                }
            
            # 세션 매니저 사용하여 초기화 시도
            try:
                session = await self.session_manager.get_or_create_session(server_id, server_config)
                await self.session_manager.initialize_session(session)
                logger.info(f"✅ MCP 초기화 성공: {server_name}")
            except Exception as e:
                logger.warning(f"⚠️ MCP 초기화 실패 (정상적인 경우일 수 있음): {server_name} - {e}")
                # 초기화 실패는 크리티컬하지 않음 - 첫 요청 시에도 시도됨
            
        except Exception as e:
            logger.error(f"❌ MCP 초기화 검증 중 오류: {server_name} - {e}")


# 전역 인스턴스
_process_manager: Optional[ProcessManager] = None


def get_process_manager() -> ProcessManager:
    """ProcessManager 싱글톤 인스턴스 반환"""
    global _process_manager
    if _process_manager is None:
        _process_manager = ProcessManager()
    return _process_manager


async def initialize_process_manager():
    """ProcessManager 초기화"""
    process_manager = get_process_manager()
    await process_manager.initialize_on_startup()


async def shutdown_process_manager():
    """ProcessManager 종료"""
    if _process_manager:
        await _process_manager.shutdown()