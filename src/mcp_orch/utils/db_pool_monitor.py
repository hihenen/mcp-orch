"""Database Connection Pool Monitor

연결 풀 상태를 모니터링하고 문제 발생 시 알림을 제공하는 유틸리티
"""

import logging
import asyncio
from typing import Dict, Any
from datetime import datetime
from sqlalchemy.pool import QueuePool
from sqlalchemy.ext.asyncio import AsyncEngine
from sqlalchemy import create_engine

logger = logging.getLogger(__name__)


class DatabasePoolMonitor:
    """데이터베이스 연결 풀 모니터"""
    
    def __init__(self, engine: AsyncEngine = None, sync_engine = None):
        self.engine = engine
        self.sync_engine = sync_engine
        self.warning_threshold = 0.8  # 80% 사용 시 경고
        self.critical_threshold = 0.95  # 95% 사용 시 치명적
        
    def get_pool_status(self) -> Dict[str, Any]:
        """연결 풀 상태 정보 반환"""
        status = {
            "timestamp": datetime.utcnow().isoformat(),
            "async_pool": None,
            "sync_pool": None,
            "health": "unknown"
        }
        
        # 동기 엔진 풀 상태
        if self.sync_engine and hasattr(self.sync_engine.pool, 'status'):
            pool = self.sync_engine.pool
            if isinstance(pool, QueuePool):
                status["sync_pool"] = {
                    "size": pool.size(),
                    "checked_in": pool.checkedin(),
                    "checked_out": pool.checkedout(),
                    "overflow": pool.overflow(),
                    "total": pool.size() + pool.overflow(),
                    "usage_percent": self._calculate_usage_percent(pool)
                }
        
        # 비동기 엔진 풀 상태 (AsyncAdaptedQueuePool)
        if self.engine:
            # 비동기 풀은 직접 접근이 제한적이므로 sync 풀로 추정
            if hasattr(self.engine, 'pool'):
                # 기본 정보만 제공
                status["async_pool"] = {
                    "info": "AsyncAdaptedQueuePool - detailed stats not directly accessible",
                    "pool_size": getattr(self.engine, '_pool_size', 30),
                    "max_overflow": getattr(self.engine, '_max_overflow', 70)
                }
        
        # 전체 건강 상태 평가
        status["health"] = self._evaluate_health(status)
        
        return status
    
    def _calculate_usage_percent(self, pool: QueuePool) -> float:
        """풀 사용률 계산"""
        try:
            total_capacity = pool.size() + pool._max_overflow
            in_use = pool.checkedout()
            return (in_use / total_capacity) * 100 if total_capacity > 0 else 0
        except:
            return 0
    
    def _evaluate_health(self, status: Dict) -> str:
        """풀 건강 상태 평가"""
        if status["sync_pool"]:
            usage = status["sync_pool"]["usage_percent"]
            if usage >= self.critical_threshold * 100:
                return "critical"
            elif usage >= self.warning_threshold * 100:
                return "warning"
            else:
                return "healthy"
        return "unknown"
    
    async def monitor_loop(self, interval: int = 60):
        """주기적 모니터링 루프"""
        while True:
            try:
                status = self.get_pool_status()
                
                # 상태에 따른 로깅
                if status["health"] == "critical":
                    logger.critical(f"🚨 Database pool critical: {status}")
                elif status["health"] == "warning":
                    logger.warning(f"⚠️ Database pool warning: {status}")
                else:
                    logger.debug(f"✅ Database pool healthy: {status}")
                
                # 임계값 초과 시 추가 액션
                if status["sync_pool"] and status["sync_pool"]["usage_percent"] > 90:
                    logger.error(
                        f"Database pool usage exceeded 90%! "
                        f"Checked out: {status['sync_pool']['checked_out']}, "
                        f"Total capacity: {status['sync_pool']['total']}"
                    )
                    # 여기에 알림 로직 추가 가능 (Slack, Email 등)
                
            except Exception as e:
                logger.error(f"Error in pool monitoring: {e}")
            
            await asyncio.sleep(interval)
    
    def log_pool_stats(self):
        """현재 풀 상태를 로그에 기록"""
        status = self.get_pool_status()
        logger.info(f"📊 Database Pool Status: {status}")
        return status


# 전역 모니터 인스턴스 (app.py에서 초기화)
monitor = None


def init_monitor(engine: AsyncEngine = None, sync_engine = None):
    """모니터 초기화"""
    global monitor
    monitor = DatabasePoolMonitor(engine, sync_engine)
    return monitor


def get_monitor() -> DatabasePoolMonitor:
    """모니터 인스턴스 반환"""
    return monitor