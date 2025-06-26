# Appendix: Datadog APM 및 로그 연동 가이드

> **참고**: 이는 선택적 기능입니다. MCP Orchestrator의 기본 로깅 기능은 [메인 로깅 가이드](../LOGGING.md)를 참조하세요.

이 가이드는 MCP Orchestrator를 Datadog APM(Application Performance Monitoring) 및 로그 수집과 연동하는 방법을 설명합니다.

## 목차

1. [사전 요구사항](#사전-요구사항)
2. [Datadog APM 설정](#datadog-apm-설정)
3. [Datadog 로그 연동](#datadog-로그-연동)
4. [환경변수 설정](#환경변수-설정)
5. [실행 방법](#실행-방법)
6. [모니터링 대시보드](#모니터링-대시보드)
7. [문제 해결](#문제-해결)

## 사전 요구사항

### 1. Datadog 계정 및 API 키

- [Datadog 계정](https://www.datadoghq.com/) 필요
- API 키 발급 (Organization Settings > API Keys)
- App 키 발급 (선택사항, 대시보드 생성용)

### 2. Datadog Agent 설치

#### 로컬 개발 환경 (macOS)

```bash
# Homebrew로 설치
brew install datadog/brew/datadog-agent

# 설정 파일 생성
sudo cp /opt/datadog-agent/etc/datadog.yaml.example /opt/datadog-agent/etc/datadog.yaml

# API 키 설정
sudo nano /opt/datadog-agent/etc/datadog.yaml
# api_key: your-api-key-here

# Agent 시작
sudo /opt/datadog-agent/bin/agent/agent run
```

#### Linux 서버 환경

```bash
# 공식 설치 스크립트 사용
DD_API_KEY=your-api-key-here bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script.sh)"

# 또는 패키지 매니저 사용 (Ubuntu/Debian)
curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script.sh | DD_API_KEY=your-api-key-here bash
```

## Datadog APM 설정

### 1. Python 패키지 설치

MCP Orchestrator는 이미 기본 로깅을 지원하므로, Datadog APM만 추가로 설치합니다:

```bash
# uv 환경에 Datadog APM 추가
cd /path/to/mcp-orch
uv add ddtrace>=2.17.0
```

또는 requirements.txt에 직접 추가:

```txt
# Datadog APM (선택사항)
ddtrace>=2.17.0
```

### 2. 애플리케이션 코드 수정

기존 코드를 최소한으로 수정하여 APM을 활성화합니다:

#### src/mcp_orch/api/app.py 수정

```python
"""
FastAPI 애플리케이션 팩토리
"""

import logging
import os
from contextlib import asynccontextmanager

# Datadog APM 자동 계측 (환경변수로 제어)
if os.getenv("DD_TRACE_ENABLED", "false").lower() == "true":
    import ddtrace.auto

from fastapi import FastAPI
# ... 기존 import들 ...

# 기존 코드 유지
```

#### CLI에서 APM 활성화 (선택사항)

```python
# src/mcp_orch/cli.py 수정 (선택사항)
def serve(...):
    """MCP Orch 서버 실행"""
    # Datadog APM 활성화 (환경변수 기반)
    if os.getenv("DD_TRACE_ENABLED", "false").lower() == "true":
        import ddtrace.auto
    
    # 기존 코드 유지...
```

## Datadog 로그 연동

MCP Orchestrator의 JSON 로깅은 Datadog과 자동으로 호환됩니다.

### 1. 로그 수집 설정

#### Agent 설정 파일 수정

`/opt/datadog-agent/etc/conf.d/python.d/conf.yaml` 생성:

```yaml
logs:
  - type: file
    path: /var/log/mcp-orch/app.log
    service: mcp-orch
    source: python
    sourcecategory: sourcecode
    tags:
      - env:production
      - component:mcp-orchestrator
```

#### 로그 JSON 파싱 설정

`/opt/datadog-agent/etc/conf.d/python.d/conf.yaml`에 추가:

```yaml
logs:
  - type: file
    path: /var/log/mcp-orch/app.log
    service: mcp-orch
    source: python
    sourcecategory: sourcecode
    tags:
      - env:production
      - component:mcp-orchestrator
    log_processing_rules:
      - type: multi_line
        name: json_logs
        pattern: ^\{
      - type: exclude_at_match
        name: exclude_debug
        pattern: '"level":"DEBUG"'
```

## 환경변수 설정

### 개발 환경 (.env.local)

```env
# Datadog APM 설정 (개발용 - 비활성화)
DD_TRACE_ENABLED=false
DD_SERVICE=mcp-orch
DD_ENV=development
DD_VERSION=1.0.0

# 로깅 설정 (JSON 포맷)
LOG_LEVEL=DEBUG
LOG_FORMAT=json
LOG_OUTPUT=console
```

### 운영 환경 (.env.production)

```env
# Datadog APM 설정 (운영용 - 활성화)
DD_TRACE_ENABLED=true
DD_SERVICE=mcp-orch
DD_ENV=production
DD_VERSION=1.0.0
DD_TRACE_SAMPLE_RATE=1.0
DD_LOGS_INJECTION=true
DD_TRACE_STARTUP_LOGS=true

# 로깅 설정 (JSON 포맷 + 파일)
LOG_LEVEL=INFO
LOG_FORMAT=json
LOG_OUTPUT=both
LOG_FILE_PATH=/var/log/mcp-orch/app.log

# Datadog Agent 연결
DD_AGENT_HOST=localhost
DD_TRACE_AGENT_PORT=8126
```

### Docker 환경

Docker로 Datadog Agent를 실행하는 경우:

```yaml
# docker-compose.datadog.yml (선택사항)
version: '3.8'
services:
  datadog-agent:
    image: gcr.io/datadoghq/agent:7
    environment:
      - DD_API_KEY=${DD_API_KEY}
      - DD_SITE=datadoghq.com
      - DD_APM_ENABLED=true
      - DD_LOGS_ENABLED=true
      - DD_LOGS_CONFIG_CONTAINER_COLLECT_ALL=true
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /proc/:/host/proc/:ro
      - /sys/fs/cgroup/:/host/sys/fs/cgroup:ro
      - /var/log/mcp-orch:/var/log/mcp-orch:ro
    ports:
      - "8126:8126"  # APM
      - "8125:8125/udp"  # DogStatsD
```

## 실행 방법

### 1. 기본 실행 (APM 비활성화)

```bash
# 기본 설정으로 실행 (Datadog 없이)
uv run mcp-orch serve
```

### 2. APM 활성화하여 실행

```bash
# 환경변수로 APM 활성화
DD_TRACE_ENABLED=true DD_SERVICE=mcp-orch uv run mcp-orch serve

# 또는 .env 파일 설정 후
uv run mcp-orch serve
```

### 3. ddtrace-run 사용 (대안)

```bash
# ddtrace-run으로 실행 (더 강력한 자동 계측)
DD_SERVICE=mcp-orch uv run ddtrace-run mcp-orch serve
```

## 모니터링 대시보드

### APM 메트릭

Datadog APM 대시보드에서 다음 메트릭을 모니터링할 수 있습니다:

- **요청 처리량**: `/api/projects`, `/api/teams` 등의 엔드포인트별 요청 수
- **응답 시간**: P50, P95, P99 퍼센타일
- **에러율**: HTTP 4xx, 5xx 응답 비율
- **데이터베이스 쿼리**: SQLAlchemy 쿼리 성능
- **MCP 서버 연결**: 외부 MCP 서버 연결 시간

### 로그 분석

Datadog Logs에서 다음과 같은 쿼리를 사용할 수 있습니다:

```
# 에러 로그 필터
service:mcp-orch level:ERROR

# 사용자별 활동
service:mcp-orch @user_id:user_123

# API 응답시간 분석
service:mcp-orch @api_request:true @status_code:>=400

# MCP 서버 연결 문제
service:mcp-orch @mcp_server:* (@event:connection_failed OR level:ERROR)
```

### 알림 설정

#### APM 알림

```yaml
# 응답시간 임계값 초과
metric: trace.fastapi.request.duration
threshold: 5000ms  # 5초
condition: avg last 5m

# 에러율 임계값 초과
metric: trace.fastapi.request.errors
threshold: 5%
condition: avg last 5m
```

#### 로그 기반 알림

```yaml
# 에러 로그 급증
query: service:mcp-orch level:ERROR
threshold: 10 errors in 5 minutes

# MCP 서버 연결 실패
query: service:mcp-orch @event:connection_failed
threshold: 3 failures in 2 minutes
```

## 문제 해결

### 1. APM 트레이스가 표시되지 않는 경우

```bash
# Agent 상태 확인
sudo datadog-agent status

# APM 서비스 확인
curl http://localhost:8126/info

# 환경변수 확인
echo $DD_TRACE_ENABLED
echo $DD_SERVICE
```

### 2. 로그가 수집되지 않는 경우

```bash
# 로그 파일 권한 확인
ls -la /var/log/mcp-orch/

# Agent 로그 확인
sudo tail -f /var/log/datadog/agent.log

# 로그 설정 확인
sudo datadog-agent configcheck
```

### 3. 성능 영향 최소화

```env
# 샘플링 비율 조정 (10% 샘플링)
DD_TRACE_SAMPLE_RATE=0.1

# 특정 서비스만 추적
DD_SERVICE_MAPPING=sqlalchemy:postgres,httpx:external-api

# 디버그 로그 제외
LOG_LEVEL=INFO
```

### 4. 개발 환경에서 APM 비활성화

```env
# 개발 환경에서는 APM 비활성화
DD_TRACE_ENABLED=false
LOG_FORMAT=text
LOG_OUTPUT=console
```

## 비용 최적화

### 1. 로그 필터링

불필요한 로그를 제외하여 비용을 절약합니다:

```yaml
# Agent 설정에서 디버그 로그 제외
log_processing_rules:
  - type: exclude_at_match
    name: exclude_debug
    pattern: '"level":"DEBUG"'
  - type: exclude_at_match
    name: exclude_health_checks
    pattern: '"path":"/health"'
```

### 2. 메트릭 샘플링

```env
# APM 샘플링 비율 조정
DD_TRACE_SAMPLE_RATE=0.1  # 10% 샘플링

# 로그 샘플링
DD_LOGS_CONFIG_PROCESSING_RULES='[{"type": "sampling", "name": "sample_info", "pattern": "INFO", "sampling_rate": 0.1}]'
```

이 가이드를 통해 MCP Orchestrator를 Datadog과 연동하여 프로덕션 환경에서 포괄적인 모니터링을 구현할 수 있습니다.