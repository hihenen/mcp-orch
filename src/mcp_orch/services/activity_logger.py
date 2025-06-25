"""
Activity Logger - 단일 진입점 패턴
모든 프로젝트 및 팀 활동 기록을 위한 중앙화된 로깅 시스템

Phase 1: DB 직접 저장
Phase 2: 추상 인터페이스 준비
Phase 3: Event Queue 시스템
"""

import logging
import json
from datetime import datetime
from typing import Dict, Any, Optional, Union
from uuid import UUID

from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models.activity import Activity, ActivityType, ActivitySeverity


logger = logging.getLogger(__name__)


def _ensure_json_serializable(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    딕셔너리에서 JSON 직렬화 불가능한 객체들을 안전하게 제거합니다.
    
    Args:
        data: 검사할 딕셔너리
        
    Returns:
        JSON 직렬화 가능한 딕셔너리
    """
    if not data:
        return {}
    
    safe_data = {}
    for key, value in data.items():
        try:
            # JSON 직렬화 테스트
            json.dumps(value, default=str)
            safe_data[key] = value
        except (TypeError, ValueError) as e:
            # 직렬화 불가능한 객체는 로그에 기록하고 제외
            logger.warning(f"Skipping non-serializable value for key '{key}': {type(value).__name__} - {e}")
            # SQLAlchemy Session 등 특별한 객체들은 타입명으로 대체
            if hasattr(value, '__class__'):
                safe_data[f"{key}_type"] = value.__class__.__name__
    
    return safe_data


class ActivityLogger:
    """
    통합 활동 로깅을 위한 단일 진입점
    
    특징:
    - 프로젝트, 팀 등 모든 리소스의 활동 기록
    - 모든 비즈니스 로직에서 동일한 인터페이스 호출
    - 내부 구현은 Phase별로 자유롭게 변경 가능
    - 실패해도 주 기능에 영향 없음 (Fail-safe)
    """
    
    @staticmethod
    def log_activity(
        action: Union[str, ActivityType],
        description: str,
        project_id: Optional[Union[str, UUID]] = None,
        team_id: Optional[Union[str, UUID]] = None,
        user_id: Optional[Union[str, UUID]] = None,
        severity: Union[str, ActivitySeverity] = ActivitySeverity.INFO,
        target_type: Optional[str] = None,
        target_id: Optional[Union[str, UUID]] = None,
        meta_data: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None,
        db: Optional[Session] = None
    ) -> bool:
        """
        통합 활동을 기록하는 단일 진입점
        
        Args:
            action: 활동 타입 (예: 'server.created', 'team.created')
            description: 사용자에게 표시될 설명
            project_id: 프로젝트 ID (프로젝트 활동인 경우)
            team_id: 팀 ID (팀 활동인 경우)
            user_id: 활동을 수행한 사용자 ID (옵셔널, 시스템 활동의 경우 None)
            severity: 활동 중요도 (info, warning, error, success)
            target_type: 대상 리소스 타입 (예: 'server', 'member', 'api_key')
            target_id: 대상 리소스 ID
            meta_data: 추가 메타데이터 (JSON)
            context: 컨텍스트 정보 (JSON)
            db: 데이터베이스 세션 (옵셔널, 없으면 새로 생성)
            
        Returns:
            bool: 성공 여부
        """
        try:
            # 유효성 검사: project_id 또는 team_id 중 하나는 필수
            if not project_id and not team_id:
                raise ValueError("Either project_id or team_id must be provided")
            
            # Phase 1: DB 직접 저장 구현
            return ActivityLogger._log_to_database(
                action=action,
                description=description,
                project_id=project_id,
                team_id=team_id,
                user_id=user_id,
                severity=severity,
                target_type=target_type,
                target_id=target_id,
                meta_data=meta_data or {},
                context=context or {},
                db=db
            )
        except Exception as e:
            # 활동 로깅 실패가 주 기능에 영향을 주지 않도록 로그만 남기고 계속 진행
            logger.error(f"Activity logging failed: {e}", exc_info=True)
            return False
    
    @staticmethod
    def _log_to_database(
        action: Union[str, ActivityType],
        description: str,
        project_id: Optional[Union[str, UUID]] = None,
        team_id: Optional[Union[str, UUID]] = None,
        user_id: Optional[Union[str, UUID]] = None,
        severity: Union[str, ActivitySeverity] = ActivitySeverity.INFO,
        target_type: Optional[str] = None,
        target_id: Optional[Union[str, UUID]] = None,
        meta_data: Dict[str, Any] = None,
        context: Dict[str, Any] = None,
        db: Optional[Session] = None
    ) -> bool:
        """
        Phase 1: 데이터베이스에 직접 저장
        """
        should_close_db = False
        
        try:
            # 데이터베이스 세션 관리
            if db is None:
                db = SessionLocal()
                should_close_db = True
            
            # 타입 변환
            if isinstance(project_id, str):
                project_id = UUID(project_id)
            if isinstance(team_id, str):
                team_id = UUID(team_id)
            if isinstance(user_id, str):
                user_id = UUID(user_id)
            if isinstance(target_id, str) and target_id:
                target_id = str(target_id)  # target_id는 문자열로 저장
            
            # ActivityType enum 변환
            if isinstance(action, str):
                try:
                    action = ActivityType(action)
                except ValueError:
                    # 알 수 없는 액션은 메타데이터에 기록하고 INFO로 저장
                    meta_data = meta_data or {}
                    meta_data['original_action'] = action
                    action = ActivityType.PROJECT_SETTINGS_UPDATED  # 기본 값
            
            # ActivitySeverity enum 변환
            if isinstance(severity, str):
                try:
                    severity = ActivitySeverity(severity)
                except ValueError:
                    severity = ActivitySeverity.INFO
            
            # 컨텍스트 정보 자동 추가
            context = context or {}
            context.update({
                'timestamp': datetime.utcnow().isoformat(),
                'source': 'activity_logger',
                'phase': 'phase_1_database'
            })
            
            # JSON 직렬화 안전성 검사
            safe_meta_data = _ensure_json_serializable(meta_data or {})
            safe_context = _ensure_json_serializable(context)
            
            # 활동 기록 생성
            activity = Activity(
                project_id=project_id,
                team_id=team_id,
                user_id=user_id,
                action=action,
                title=description or action.value,  # title 필드 필수
                description=description,
                severity=severity,
                target_type=target_type,
                target_id=target_id,
                meta_data=safe_meta_data,
                context=safe_context
            )
            
            db.add(activity)
            db.commit()
            
            resource_info = f"project {project_id}" if project_id else f"team {team_id}"
            logger.info(f"Activity logged: {action.value} for {resource_info}")
            return True
            
        except Exception as e:
            if db:
                db.rollback()
            logger.error(f"Failed to log activity to database: {e}", exc_info=True)
            return False
        finally:
            if should_close_db and db:
                db.close()
    
    @staticmethod
    def log_server_created(project_id: UUID, user_id: UUID, server_id: UUID, server_name: str, db: Optional[Session] = None, **kwargs) -> bool:
        """서버 생성 활동 로깅 (편의 메소드)"""
        return ActivityLogger.log_activity(
            action=ActivityType.SERVER_CREATED,
            description=f"새 MCP 서버 '{server_name}'가 추가되었습니다",
            project_id=project_id,
            user_id=user_id,
            severity=ActivitySeverity.SUCCESS,
            target_type='server',
            target_id=str(server_id),
            meta_data={'server_name': server_name, **kwargs},
            db=db
        )
    
    @staticmethod
    def log_server_deleted(project_id: UUID, user_id: UUID, server_id: UUID, server_name: str, db: Optional[Session] = None, **kwargs) -> bool:
        """서버 삭제 활동 로깅 (편의 메소드)"""
        return ActivityLogger.log_activity(
            action=ActivityType.SERVER_DELETED,
            description=f"MCP 서버 '{server_name}'가 삭제되었습니다",
            project_id=project_id,
            user_id=user_id,
            severity=ActivitySeverity.WARNING,
            target_type='server',
            target_id=str(server_id),
            meta_data={'server_name': server_name, **kwargs},
            db=db
        )
    
    @staticmethod
    def log_tool_executed(project_id: UUID, user_id: UUID, server_id: UUID, tool_name: str, success: bool = True, db: Optional[Session] = None, **kwargs) -> bool:
        """도구 실행 활동 로깅 (편의 메소드)"""
        action = ActivityType.TOOL_EXECUTED if success else ActivityType.TOOL_FAILED
        severity = ActivitySeverity.SUCCESS if success else ActivitySeverity.ERROR
        status = "성공" if success else "실패"
        
        return ActivityLogger.log_activity(
            action=action,
            description=f"도구 '{tool_name}' 실행 {status}",
            project_id=project_id,
            user_id=user_id,
            severity=severity,
            target_type='server',
            target_id=str(server_id),
            meta_data={'tool_name': tool_name, 'success': success, **kwargs},
            db=db
        )
    
    @staticmethod
    def log_member_invited(project_id: UUID, inviter_id: UUID, invitee_email: str, role: str, db: Optional[Session] = None, **kwargs) -> bool:
        """멤버 초대 활동 로깅 (편의 메소드)"""
        return ActivityLogger.log_activity(
            action=ActivityType.MEMBER_INVITED,
            description=f"새 멤버 '{invitee_email}'이 {role} 역할로 초대되었습니다",
            project_id=project_id,
            user_id=inviter_id,
            severity=ActivitySeverity.INFO,
            target_type='member',
            target_id=invitee_email,
            meta_data={'invitee_email': invitee_email, 'role': role, **kwargs},
            db=db
        )
    
    @staticmethod
    def log_api_key_created(project_id: UUID, user_id: UUID, key_name: str, db: Optional[Session] = None, **kwargs) -> bool:
        """API 키 생성 활동 로깅 (편의 메소드)"""
        return ActivityLogger.log_activity(
            action=ActivityType.API_KEY_CREATED,
            description=f"새 API 키 '{key_name}'가 생성되었습니다",
            project_id=project_id,
            user_id=user_id,
            severity=ActivitySeverity.SUCCESS,
            target_type='api_key',
            target_id=key_name,
            meta_data={'key_name': key_name, **kwargs},
            db=db
        )
    
    # === 팀 활동 로깅 편의 메소드들 ===
    
    @staticmethod
    def log_team_created(team_id: UUID, user_id: UUID, team_name: str, db: Optional[Session] = None, **kwargs) -> bool:
        """팀 생성 활동 로깅 (편의 메소드)"""
        return ActivityLogger.log_activity(
            action=ActivityType.TEAM_CREATED,
            description=f"새 팀 '{team_name}'이 생성되었습니다",
            team_id=team_id,
            user_id=user_id,
            severity=ActivitySeverity.SUCCESS,
            target_type='team',
            target_id=str(team_id),
            meta_data={'team_name': team_name, **kwargs},
            db=db
        )
    
    @staticmethod
    def log_team_member_joined(team_id: UUID, user_id: UUID, team_name: str, user_name: str, role: str, db: Optional[Session] = None, **kwargs) -> bool:
        """팀 멤버 가입 활동 로깅 (편의 메소드)"""
        return ActivityLogger.log_activity(
            action=ActivityType.MEMBER_JOINED,
            description=f"새 멤버 '{user_name}'이 {role} 역할로 팀에 가입했습니다",
            team_id=team_id,
            user_id=user_id,
            severity=ActivitySeverity.SUCCESS,
            target_type='member',
            target_id=str(user_id),
            meta_data={'team_name': team_name, 'user_name': user_name, 'role': role, **kwargs},
            db=db
        )
    
    @staticmethod
    def log_team_api_key_created(team_id: UUID, user_id: UUID, team_name: str, api_key_name: str, api_key_id: str, db: Optional[Session] = None, **kwargs) -> bool:
        """팀 API 키 생성 활동 로깅 (편의 메소드)"""
        return ActivityLogger.log_activity(
            action=ActivityType.API_KEY_CREATED,
            description=f"새 API 키 '{api_key_name}'가 생성되었습니다",
            team_id=team_id,
            user_id=user_id,
            severity=ActivitySeverity.SUCCESS,
            target_type='api_key',
            target_id=api_key_id,
            meta_data={'team_name': team_name, 'api_key_name': api_key_name, **kwargs},
            db=db
        )


# Phase 2 확장성 준비: Abstract Base Class (현재는 사용하지 않음)
# 향후 Phase 2에서 Redis/Celery 도입 시 활용 예정
"""
from abc import ABC, abstractmethod

class ActivityBackend(ABC):
    @abstractmethod
    def record_activity(self, **kwargs): pass
    
    @abstractmethod  
    def get_activities(self, **kwargs): pass

class DatabaseActivityBackend(ActivityBackend):
    # Phase 1 구현
    pass

class EventQueueActivityBackend(ActivityBackend):
    # Phase 3 구현 (Redis + Celery)
    pass
"""