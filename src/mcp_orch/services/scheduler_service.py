"""
APScheduler 기반 백그라운드 워커 서비스

서버 상태 자동 업데이트를 위한 스케줄러 관리
"""

import logging
import asyncio
from datetime import datetime, timedelta
from typing import Optional, Dict, List

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.executors.asyncio import AsyncIOExecutor
from apscheduler.jobstores.memory import MemoryJobStore
from apscheduler import events
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import McpServer, Project, WorkerConfig
from ..models.mcp_server import McpTool
from ..services.mcp_connection_service import mcp_connection_service

logger = logging.getLogger(__name__)


class SchedulerService:
    """APScheduler 기반 백그라운드 워커 관리 서비스"""
    
    def __init__(self):
        self.scheduler: Optional[AsyncIOScheduler] = None
        self.is_running = False
        self.config = WorkerConfig.get_default_config()  # 기본 설정값 사용
        self.job_history: List[Dict] = []
        self.max_history_size = 100
        self._config_loaded = False
        
    async def load_config_from_db(self):
        """데이터베이스에서 워커 설정 로드"""
        try:
            db = next(get_db())
            try:
                worker_config = WorkerConfig.load_or_create_config(db)
                self.config = worker_config.to_dict()
                self._config_loaded = True
                logger.info(f"Loaded worker config from database: {self.config}")
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Failed to load config from database: {e}")
            # 기본값 사용
            self.config = WorkerConfig.get_default_config()
            logger.info("Using default worker configuration")
        
    async def save_config_to_db(self):
        """현재 설정을 데이터베이스에 저장"""
        try:
            db = next(get_db())
            try:
                worker_config = WorkerConfig.load_or_create_config(db)
                worker_config.update_from_dict(self.config)
                db.commit()
                logger.info(f"Saved worker config to database: {self.config}")
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Failed to save config to database: {e}")
        
    async def initialize(self):
        """스케줄러 초기화"""
        if self.scheduler is not None:
            logger.warning("Scheduler already initialized")
            return
            
        # 데이터베이스에서 설정 로드
        if not self._config_loaded:
            await self.load_config_from_db()
            
        # Job stores, executors, and job defaults (APScheduler 3.x)
        jobstores = {
            'default': MemoryJobStore()
        }
        
        executors = {
            'default': AsyncIOExecutor()  # max_workers 매개변수 제거
        }
        
        job_defaults = {
            'coalesce': self.config['coalesce'],
            'max_instances': self.config['max_instances']
        }
        
        # 스케줄러 생성
        self.scheduler = AsyncIOScheduler(
            jobstores=jobstores,
            executors=executors,
            job_defaults=job_defaults,
            timezone='Asia/Seoul'
        )
        
        # 이벤트 리스너 등록 (APScheduler 3.x 방식)
        self.scheduler.add_listener(self._job_executed, mask=events.EVENT_JOB_EXECUTED)
        self.scheduler.add_listener(self._job_error, mask=events.EVENT_JOB_ERROR)
        
        logger.info("Scheduler service initialized")
        
    async def start(self):
        """스케줄러 시작"""
        if not self.scheduler:
            await self.initialize()
            
        if self.is_running:
            logger.warning("Scheduler already running")
            return
            
        # 서버 상태 체크 작업 스케줄링 (APScheduler 3.x 방식)
        self.scheduler.add_job(
            self._check_all_servers_status,
            trigger=IntervalTrigger(seconds=self.config['server_check_interval']),
            id='server_status_check',
            name='서버 상태 자동 체크',
            replace_existing=True
        )
        
        self.scheduler.start()
        self.is_running = True
        
        logger.info(f"Scheduler started with {self.config['server_check_interval']}s interval")
        
    async def stop(self):
        """스케줄러 정지"""
        if not self.scheduler or not self.is_running:
            logger.warning("Scheduler not running")
            return
            
        self.scheduler.shutdown(wait=False)
        self.is_running = False
        
        logger.info("Scheduler stopped")
        
    async def restart(self):
        """스케줄러 재시작"""
        await self.stop()
        await self.start()
        
    def update_config(self, new_config: Dict):
        """설정 업데이트"""
        old_interval = self.config['server_check_interval']
        self.config.update(new_config)
        
        # 데이터베이스에 설정 저장
        import asyncio
        asyncio.create_task(self.save_config_to_db())
        
        # 간격이 변경되면 스케줄러 재시작
        if self.is_running and old_interval != self.config['server_check_interval']:
            logger.info(f"Interval changed from {old_interval}s to {self.config['server_check_interval']}s")
            # 백그라운드에서 재시작 (블로킹 방지)
            asyncio.create_task(self.restart())
            
    def get_status(self) -> Dict:
        """스케줄러 상태 조회"""
        if not self.scheduler:
            return {
                'running': False,
                'jobs': [],
                'config': self.config,
                'last_execution': None,
                'job_history_count': len(self.job_history)
            }
            
        jobs = []
        if self.scheduler.get_jobs():
            for job in self.scheduler.get_jobs():
                jobs.append({
                    'id': job.id,
                    'name': job.name,
                    'next_run': job.next_run_time.isoformat() if job.next_run_time else None,
                    'trigger': str(job.trigger)
                })
                
        last_execution = None
        if self.job_history:
            last_execution = self.job_history[-1].get('timestamp')
            
        return {
            'running': self.is_running,
            'jobs': jobs,
            'config': self.config,
            'last_execution': last_execution,
            'job_history_count': len(self.job_history)
        }
        
    def get_job_history(self, limit: int = 50) -> List[Dict]:
        """작업 실행 이력 조회"""
        return self.job_history[-limit:] if limit else self.job_history
        
    async def _check_all_servers_status(self):
        """모든 활성 서버의 상태를 확인하고 업데이트"""
        start_time = datetime.now()
        logger.info("Starting scheduled server status check")
        
        try:
            # 데이터베이스 세션 획득
            db = next(get_db())
            
            try:
                # 모든 활성화된 서버 조회
                servers = db.query(McpServer).filter(
                    McpServer.is_enabled == True
                ).all()
                
                checked_count = 0
                updated_count = 0
                error_count = 0
                tools_synced_count = 0
                
                for server in servers:
                    try:
                        # 서버 상태 확인
                        server_config = {
                            'command': server.command,
                            'args': server.args or [],
                            'env': server.env or {},
                            'timeout': 30
                        }
                        
                        unique_server_id = f"{server.project_id}_{server.name}"
                        status = await mcp_connection_service.check_server_status(
                            unique_server_id, server_config
                        )
                        
                        # 상태 매핑
                        from ..models.mcp_server import McpServerStatus
                        if status == "online":
                            new_status = McpServerStatus.ACTIVE
                        elif status == "offline":
                            new_status = McpServerStatus.INACTIVE
                        else:
                            new_status = McpServerStatus.ERROR
                            
                        # 상태가 변경된 경우만 업데이트
                        if server.status != new_status:
                            server.status = new_status
                            server.last_used_at = datetime.utcnow()
                            updated_count += 1
                            logger.info(f"Updated server {server.name} status to {new_status.value}")
                        
                        # 온라인 서버의 도구 목록 동기화
                        if new_status == McpServerStatus.ACTIVE:
                            try:
                                tools_updated = await self._sync_server_tools(server, db)
                                if tools_updated > 0:
                                    tools_synced_count += tools_updated
                                    logger.info(f"Synced {tools_updated} tools for server {server.name}")
                            except Exception as tool_sync_error:
                                logger.error(f"Failed to sync tools for server {server.name}: {tool_sync_error}")
                                # 도구 동기화 실패는 서버 상태에 영향을 주지 않음
                            
                        checked_count += 1
                        
                    except Exception as e:
                        error_count += 1
                        logger.error(f"Error checking server {server.name}: {e}")
                        
                        # 에러 상태로 업데이트
                        server.status = McpServerStatus.ERROR
                        server.last_error = str(e)
                        server.last_used_at = datetime.utcnow()
                        
                # 변경사항 커밋
                db.commit()
                
                execution_time = (datetime.now() - start_time).total_seconds()
                
                # 실행 이력 저장
                self._add_job_history({
                    'timestamp': start_time.isoformat(),
                    'duration': execution_time,
                    'checked_count': checked_count,
                    'updated_count': updated_count,
                    'error_count': error_count,
                    'tools_synced_count': tools_synced_count,
                    'status': 'success'
                })
                
                logger.info(
                    f"Scheduled server check completed: "
                    f"checked={checked_count}, updated={updated_count}, "
                    f"tools_synced={tools_synced_count}, errors={error_count}, "
                    f"duration={execution_time:.2f}s"
                )
                
            finally:
                db.close()
                
        except Exception as e:
            execution_time = (datetime.now() - start_time).total_seconds()
            logger.error(f"Scheduled server check failed: {e}")
            
            # 실행 이력 저장 (실패)
            self._add_job_history({
                'timestamp': start_time.isoformat(),
                'duration': execution_time,
                'error': str(e),
                'status': 'error'
            })
            
    def _job_executed(self, event):
        """작업 실행 완료 이벤트 핸들러"""
        logger.debug(f"Job {event.job_id} executed successfully")
        
    def _job_error(self, event):
        """작업 실행 오류 이벤트 핸들러"""
        logger.error(f"Job {event.job_id} failed: {event.exception}")
        
    async def _sync_server_tools(self, server: McpServer, db: Session) -> int:
        """서버의 도구 목록을 동기화하고 업데이트된 도구 개수 반환"""
        try:
            # 서버 설정 준비
            server_config = {
                'command': server.command,
                'args': server.args or [],
                'env': server.env or {},
                'timeout': 30
            }
            
            unique_server_id = f"{server.project_id}_{server.name}"
            
            # 실제 서버에서 도구 목록 가져오기
            current_tools = await mcp_connection_service.get_server_tools(
                unique_server_id, server_config
            )
            
            # 현재 DB에 저장된 도구 목록
            existing_tools = {tool.name: tool for tool in server.tools}
            current_tool_names = {tool.get('name') for tool in current_tools if tool.get('name')}
            
            tools_updated = 0
            
            # 새로운 도구 추가 또는 기존 도구 업데이트
            for tool_data in current_tools:
                tool_name = tool_data.get('name')
                if not tool_name:
                    continue
                    
                if tool_name in existing_tools:
                    # 기존 도구 업데이트
                    existing_tool = existing_tools[tool_name]
                    existing_tool.description = tool_data.get('description', '')
                    existing_tool.input_schema = tool_data.get('inputSchema', {})
                    existing_tool.last_seen_at = datetime.utcnow()
                else:
                    # 새로운 도구 추가
                    new_tool = McpTool(
                        server_id=server.id,
                        name=tool_name,
                        display_name=tool_data.get('displayName') or tool_name,
                        description=tool_data.get('description', ''),
                        input_schema=tool_data.get('inputSchema', {}),
                        discovered_at=datetime.utcnow(),
                        last_seen_at=datetime.utcnow()
                    )
                    db.add(new_tool)
                    tools_updated += 1
                    
            # 더 이상 존재하지 않는 도구 제거
            for tool_name, tool in existing_tools.items():
                if tool_name not in current_tool_names:
                    db.delete(tool)
                    tools_updated += 1
                    
            return tools_updated
            
        except Exception as e:
            logger.error(f"Error syncing tools for server {server.name}: {e}")
            return 0

    def _add_job_history(self, entry: Dict):
        """작업 실행 이력 추가"""
        self.job_history.append(entry)
        
        # 최대 이력 수 제한
        if len(self.job_history) > self.max_history_size:
            self.job_history = self.job_history[-self.max_history_size:]


# 전역 스케줄러 서비스 인스턴스
scheduler_service = SchedulerService()