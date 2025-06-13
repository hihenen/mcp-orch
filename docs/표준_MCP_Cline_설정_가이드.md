# 표준 MCP 프로토콜 Cline 설정 가이드

## 🎯 개요

MCP-orch는 이제 **표준 MCP 프로토콜**을 완전히 지원합니다. Cline에서 `type: "sse"` 방식으로 직접 연결할 수 있습니다.

## ✅ 지원되는 연결 방식

### 1. 표준 SSE 방식 (권장)
```json
{
  "mcpServers": {
    "brave-search": {
      "disabled": false,
      "timeout": 30,
      "type": "sse",
      "url": "http://localhost:8000/projects/c41aa472-15c3-4336-bcf8-21b464253d62/servers/brave-search/sse",
      "headers": {
        "Authorization": "Bearer project_7xXZb_tq_QreIJ3CB2wvWRpklyOmsGSGy1BeByTYe2I"
      }
    }
  }
}
```

### 2. 프로젝트별 다중 서버 설정
```json
{
  "mcpServers": {
    "project-brave-search": {
      "type": "sse",
      "url": "http://localhost:8000/projects/c41aa472-15c3-4336-bcf8-21b464253d62/servers/brave-search/sse",
      "headers": {
        "Authorization": "Bearer project_7xXZb_tq_QreIJ3CB2wvWRpklyOmsGSGy1BeByTYe2I"
      },
      "timeout": 30
    },
    "project-github": {
      "type": "sse", 
      "url": "http://localhost:8000/projects/c41aa472-15c3-4336-bcf8-21b464253d62/servers/github/sse",
      "headers": {
        "Authorization": "Bearer project_7xXZb_tq_QreIJ3CB2wvWRpklyOmsGSGy1BeByTYe2I"
      },
      "timeout": 30
    }
  }
}
```

## 🔧 설정 단계

### 1단계: MCP-orch 서버 시작
```bash
cd mcp-orch
python run_server.py
```

### 2단계: 프로젝트 ID 및 API 키 확인
- 웹 대시보드에서 프로젝트 설정 확인: `http://localhost:8000`
- API 키 생성 또는 기존 키 확인

### 3단계: Cline MCP 설정 파일 수정
Cline 설정 파일 위치:
- **macOS**: `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
- **Windows**: `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`
- **Linux**: `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

### 4단계: 설정 파일 업데이트
```json
{
  "mcpServers": {
    "mcp-orch-brave-search": {
      "type": "sse",
      "url": "http://localhost:8000/projects/{PROJECT_ID}/servers/{SERVER_NAME}/sse",
      "headers": {
        "Authorization": "Bearer {API_KEY}"
      },
      "timeout": 30,
      "disabled": false
    }
  }
}
```

## 📋 URL 패턴

### 표준 엔드포인트 구조
```
# SSE 연결
GET http://localhost:8000/projects/{project_id}/servers/{server_name}/sse

# 메시지 전송 (자동 처리됨)
POST http://localhost:8000/messages/?session_id={session_id}
```

### 실제 예시
```
# Brave Search 서버
http://localhost:8000/projects/c41aa472-15c3-4336-bcf8-21b464253d62/servers/brave-search/sse

# GitHub 서버  
http://localhost:8000/projects/c41aa472-15c3-4336-bcf8-21b464253d62/servers/github/sse
```

## 🔐 인증 방식

### API 키 형식
```
Bearer project_7xXZb_tq_QreIJ3CB2wvWRpklyOmsGSGy1BeByTYe2I
```

### 인증 헤더
```json
{
  "headers": {
    "Authorization": "Bearer {API_KEY}",
    "Accept": "text/event-stream",
    "Cache-Control": "no-cache"
  }
}
```

## 🧪 연결 테스트

### 1. 헬스체크
```bash
curl http://localhost:8000/health
```

### 2. SSE 연결 테스트
```bash
curl -H "Authorization: Bearer project_7xXZb_tq_QreIJ3CB2wvWRpklyOmsGSGy1BeByTYe2I" \
     -H "Accept: text/event-stream" \
     http://localhost:8000/projects/c41aa472-15c3-4336-bcf8-21b464253d62/servers/brave-search/sse
```

### 3. 자동 테스트 스크립트
```bash
cd mcp-orch
python test_standard_mcp.py
```

## 🎛️ 고급 설정

### 타임아웃 설정
```json
{
  "timeout": 30,  // 30초 타임아웃
  "disabled": false,
  "autoApprove": []
}
```

### 프로젝트별 환경 변수
```json
{
  "env": {
    "PROJECT_ID": "c41aa472-15c3-4336-bcf8-21b464253d62",
    "SERVER_NAME": "brave-search",
    "MCP_ORCH_URL": "http://localhost:8000"
  }
}
```

## 🔍 문제 해결

### 연결 실패 시 확인사항
1. **MCP-orch 서버 상태**: `http://localhost:8000/health`
2. **API 키 유효성**: 웹 대시보드에서 확인
3. **프로젝트 ID**: URL에 올바른 프로젝트 ID 사용
4. **서버 이름**: 프로젝트에 등록된 정확한 서버 이름

### 로그 확인
```bash
# MCP-orch 서버 로그
tail -f mcp-orch/logs/server.log

# Cline 로그 (VS Code 개발자 도구)
```

### 일반적인 오류
- **401 Unauthorized**: API 키 확인
- **404 Not Found**: 프로젝트 ID 또는 서버 이름 확인
- **Connection Timeout**: 네트워크 및 서버 상태 확인

## 🚀 완전한 설정 예시

```json
{
  "mcpServers": {
    "mcp-orch-brave-search": {
      "type": "sse",
      "url": "http://localhost:8000/projects/c41aa472-15c3-4336-bcf8-21b464253d62/servers/brave-search/sse",
      "headers": {
        "Authorization": "Bearer project_7xXZb_tq_QreIJ3CB2wvWRpklyOmsGSGy1BeByTYe2I"
      },
      "timeout": 30,
      "disabled": false,
      "autoApprove": []
    },
    "mcp-orch-github": {
      "type": "sse",
      "url": "http://localhost:8000/projects/c41aa472-15c3-4336-bcf8-21b464253d62/servers/github/sse", 
      "headers": {
        "Authorization": "Bearer project_7xXZb_tq_QreIJ3CB2wvWRpklyOmsGSGy1BeByTYe2I"
      },
      "timeout": 30,
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

## 📚 추가 리소스

- [MCP 프로토콜 문서](https://modelcontextprotocol.io/)
- [Cline MCP 설정 가이드](https://docs.cline.bot/mcp)
- [MCP-orch 웹 대시보드](http://localhost:8000)

## ✨ 주요 장점

1. **표준 호환성**: 완전한 MCP 프로토콜 준수
2. **간단한 설정**: URL과 API 키만으로 연결
3. **프로젝트 격리**: 프로젝트별 독립적인 MCP 서버 환경
4. **실시간 통신**: SSE 기반 실시간 도구 실행
5. **확장성**: 여러 프로젝트와 서버 동시 지원

이제 Cline에서 MCP-orch를 표준 MCP 서버로 사용할 수 있습니다! 🎉
