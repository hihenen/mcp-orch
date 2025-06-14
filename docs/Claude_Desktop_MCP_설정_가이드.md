# Claude Desktop MCP 설정 가이드

## 🎯 개요

mcp-orch에서 구현한 Brave Search MCP 서버를 Claude Desktop에 연결하는 방법을 안내합니다. 449a99f 개선사항이 적용된 안정적인 MCP 통신을 활용할 수 있습니다.

## 📋 현재 상황 확인

### 1. mcp-orch 서버 상태
```bash
# 서버 실행 확인
uv run python run_server.py

# 브라우저에서 확인
http://localhost:8000/health
```

### 2. 현재 구성된 MCP 서버
```bash
# Brave Search 서버 테스트
uv run python debug_brave_search.py
```

현재 구성:
- **서버 이름**: brave-search
- **프로젝트 ID**: c41aa472-15c3-4336-bcf8-21b464253d62
- **도구**: brave_web_search, brave_local_search
- **상태**: ✅ Online

## 🔧 Claude Desktop 설정 방법

### 옵션 1: 표준 MCP SSE 연결 (권장)

Claude Desktop 설정 파일 위치:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mcp-orch-brave-search": {
      "command": "curl",
      "args": [
        "-H", "Accept: text/event-stream",
        "-H", "Authorization: Bearer project_7xXZb_tq_QreIJ3CB2wvWRpklyOmsGSGy1BeByTYe2I",
        "-N",
        "http://localhost:8000/projects/c41aa472-15c3-4336-bcf8-21b464253d62/servers/brave-search/sse"
      ],
      "env": {
        "BRAVE_API_KEY": "BSAiFio-6UgIYNeno28H-8iPw_J-7iC"
      }
    }
  }
}
```

### 옵션 2: 직접 MCP 서버 연결

```json
{
  "mcpServers": {
    "brave-search-direct": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "BSAiFio-6UgIYNeno28H-8iPw_J-7iC"
      }
    }
  }
}
```

### 옵션 3: mcp-orch 프록시 모드

```json
{
  "mcpServers": {
    "mcp-orch-proxy": {
      "command": "uv",
      "args": [
        "--directory", "/Users/yun/work/ai/mcp/mcp-orch",
        "run", "python", "-m", "mcp_orch.cli",
        "--mode", "proxy",
        "--config", "mcp-config.json"
      ]
    }
  }
}
```

## 🚀 설정 단계별 가이드

### 1단계: mcp-orch 서버 시작
```bash
cd /Users/yun/work/ai/mcp/mcp-orch
uv run python run_server.py
```

### 2단계: API 키 확인
웹 대시보드에서 API 키 확인: http://localhost:8000

현재 사용 가능한 API 키: `project_7xXZb_tq_QreIJ3CB2wvWRpklyOmsGSGy1BeByTYe2I`

### 3단계: Claude Desktop 설정 파일 생성/수정

#### macOS 사용자:
```bash
# 디렉토리 생성 (없는 경우)
mkdir -p "~/Library/Application Support/Claude"

# 설정 파일 편집
nano "~/Library/Application Support/Claude/claude_desktop_config.json"
```

#### 추천 설정 (옵션 2 - 직접 연결):
```json
{
  "mcpServers": {
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "BSAiFio-6UgIYNeno28H-8iPw_J-7iC"
      }
    }
  }
}
```

### 4단계: Claude Desktop 재시작

## 🧪 연결 테스트

### 1. MCP 서버 상태 확인
```bash
# 직접 테스트
uv run python test_brave_tool_call.py
```

### 2. Claude Desktop에서 확인
Claude Desktop을 열고 새 대화를 시작한 후:
```
"Python programming"에 대해 웹 검색해줘
```

### 3. 도구 사용 확인
Claude가 brave_web_search 도구를 인식하고 사용하는지 확인

## 🔍 문제 해결

### 일반적인 문제들

#### 1. "No MCP servers configured" 오류
- 설정 파일 경로 확인
- JSON 형식 검증
- Claude Desktop 재시작

#### 2. 연결 타임아웃
```bash
# mcp-orch 서버 상태 확인
curl http://localhost:8000/health

# MCP 서버 직접 테스트
npx -y @modelcontextprotocol/server-brave-search
```

#### 3. 환경변수 문제
```bash
# BRAVE_API_KEY 확인
echo $BRAVE_API_KEY

# 수동으로 설정
export BRAVE_API_KEY="BSAiFio-6UgIYNeno28H-8iPw_J-7iC"
```

### 로그 확인 방법

#### Claude Desktop 로그:
- **macOS**: `~/Library/Logs/Claude/`
- **Windows**: `%LOCALAPPDATA%\Claude\logs\`

#### mcp-orch 로그:
```bash
tail -f /Users/yun/work/ai/mcp/mcp-orch/backend.log
```

## 📊 현재 사용 가능한 도구들

### brave_web_search
- **설명**: Brave Search API를 사용한 웹 검색
- **파라미터**: 
  - `query` (필수): 검색 쿼리
  - `count` (선택): 결과 개수 (기본값: 10)
  - `offset` (선택): 시작 위치 (기본값: 0)

### brave_local_search  
- **설명**: Brave Local Search API를 사용한 지역 검색
- **파라미터**:
  - `query` (필수): 지역 검색 쿼리
  - `count` (선택): 결과 개수 (기본값: 5)

## 🎉 성공 확인

설정이 완료되면 Claude Desktop에서:

1. **도구 인식**: 새 대화에서 검색 관련 요청 시 MCP 도구 사용
2. **실시간 검색**: brave_web_search를 통한 최신 정보 검색 가능
3. **지역 검색**: brave_local_search를 통한 위치 기반 검색 가능

## 🔗 추가 리소스

- [Claude Desktop MCP 공식 문서](https://claude.ai/docs/mcp)
- [MCP 프로토콜 사양](https://modelcontextprotocol.io/)
- [mcp-orch 웹 대시보드](http://localhost:8000)

## ✨ 449a99f 개선사항의 혜택

1. **안정적인 npx 실행**: PATH 환경변수 상속으로 npx 명령어 정상 작동
2. **DB 기반 관리**: 설정 파일 없이도 완전한 서버 관리
3. **향상된 프로세스 관리**: 더 안정적인 MCP 서버 연결
4. **표준 준수**: 완전한 MCP 프로토콜 호환성

이제 Claude Desktop에서 mcp-orch의 Brave Search 기능을 사용할 수 있습니다! 🚀