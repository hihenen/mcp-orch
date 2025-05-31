# Cline에서 MCP Orch 사용하기

## 개요

MCP Orch는 여러 MCP 서버를 통합 관리하는 프록시 서버입니다. Cline에서는 각 MCP 서버별로 개별 SSE 엔드포인트를 통해 연결할 수 있습니다.

## 설정 방법

### 1. MCP Orch 서버 실행

먼저 MCP Orch 서버를 실행합니다:

```bash
# uv를 사용한 의존성 설치
cd mcp-orch
uv pip install -e .

# 서버 실행
uv run mcp-orch serve --mode proxy --port 8000

# 또는 uvx를 사용한 직접 실행
uvx --from . mcp-orch serve --mode proxy --port 8000
```

### 2. mcp-config.json 설정

MCP Orch가 관리할 MCP 서버들을 설정합니다:

```json
{
  "mcpServers": {
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "your-brave-api-key"
      }
    },
    "notion": {
      "command": "node",
      "args": ["/path/to/notion-server"],
      "env": {
        "NOTION_API_KEY": "your-notion-api-key"
      }
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "your-github-token"
      }
    }
  }
}
```

### 3. Cline 설정

Cline의 MCP 설정에서 각 서버별로 개별 엔드포인트를 설정합니다:

```json
{
  "mcpServers": {
    "brave-search": {
      "transport": "sse",
      "url": "http://localhost:8000/sse/brave-search"
    },
    "notion": {
      "transport": "sse",
      "url": "http://localhost:8000/sse/notion"
    },
    "github": {
      "transport": "sse",
      "url": "http://localhost:8000/sse/github"
    }
  }
}
```

## 엔드포인트 구조

MCP Orch는 다음과 같은 엔드포인트를 제공합니다:

### SSE 엔드포인트 (Cline 연동용)
- `GET /sse/{server_name}` - 서버별 SSE 연결
- `POST /mcp/{server_name}` - 서버별 JSON-RPC 요청

### REST API 엔드포인트
- `GET /servers` - 등록된 서버 목록
- `GET /tools` - 모든 도구 목록
- `GET /tools/{server_name}` - 특정 서버의 도구 목록
- `POST /tools/{namespace}` - 도구 호출 (namespace: server_name.tool_name)

## 사용 예시

### 1. 서버 목록 확인
```bash
curl http://localhost:8000/servers
```

### 2. 도구 목록 확인
```bash
# 모든 도구
curl http://localhost:8000/tools

# Brave Search 도구만
curl http://localhost:8000/tools/brave-search
```

### 3. 도구 호출
```bash
curl -X POST http://localhost:8000/tools/brave-search.brave_web_search \
  -H "Content-Type: application/json" \
  -d '{
    "arguments": {
      "query": "MCP protocol",
      "count": 3
    }
  }'
```

## 장점

1. **중앙 집중 관리**: 하나의 설정 파일(mcp-config.json)로 모든 MCP 서버 관리
2. **개별 엔드포인트**: 각 서버별로 독립적인 SSE 연결
3. **네임스페이스 분리**: 도구 이름 충돌 방지
4. **동적 관리**: 서버 추가/제거 시 설정 리로드 가능

## 문제 해결

### 연결 오류
- MCP Orch 서버가 실행 중인지 확인
- 포트가 올바른지 확인 (기본: 8000)
- mcp-config.json에 서버가 등록되어 있는지 확인

### 도구 호출 실패
- 서버 이름이 정확한지 확인
- 도구 이름이 정확한지 확인
- 필요한 환경 변수(API 키 등)가 설정되어 있는지 확인

### 로그 확인
```bash
# MCP Orch 로그 확인
uv run mcp-orch serve --mode proxy --log-level debug
