# MCP Orch

하이브리드 MCP 프록시 및 병렬화 오케스트레이션 도구

## 개요

MCP Orch는 MCP(Model Context Protocol) 생태계에서 두 가지 핵심 기능을 제공하는 통합 솔루션입니다:

1. **프록시 모드**: 여러 MCP 서버를 통합하여 단일 엔드포인트로 제공
2. **병렬화 모드**: LLM과 협력하여 작업을 자동으로 병렬 처리

## 주요 기능

- 🔄 **듀얼 모드 운영**: 프록시 모드와 병렬화 모드를 유연하게 전환
- 🔧 **통합 도구 레지스트리**: 모든 MCP 서버의 도구를 자동으로 발견하고 관리
- 🚀 **스마트 실행 플래너**: LLM을 활용한 지능형 작업 분석 및 계획
- ⚡ **고성능 실행 엔진**: 병렬 처리로 실행 시간 대폭 단축
- 🔌 **프로토콜 어댑터**: stdio ↔ HTTP 양방향 변환 지원
- 🎨 **웹 기반 대시보드**: 직관적인 UI로 도구 관리 및 모니터링

## 설치

### 요구사항

- Python 3.11 이상
- uv (권장) 또는 pip

### uv를 사용한 빠른 설치 (권장)

```bash
# uv 설치 (아직 없다면)
curl -LsSf https://astral.sh/uv/install.sh | sh

# MCP Orch 설치
uv pip install mcp-orch

# 또는 개발 환경 설치
git clone https://github.com/your-org/mcp-orch.git
cd mcp-orch
uv venv
source .venv/bin/activate  # Linux/macOS
uv pip install -e ".[dev]"
```

### pip를 사용한 설치 (대안)

```bash
pip install mcp-orch

# 개발 환경
pip install -e ".[dev]"
```

### LLM 지원 설치

```bash
# Azure AI Foundry / AWS Bedrock 지원
uv pip install "mcp-orch[llm]"
# 또는
pip install "mcp-orch[llm]"
```

## 빠른 시작

### 1. 프록시 모드로 시작

```bash
# 프록시 모드로 MCP Orch 실행
mcp-orch --mode proxy --port 3000
```

### 2. MCP 서버 설정

`mcp-config.json` 파일을 생성하여 MCP 서버들을 설정합니다:

```json
{
  "mcpServers": {
    "github-server": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "your-token"
      }
    },
    "notion-server": {
      "command": "node",
      "args": ["/path/to/notion-server"],
      "env": {
        "NOTION_API_KEY": "your-key"
      }
    }
  }
}
```

### 3. Cursor/Cline에서 사용

Cursor 또는 Cline의 MCP 설정에 다음을 추가합니다:

```json
{
  "mcpServers": {
    "mcp-orch": {
      "command": "mcp-orch",
      "args": ["--mode", "proxy"],
      "env": {
        "PROXY_PORT": "3000"
      }
    }
  }
}
```

### 4. 병렬화 모드 사용

```bash
# 병렬화 모드로 실행
mcp-orch --mode batch --port 3000

# API를 통해 작업 요청
curl -X POST http://localhost:3000/batch/execute \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "request": "GitHub 이슈들을 분석하고 Notion에 주간 리포트를 작성해줘"
  }'
```

## 사용 예시

### 프록시 모드에서 도구 호출

```python
import httpx

# 사용 가능한 도구 목록 조회
response = httpx.get("http://localhost:3000/tools")
tools = response.json()

# GitHub 이슈 조회 (네임스페이스 사용)
response = httpx.post(
    "http://localhost:3000/tools/github.list_issues",
    json={"repo": "octocat/hello-world"},
    headers={"Authorization": "Bearer your-token"}
)
```

### 병렬화 모드에서 복잡한 작업 실행

```python
# 복잡한 작업을 자동으로 병렬 처리
response = httpx.post(
    "http://localhost:3000/batch/execute",
    json={
        "request": "모든 GitHub 저장소의 이슈를 분석하고, "
                  "우선순위별로 정리한 후 Notion에 보고서를 작성해줘"
    },
    headers={"Authorization": "Bearer your-token"}
)

# 실행 상태 확인
task_id = response.json()["task_id"]
status = httpx.get(f"http://localhost:3000/batch/status/{task_id}")
```

## 설정

### 환경 변수

```bash
# 서버 포트
PROXY_PORT=3000

# 로그 레벨
LOG_LEVEL=INFO

# LLM 설정 (Azure AI Foundry)
AZURE_AI_ENDPOINT=https://your-endpoint.azure.com
AZURE_AI_API_KEY=your-api-key

# LLM 설정 (AWS Bedrock)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# 보안 설정
API_KEY=your-api-key
JWT_SECRET=your-jwt-secret
```

### 설정 파일

`config.yaml` 예시:

```yaml
server:
  host: 0.0.0.0
  port: 3000
  mode: proxy  # proxy 또는 batch

security:
  enable_auth: true
  api_keys:
    - name: default
      key: your-api-key
      permissions: ["read", "write", "execute"]

llm:
  provider: azure  # azure, bedrock, openai, anthropic
  azure:
    endpoint: https://your-endpoint.azure.com
    api_key: ${AZURE_AI_API_KEY}
    model: gpt-4
  
execution:
  max_parallel_tasks: 10
  task_timeout: 300  # seconds
  retry_count: 3
```

## API 문서

### REST API 엔드포인트

#### 도구 관련

- `GET /tools` - 사용 가능한 모든 도구 목록
- `GET /tools/{server_name}` - 특정 서버의 도구 목록
- `POST /tools/{server_name}.{tool_name}` - 도구 실행

#### 배치 실행 관련

- `POST /batch/execute` - 배치 작업 실행
- `GET /batch/status/{task_id}` - 작업 상태 조회
- `GET /batch/result/{task_id}` - 작업 결과 조회
- `DELETE /batch/cancel/{task_id}` - 작업 취소

#### 관리 관련

- `GET /servers` - 연결된 MCP 서버 목록
- `POST /servers/reload` - 설정 파일 리로드
- `GET /health` - 서버 상태 확인

## 개발

### 프로젝트 구조

```
mcp-orch/
├── src/
│   └── mcp_orch/
│       ├── core/           # 핵심 컴포넌트
│       │   ├── controller.py
│       │   ├── registry.py
│       │   └── adapter.py
│       ├── proxy/          # 프록시 모드 구현
│       ├── batch/          # 병렬화 모드 구현
│       ├── api/            # REST API
│       ├── llm/            # LLM 통합
│       └── cli.py          # CLI 인터페이스
├── tests/                  # 테스트
├── docs/                   # 문서
└── web/                    # 웹 UI (Next.js)
```

### 테스트 실행

```bash
# 단위 테스트
pytest

# 커버리지 포함
pytest --cov=mcp_orch

# 특정 테스트만 실행
pytest tests/test_proxy.py
```

### 코드 스타일

```bash
# 코드 포맷팅
black src tests

# import 정렬
isort src tests

# 타입 체크
mypy src
```

## 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 문의

- 이슈: [GitHub Issues](https://github.com/your-org/mcp-orch/issues)
- 이메일: your.email@example.com
- 문서: [공식 문서](https://github.com/your-org/mcp-orch/docs)

## 로드맵

- [x] Phase 1: MVP - 프록시 모드
- [ ] Phase 2: 병렬화 모드 기초
- [ ] Phase 3: LLM 통합
- [ ] Phase 4: 웹 UI
- [ ] Phase 5: 고급 기능

자세한 로드맵은 [PRD 문서](docs/PRD.md)를 참조하세요.
