# MCP Orch

**MCP Proxy 호환 서버** - 여러 MCP 서버를 하나의 포트에서 SSE로 제공

## 개요

MCP Orch는 여러 MCP 서버를 통합하여 Cline 등의 MCP 클라이언트에서 사용할 수 있도록 하는 프록시 서버입니다. mcp-proxy와 완전히 호환되며, MCP Python SDK의 표준 컴포넌트를 사용합니다.

## 주요 특징

- **mcp-proxy 완전 호환**: 기존 mcp-proxy와 동일한 URL 구조 및 프로토콜
- **여러 서버 통합**: 단일 포트에서 여러 MCP 서버를 독립적으로 제공
- **Cline 완벽 지원**: SSE 트랜스포트를 통한 실시간 통신
- **간단한 설정**: JSON 설정 파일로 쉬운 서버 관리

## 설치

```bash
# 저장소 클론
git clone <repository-url>
cd mcp-orch

# 의존성 설치
uv sync
```

## 빠른 시작

### 1. 설정 파일 생성

```bash
uv run mcp-orch init
```

### 2. MCP 서버 설정

`mcp-config.json` 파일을 편집하여 사용할 MCP 서버들을 추가합니다:

```json
{
  "mcpServers": {
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "your-api-key"
      }
    },
    "excel-mcp-server": {
      "command": "npx",
      "args": ["-y", "@smithery/cli@latest", "run", "@negokaz/excel-mcp-server", "--key", "your-key"]
    }
  }
}
```

### 3. 서버 실행

```bash
uv run mcp-orch serve
```

기본적으로 `http://localhost:8000`에서 실행됩니다.

## 사용법

### 서버 실행

```bash
# 기본 실행 (포트 8000)
uv run mcp-orch serve

# 포트 지정
uv run mcp-orch serve --port 3000

# 호스트 지정
uv run mcp-orch serve --host 127.0.0.1 --port 8080

# 로그 레벨 설정
uv run mcp-orch serve --log-level DEBUG
```

### 도구 및 서버 확인

```bash
# 설정된 서버 목록 확인
uv run mcp-orch list-servers

# 사용 가능한 도구 목록 확인
uv run mcp-orch list-tools
```

## Cline 설정

서버가 실행되면 다음 엔드포인트들이 제공됩니다:

- **brave-search**: `http://localhost:8000/servers/brave-search/sse`
- **excel-mcp-server**: `http://localhost:8000/servers/excel-mcp-server/sse`

Cline의 `cline_mcp_settings.json`에 다음과 같이 설정합니다:

```json
{
  "brave-proxy": {
    "disabled": false,
    "timeout": 30,
    "url": "http://localhost:8000/servers/brave-search/sse",
    "transportType": "sse"
  },
  "excel-proxy": {
    "disabled": false,
    "timeout": 30,
    "url": "http://localhost:8000/servers/excel-mcp-server/sse",
    "transportType": "sse"
  }
}
```

## 설정 파일 형식

`mcp-config.json` 파일은 다음 형식을 따릅니다:

```json
{
  "mcpServers": {
    "server-name": {
      "command": "command-to-run",
      "args": ["arg1", "arg2"],
      "env": {
        "ENV_VAR": "value"
      },
      "disabled": false,
      "timeout": 30
    }
  }
}
```

### 설정 옵션

- `command`: 실행할 명령어 (필수)
- `args`: 명령어 인수 배열 (선택)
- `env`: 환경 변수 (선택)
- `disabled`: 서버 비활성화 (선택, 기본값: false)
- `timeout`: 연결 타임아웃 초 (선택, 기본값: 30)

## 아키텍처

```
┌─────────────┐    SSE     ┌─────────────┐    stdio    ┌─────────────┐
│    Cline    │ ◄────────► │  MCP Orch   │ ◄─────────► │ MCP Servers │
└─────────────┘            └─────────────┘             └─────────────┘
                                 │
                           ┌─────┴─────┐
                           │ Registry  │
                           │ Adapter   │
                           │ Handler   │
                           └───────────┘
```

## 개발

### 프로젝트 구조

```
mcp-orch/
├── src/mcp_orch/
│   ├── api/                 # API 서버 (mcp_proxy_mode.py)
│   ├── core/               # 핵심 컴포넌트 (registry, adapter, controller)
│   ├── proxy/              # 프록시 핸들러
│   ├── cli.py              # CLI 인터페이스
│   └── config.py           # 설정 관리
├── docs/                   # 문서
├── tests/                  # 테스트 파일들
└── mcp-config.json         # MCP 서버 설정
```

### 테스트

```bash
# 서버 연결 테스트
uv run python test_mcp_connection.py

# 도구 호출 테스트
uv run python test_mcp_proxy_mode.py
```

## 문제 해결

### 일반적인 문제

1. **서버 연결 실패**
   - MCP 서버 명령어가 올바른지 확인
   - 필요한 환경 변수가 설정되었는지 확인
   - `uv run mcp-orch list-servers`로 상태 확인

2. **Cline에서 인식 안됨**
   - URL이 정확한지 확인 (`/servers/{server-name}/sse`)
   - 서버가 실행 중인지 확인
   - CORS 설정 확인

3. **도구 호출 실패**
   - `uv run mcp-orch list-tools`로 도구 목록 확인
   - 로그 레벨을 DEBUG로 설정하여 상세 로그 확인

## Docker 배포

### 환경변수 설정

1. **환경변수 파일 생성**
   ```bash
   # .env.example을 복사하여 .env 생성
   cp .env.example .env
   
   # 필요한 값들 수정
   vi .env
   ```

2. **주요 환경변수**
   ```bash
   # 보안 (프로덕션에서는 반드시 변경)
   AUTH_SECRET=your-strong-secret-key
   
   # 데이터베이스
   DB_PASSWORD=your-db-password
   
   # 관리자 계정
   INITIAL_ADMIN_EMAIL=admin@yourdomain.com
   INITIAL_ADMIN_PASSWORD=your-admin-password
   
   # API URL (프로덕션 배포 시)
   NEXT_PUBLIC_MCP_API_URL_DOCKER=https://api.yourdomain.com
   ```

### Docker Compose 실행

```bash
# 전체 스택 실행 (PostgreSQL + Backend + Frontend)
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 서비스 중지
docker-compose down
```

### 접속 정보

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **PostgreSQL**: localhost:5432

### 구조

현재 구조는 로컬 개발과 Docker 배포를 모두 지원합니다:

- **로컬 개발**: `web/.env.local`과 루트 `.env` 각각 사용
- **Docker 배포**: 루트 `.env` 하나로 모든 환경변수 관리

## 라이선스

MIT License

## 기여

이슈 리포트와 풀 리퀘스트를 환영합니다!
