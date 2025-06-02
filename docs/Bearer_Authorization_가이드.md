# Bearer Authorization 가이드

MCP Orchestrator는 간단한 Bearer 토큰 기반 인증을 지원합니다. 이 가이드는 API 인증을 설정하고 사용하는 방법을 설명합니다.

## 개요

Bearer Authorization은 HTTP 헤더를 통해 토큰을 전달하여 API 접근을 제어하는 간단한 인증 방식입니다. MCP Orchestrator에서는 환경 변수로 토큰을 설정하고, 클라이언트에서 동일한 토큰을 사용하여 인증합니다.

## 백엔드 설정

### 1. 환경 변수 설정

`.env` 파일에서 API 토큰을 설정합니다:

```bash
# Bearer 인증 토큰 (설정하지 않으면 인증이 비활성화됩니다)
MCP_ORCH_API_TOKEN=your-secret-token-here
```

또는 쉘에서 직접 설정:

```bash
export MCP_ORCH_API_TOKEN="your-secret-token-here"
```

### 2. 서버 시작

토큰이 설정된 상태에서 서버를 시작합니다:

```bash
# MCP Proxy 모드
mcp-orch proxy

# 또는 Python으로 직접 실행
python -m mcp_orch.cli proxy
```

### 3. 인증 동작

- 토큰이 설정되면 모든 API 엔드포인트에 인증이 적용됩니다
- 다음 엔드포인트는 인증 없이 접근 가능합니다:
  - `/status` - 서버 상태 확인
  - `/docs` - API 문서
  - `/servers/*/sse` - MCP 클라이언트용 SSE 엔드포인트

## 프론트엔드 설정

### 1. Configuration 페이지에서 토큰 설정

1. 웹 UI의 Configuration 페이지(`/config`)로 이동
2. "API Authentication" 섹션에서 토큰 입력
3. "Save Token" 버튼 클릭

### 2. 프로그래밍 방식으로 토큰 설정

```javascript
import { api } from '@/lib/api';

// 토큰 설정
api.setApiToken('your-secret-token-here');

// 토큰 확인
const token = api.getApiToken();

// 토큰 제거
api.setApiToken(null);
```

## API 사용 예시

### cURL을 사용한 API 호출

```bash
# 인증 없이 (실패)
curl http://localhost:8000/servers
# 401 Unauthorized

# Bearer 토큰과 함께
curl -H "Authorization: Bearer your-secret-token-here" \
     http://localhost:8000/servers
# 성공
```

### JavaScript/TypeScript

```javascript
// fetch API 사용
const response = await fetch('http://localhost:8000/servers', {
  headers: {
    'Authorization': 'Bearer your-secret-token-here',
    'Content-Type': 'application/json'
  }
});

// MCP Orch API 클라이언트 사용 (자동으로 토큰 포함)
import { api } from '@/lib/api';
const servers = await api.getServers();
```

### Python

```python
import requests

# Bearer 토큰과 함께 요청
headers = {
    'Authorization': 'Bearer your-secret-token-here',
    'Content-Type': 'application/json'
}

response = requests.get('http://localhost:8000/servers', headers=headers)
```

## 보안 고려사항

### 1. 토큰 관리

- **강력한 토큰 사용**: 최소 32자 이상의 무작위 문자열 사용
- **토큰 노출 방지**: 
  - 코드에 하드코딩하지 않기
  - 버전 관리 시스템에 커밋하지 않기
  - 환경 변수나 시크릿 관리 도구 사용

### 2. HTTPS 사용

프로덕션 환경에서는 반드시 HTTPS를 사용하여 토큰이 네트워크에서 노출되지 않도록 합니다:

```bash
# Nginx 리버스 프록시 예시
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Authorization $http_authorization;
    }
}
```

### 3. 토큰 로테이션

정기적으로 토큰을 변경하여 보안을 강화합니다:

```bash
# 새 토큰 생성 (Linux/macOS)
openssl rand -hex 32

# 환경 변수 업데이트
export MCP_ORCH_API_TOKEN="new-token-here"

# 서버 재시작
# 클라이언트 토큰 업데이트
```

## 문제 해결

### 401 Unauthorized 오류

1. 토큰이 올바르게 설정되었는지 확인:
   ```bash
   echo $MCP_ORCH_API_TOKEN
   ```

2. 클라이언트에서 동일한 토큰을 사용하는지 확인

3. Authorization 헤더 형식 확인:
   ```
   Authorization: Bearer <token>
   ```

### 토큰이 저장되지 않음

1. 브라우저의 localStorage 확인:
   ```javascript
   localStorage.getItem('mcp_orch_api_token')
   ```

2. 브라우저 개발자 도구에서 네트워크 탭 확인

## 향후 확장 계획

현재의 간단한 Bearer 토큰 인증은 다음과 같이 확장될 예정입니다:

1. **사용자 시스템**
   - 사용자 등록/로그인
   - 사용자별 API KEY 발급
   - 권한 관리 (읽기/쓰기/관리자)

2. **JWT 토큰**
   - 토큰 만료 시간
   - 리프레시 토큰
   - 클레임 기반 권한 관리

3. **OAuth2/OIDC**
   - 외부 인증 제공자 연동
   - SSO (Single Sign-On) 지원

## 참고 자료

- [MDN - HTTP Authentication](https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication)
- [RFC 6750 - OAuth 2.0 Bearer Token](https://tools.ietf.org/html/rfc6750)
- [OWASP - Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
