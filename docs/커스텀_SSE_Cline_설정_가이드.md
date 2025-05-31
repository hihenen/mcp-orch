# MCP Orch 커스텀 SSE 모드 Cline 설정 가이드

## 개요

커스텀 SSE 모드는 단일 포트에서 여러 MCP 서버를 지원합니다.

## 1. 서버 실행

```bash
cd mcp-orch
uv run mcp-orch serve --mode proxy --port 8000
```

## 2. Cline 설정

### 설정 파일 위치
- macOS: `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
- VS Code Insiders: `~/Library/Application Support/Code - Insiders/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

### 설정 예시

```json
{
  "mcpServers": {
    "brave-proxy": {
      "disabled": false,
      "timeout": 30,
      "url": "http://localhost:8000/sse/brave-search",
      "transportType": "sse"
    },
    "excel-proxy": {
      "disabled": false,
      "timeout": 300,
      "url": "http://localhost:8000/sse/excel-mcp-server",
      "transportType": "sse"
    }
  }
}
```

## 3. URL 구조

- SSE 엔드포인트: `http://localhost:8000/sse/{server_name}`
- 메시지 엔드포인트: `http://localhost:8000/messages/{server_name}/`

## 4. 연결 확인

### 테스트 스크립트
```bash
cd mcp-orch
uv run python test_custom_sse_debug.py
```

### 정상 동작 확인 사항
- 초기화 메시지 수신
- 도구 목록 수신
- ping 메시지로 연결 유지

## 5. 문제 해결

### Cline에서 연결이 안 될 때

1. **서버 로그 확인**
   ```bash
   uv run mcp-orch serve --mode proxy --port 8000 --log-level DEBUG
   ```

2. **URL 확인**
   - 포트 번호가 맞는지 확인 (8000)
   - 서버 이름이 mcp-config.json에 있는지 확인

3. **Cline 재시작**
   - VS Code 재시작
   - 또는 Cline 확장 프로그램 다시 로드

4. **방화벽/프록시 확인**
   - localhost:8000 접근이 차단되지 않았는지 확인

## 6. 장점

- **다중 서버 지원**: 단일 포트에서 여러 MCP 서버 동시 사용
- **유연한 구성**: 서버 추가/제거가 쉬움
- **통합 관리**: 모든 MCP 서버를 하나의 프로세스로 관리

## 7. 주의사항

- 커스텀 구현이므로 MCP SDK 업데이트 시 호환성 확인 필요
- 표준 SSE 모드보다 복잡한 구현
