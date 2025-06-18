-- ToolCallLog 성능 최적화를 위한 인덱스 추가
-- Datadog/Sentry 스타일 로그 조회 성능 최적화

-- 기본 조회 패턴용 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_tool_call_log_project_time 
ON tool_call_logs(project_id, timestamp DESC);

-- 프로젝트별 상태 기반 조회
CREATE INDEX IF NOT EXISTS idx_tool_call_log_project_status_time 
ON tool_call_logs(project_id, status, timestamp DESC);

-- 서버별 조회 최적화
CREATE INDEX IF NOT EXISTS idx_tool_call_log_project_server_time 
ON tool_call_logs(project_id, server_id, timestamp DESC);

-- 도구별 조회 최적화
CREATE INDEX IF NOT EXISTS idx_tool_call_log_project_tool_time 
ON tool_call_logs(project_id, tool_name, timestamp DESC);

-- 세션별 조회 최적화
CREATE INDEX IF NOT EXISTS idx_tool_call_log_session_time 
ON tool_call_logs(session_id, timestamp DESC);

-- 실행시간 기반 필터링 최적화
CREATE INDEX IF NOT EXISTS idx_tool_call_log_execution_time 
ON tool_call_logs(project_id, execution_time) 
WHERE execution_time IS NOT NULL;

-- 에러 로그 조회 최적화
CREATE INDEX IF NOT EXISTS idx_tool_call_log_error_status 
ON tool_call_logs(project_id, status, timestamp DESC) 
WHERE status IN ('error', 'timeout');

-- JSONB 필드 텍스트 검색 최적화 (GIN 인덱스)
CREATE INDEX IF NOT EXISTS idx_tool_call_log_input_data_gin 
ON tool_call_logs USING GIN (input_data);

CREATE INDEX IF NOT EXISTS idx_tool_call_log_output_data_gin 
ON tool_call_logs USING GIN (output_data);

-- 메트릭 집계 최적화용 인덱스
CREATE INDEX IF NOT EXISTS idx_tool_call_log_metrics 
ON tool_call_logs(project_id, server_id, timestamp, status, execution_time);

-- 클라이언트 IP/User-Agent 기반 분석용
CREATE INDEX IF NOT EXISTS idx_tool_call_log_client_info 
ON tool_call_logs(project_id, ip_address, user_agent, timestamp DESC) 
WHERE ip_address IS NOT NULL;

-- 도구 네임스페이스 기반 조회
CREATE INDEX IF NOT EXISTS idx_tool_call_log_namespace 
ON tool_call_logs(project_id, tool_namespace, timestamp DESC) 
WHERE tool_namespace IS NOT NULL;

-- 통계 쿼리 최적화를 위한 부분 인덱스들
CREATE INDEX IF NOT EXISTS idx_tool_call_log_success_only 
ON tool_call_logs(project_id, timestamp DESC, execution_time) 
WHERE status = 'success';

CREATE INDEX IF NOT EXISTS idx_tool_call_log_recent_24h 
ON tool_call_logs(project_id, server_id, tool_name, status, execution_time) 
WHERE timestamp >= (NOW() - INTERVAL '24 hours');

-- 커스텀 시간 범위 조회 최적화
CREATE INDEX IF NOT EXISTS idx_tool_call_log_time_range 
ON tool_call_logs(timestamp, project_id, status) 
WHERE timestamp >= (NOW() - INTERVAL '7 days');

-- 인덱스 생성 확인 및 통계 업데이트
ANALYZE tool_call_logs;

-- 인덱스 사용 통계 확인 쿼리 (참고용)
/*
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE tablename = 'tool_call_logs'
ORDER BY idx_scan DESC;
*/

-- 테이블 통계 확인 쿼리 (참고용)
/*
SELECT 
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables 
WHERE relname = 'tool_call_logs';
*/