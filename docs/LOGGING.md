# MCP Orchestrator 로깅 가이드

MCP Orchestrator는 유연하고 구조화된 로깅 시스템을 제공합니다. 개발 환경에서는 사람이 읽기 쉬운 텍스트 로그를, 운영 환경에서는 JSON 구조화 로그를 지원합니다.

## 목차

1. [로깅 설정](#로깅-설정)
2. [환경변수 구성](#환경변수-구성)
3. [로깅 사용 예시](#로깅-사용-예시)
4. [JSON 로깅 출력 예시](#json-로깅-출력-예시)
5. [컨텍스트 로깅](#컨텍스트-로깅)
6. [파일 로깅](#파일-로깅)
7. [모니터링 도구 연동](#모니터링-도구-연동)

## 로깅 설정

### 기본 설정

`.env` 파일에서 로깅을 설정할 수 있습니다:

```env
# 개발 환경 (기본값)
LOG_LEVEL=INFO
LOG_FORMAT=text
LOG_OUTPUT=console
```

### 운영 환경 설정

```env
# 운영 환경 (구조화된 로그)
LOG_LEVEL=INFO
LOG_FORMAT=json
LOG_OUTPUT=both
LOG_FILE_PATH=/var/log/mcp-orch/app.log
```

## 환경변수 구성

| 환경변수 | 값 | 기본값 | 설명 |
|---------|-----|-------|------|
| `LOG_LEVEL` | `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL` | `INFO` | 로그 레벨 |
| `LOG_FORMAT` | `text`, `json` | `text` | 로그 포맷 |
| `LOG_OUTPUT` | `console`, `file`, `both` | `console` | 출력 방식 |
| `LOG_FILE_PATH` | 파일 경로 | `None` | 파일 출력 시 로그 파일 경로 |

## 로깅 사용 예시

### 기본 로깅

```python
from mcp_orch.utils.logging import get_logger

logger = get_logger(__name__)

# 기본 로깅
logger.info("서버가 시작되었습니다")
logger.warning("연결 재시도 중...")
logger.error("데이터베이스 연결 실패")
```

### 사용자 액션 로깅

```python
from mcp_orch.utils.logging import log_user_action, get_logger

logger = get_logger(__name__)

# 사용자 액션 로깅
log_user_action(
    logger, 
    user_id="user_123", 
    action="project_created",
    project_id="proj_456",
    project_name="새 프로젝트"
)
```

### MCP 서버 이벤트 로깅

```python
from mcp_orch.utils.logging import log_mcp_server_event, get_logger

logger = get_logger(__name__)

# MCP 서버 이벤트 로깅
log_mcp_server_event(
    logger,
    server_name="file-server",
    event="connection_established",
    project_id="proj_123"
)
```

### API 요청 로깅

```python
from mcp_orch.utils.logging import log_api_request, get_logger

logger = get_logger(__name__)

# API 요청 로깅
log_api_request(
    logger,
    method="POST",
    path="/api/projects",
    user_id="user_123",
    status_code=201
)
```

## JSON 로깅 출력 예시

`LOG_FORMAT=json`으로 설정하면 다음과 같은 구조화된 로그가 출력됩니다:

### 기본 로그 메시지

```json
{
  "timestamp": "2025-06-26T12:48:36Z",
  "level": "INFO",
  "logger": "mcp_orch.api.projects",
  "message": "프로젝트가 생성되었습니다"
}
```

### 사용자 액션 로그

```json
{
  "timestamp": "2025-06-26T12:48:37Z",
  "level": "INFO",
  "logger": "mcp_orch.api.projects",
  "message": "User action: project_created",
  "user_id": "user_123",
  "action": "project_created",
  "project_id": "proj_456",
  "project_name": "새 프로젝트"
}
```

### MCP 서버 이벤트 로그

```json
{
  "timestamp": "2025-06-26T12:48:38Z",
  "level": "INFO",
  "logger": "mcp_orch.services.mcp_connection",
  "message": "MCP server event: connection_established",
  "mcp_server": "file-server",
  "event": "connection_established",
  "project_id": "proj_123"
}
```

### API 요청 로그

```json
{
  "timestamp": "2025-06-26T12:48:39Z",
  "level": "INFO",
  "logger": "mcp_orch.api.middleware",
  "message": "POST /api/projects",
  "method": "POST",
  "path": "/api/projects",
  "user_id": "user_123",
  "status_code": 201,
  "api_request": true
}
```

## 컨텍스트 로깅

특정 범위에서 컨텍스트 정보를 자동으로 추가할 수 있습니다:

```python
from mcp_orch.utils.logging import LogContext, get_logger

logger = get_logger(__name__)

# 컨텍스트 매니저 사용
with LogContext(user_id="user_123", project_id="proj_456"):
    logger.info("프로젝트 작업 시작")
    logger.warning("권한 확인 필요")
    logger.info("프로젝트 작업 완료")
```

JSON 출력:
```json
{
  "timestamp": "2025-06-26T12:48:40Z",
  "level": "INFO",
  "logger": "mcp_orch.api.projects",
  "message": "프로젝트 작업 시작",
  "user_id": "user_123",
  "project_id": "proj_456"
}
```

## 파일 로깅

### 파일만 출력

```env
LOG_OUTPUT=file
LOG_FILE_PATH=/var/log/mcp-orch/app.log
```

### 콘솔과 파일 모두 출력

```env
LOG_OUTPUT=both
LOG_FILE_PATH=/var/log/mcp-orch/app.log
```

### 로그 파일 로테이션

운영 환경에서는 로그 파일 로테이션을 설정하는 것을 권장합니다:

```bash
# logrotate 설정 예시 (/etc/logrotate.d/mcp-orch)
/var/log/mcp-orch/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    create 0644 mcp-orch mcp-orch
    postrotate
        systemctl reload mcp-orch || true
    endscript
}
```

## 모니터링 도구 연동

### ELK Stack (Elasticsearch + Logstash + Kibana)

JSON 로그는 ELK Stack과 완벽하게 호환됩니다:

```yaml
# logstash.conf
input {
  file {
    path => "/var/log/mcp-orch/app.log"
    start_position => "beginning"
    codec => "json"
  }
}

filter {
  date {
    match => [ "timestamp", "ISO8601" ]
  }
}

output {
  elasticsearch {
    hosts => ["localhost:9200"]
    index => "mcp-orch-%{+YYYY.MM.dd}"
  }
}
```

### Grafana Loki

Loki를 사용한 로그 수집:

```yaml
# promtail.yml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: mcp-orch
    static_configs:
      - targets:
          - localhost
        labels:
          job: mcp-orch
          __path__: /var/log/mcp-orch/*.log
```

### 기본 모니터링 쿼리 예시

#### 에러 로그 모니터링
```
level="ERROR"
```

#### 사용자별 활동 추적
```
user_id="user_123"
```

#### MCP 서버 연결 문제
```
mcp_server!="" AND (event="connection_failed" OR level="ERROR")
```

#### API 응답시간 모니터링
```
api_request=true AND status_code>=400
```

## 개발 팁

### 1. 개발 환경에서 디버그 모드 활성화

```env
LOG_LEVEL=DEBUG
LOG_FORMAT=text
```

### 2. 특정 모듈의 로그 레벨 조정

```python
import logging

# 특정 모듈의 로그 레벨 조정
logging.getLogger("mcp_orch.services.mcp_connection").setLevel(logging.DEBUG)
```

### 3. 로그에서 민감한 정보 제외

```python
# 비밀번호나 토큰은 로그에 포함하지 않음
logger.info(f"사용자 인증 성공: {user_email}")
# logger.info(f"토큰: {auth_token}")  # 이렇게 하지 마세요!
```

### 4. 성능에 민감한 경우

```python
# 로그 레벨 체크로 성능 최적화
if logger.isEnabledFor(logging.DEBUG):
    expensive_debug_info = calculate_expensive_debug_info()
    logger.debug(f"디버그 정보: {expensive_debug_info}")
```

이 로깅 시스템을 통해 개발과 운영 모두에서 효과적인 애플리케이션 모니터링이 가능합니다.