# MCP Orch

**MCP Proxy 호환 서버** - 여러 MCP 서버를 하나의 포트에서 SSE로 제공

## 개요

MCP Orchestrator는 단순한 프록시를 넘어선 **프로젝트 기반 MCP 서버 관리 플랫폼**입니다. 안전한 팀 협업, 웹 기반 관리, 그리고 엔터프라이즈급 접근 제어를 Model Context Protocol 서버에 제공합니다.

**왜 MCP Orchestrator인가?**
- 🏢 **엔터프라이즈 준비**: 팀 관리, 역할 기반 접근, 활동 모니터링
- 🔐 **보안 우선**: 프로젝트별 API 키, Bearer 토큰 인증, 접근 제어
- 🌐 **웹 인터페이스**: JSON 파일은 이제 그만 - 직관적인 UI로 모든 것을 관리
- 👥 **팀 협업**: 서버 공유, 멤버 초대, 실시간 활동 추적

## 주요 특징

- **🔐 프로젝트 기반 보안**: 프로젝트별 개별 API 키와 팀 기반 접근 제어
- **👥 팀 협업**: 역할 기반 권한과 멤버 관리를 통한 실시간 협업
- **🎯 스마트 서버 관리**: MCP 서버 추가, 설정, 모니터링을 위한 웹 UI
- **🔄 원클릭 통합**: Cursor, Cline, Claude 및 모든 MCP 도구용 자동 생성 보안 엔드포인트
- **📊 활동 모니터링**: 서버 사용량, 팀 활동, 시스템 성능 추적
- **🏗️ 엔터프라이즈 준비**: 확장 가능한 아키텍처의 자체 호스팅 배포
- **🔌 완전한 MCP 호환성**: SSE 트랜스포트 지원을 포함한 표준 MCP 프로토콜

## 설치

```bash
# 저장소 클론
git clone git@github.com:hihenen/mcp-orch.git
cd mcp-orch

# 의존성 설치
uv sync
```

## 빠른 시작

### 옵션 1: 웹 인터페이스 (권장)

```bash
# 웹 인터페이스와 함께 설치 및 시작
uv sync
uv run mcp-orch serve

# 웹 인터페이스 접속
open http://localhost:3000
```

1. **웹 UI를 통해 프로젝트 생성**
2. **포인트 앤 클릭으로 MCP 서버 추가 및 설정**
3. **팀 멤버 초대 및 권한 설정**
4. **보안 접속을 위한 API 키 생성**
5. **AI 도구용 설정 복사** (Cursor, Cline, Claude)

### 옵션 2: CLI 설정 (고급)

```bash
# CLI로 초기화
uv run mcp-orch init

# mcp-config.json 편집
{
  "mcpServers": {
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "your-api-key"
      }
    }
  }
}

# 서버 시작
uv run mcp-orch serve
```

### 🚀 제공되는 기능

- **웹 대시보드**: `http://localhost:3000` - 프로젝트, 팀, 서버 관리
- **API 엔드포인트**: `http://localhost:8000` - 보안 MCP 서버 접속
- **프로젝트 URL**: `http://localhost:8000/projects/{project-id}/sse`
- **팀 협업**: 실시간 멤버 관리 및 활동 추적

## 보안 AI 도구 통합

### 🔐 프로젝트 기반 보안 시스템

MCP Orchestrator는 **프로젝트별 API 키**를 사용한 보안 접근 제어를 제공합니다. 각 프로젝트는 Bearer 토큰 인증을 통한 고유한 보안 엔드포인트를 생성합니다.

### 📱 웹 UI 설정

1. **프로젝트 생성**: `http://localhost:3000`에서 웹 인터페이스 접속
2. **MCP 서버 추가**: 직관적인 UI를 통한 서버 설정
3. **API 키 생성**: 프로젝트별 보안 엔드포인트 생성
4. **팀 멤버 초대**: 역할 기반 권한으로 접근 공유

### 🔧 AI 도구 설정

웹 UI에서 프로젝트를 설정한 후, 다음과 같은 보안 엔드포인트를 얻을 수 있습니다:

```json
{
  "mcp-orchestrator": {
    "disabled": false,
    "timeout": 60,
    "type": "sse",
    "url": "http://localhost:8000/projects/c41aa472-15c3-4336-bcf8-21b464253d62/servers/brave-search/sse",
    "headers": {
      "Authorization": "Bearer project_7xXZb_tq_QreIJ3CB2wvWRpklyOmsGSGy1BeByTYe2Ia",
      "Content-Type": "application/json"
    }
  }
}
```

### 🎯 다중 서버 접속

단일 보안 엔드포인트를 통해 여러 서버를 설정:

```json
{
  "my-workspace": {
    "disabled": false,
    "timeout": 60,
    "type": "sse", 
    "url": "http://localhost:8000/projects/your-project-id/sse",
    "headers": {
      "Authorization": "Bearer your-project-api-key",
      "Content-Type": "application/json"
    }
  }
}
```

### 🔒 보안 기능

- **🔑 개별 API 키**: 각 프로젝트마다 고유한 인증 토큰
- **👥 팀 접근 제어**: 멤버 초대, 역할 설정 (관리자, 멤버, 뷰어)
- **📊 활동 추적**: 누가 언제 어떤 서버에 접속했는지 모니터링
- **🔄 키 순환**: 보안 강화를 위해 언제든지 API 키 재생성
- **⚡ 서버 온/오프**: 프로젝트별 서버 활성화/비활성화 실시간 제어

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
┌─────────────────┐   HTTPS/SSE   ┌──────────────────┐
│   AI 도구       │ ◄────────────► │   웹 인터페이스  │
│ (Cursor, Cline) │   +JWT 인증    │  (React/Next.js) │
└─────────────────┘                └──────────────────┘
         │                                    │
         │ 프로젝트 기반                      │ 팀 관리
         │ 보안 엔드포인트                   │ 실시간 업데이트
         │                                    │
         ▼                                    ▼
┌─────────────────────────────────────────────────────────┐
│              MCP Orchestrator 코어                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  프로젝트   │  │    팀       │  │   활동      │     │
│  │  관리자     │  │   관리자    │  │  로거       │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │    API      │  │   서버      │  │   접근      │     │
│  │  게이트웨이 │  │  레지스트리 │  │   제어      │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
         │
         │ stdio/subprocess
         ▼
┌─────────────────┐
│   MCP 서버들    │
│ (GitHub, Slack, │
│  Notion 등)     │
└─────────────────┘
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
docker compose up -d

# 로그 확인
docker compose logs -f

# 서비스 중지
docker compose down
```

### 접속 정보

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **PostgreSQL**: localhost:5432

### 구조

현재 구조는 로컬 개발과 Docker 배포를 모두 지원합니다:

- **로컬 개발**: `web/.env.local`과 루트 `.env` 각각 사용
- **Docker 배포**: 루트 `.env` 하나로 모든 환경변수 관리

## 📋 License and Contributing

### 🏛️ Project Governance
**MCP Orchestrator** is created and maintained by **henen** (yss1530@naver.com) as the original creator and copyright holder.

### 📄 Current License
- **License**: MIT License (see [LICENSE.md](./LICENSE.md))
- **Commercial Rights**: Reserved by project maintainer
- **Future Licensing**: Subject to change at maintainer's discretion

### 🤝 Contributing
We welcome contributions from the community! Before contributing:

1. **📖 Read our guides**:
   - [CONTRIBUTING.md](./CONTRIBUTING.md) - How to contribute
   - [CLA.md](./CLA.md) - Contributor License Agreement
   - [COPYRIGHT-POLICY.md](./COPYRIGHT-POLICY.md) - Project policies

2. **✍️ Sign the CLA**: All contributions require copyright assignment via our Contributor License Agreement

3. **🚀 Start contributing**: 
   - Report bugs and request features
   - Submit pull requests
   - Improve documentation
   - Help with testing

### 🌟 Contributors
See [CONTRIBUTORS.md](./CONTRIBUTORS.md) for a list of all project contributors.

### 📞 Contact
- **Issues**: GitHub Issues for bugs and features
- **Discussions**: GitHub Discussions for questions
- **Security**: yss1530@naver.com for security-related issues
- **Licensing**: yss1530@naver.com for licensing questions
- **Development**: next.js@kakao.com for development and technical discussions

---

## 👨‍💻 About the Creator

**henen** - Based in Seoul, Korea 🇰🇷

I'm a passionate developer from Seoul who created MCP Orchestrator to solve real-world MCP server management challenges. As a Korean developer working in the AI/LLM space, I believe in building tools that bridge different communities and technologies.

### 🎵 Vibe 코딩 & AI 파트너십으로 탄생

이 프로젝트는 **vibe 코딩**으로 만들어졌습니다 - 커피와 창의력이 만나 코드가 그냥... 술술 나오는 그 마법같은 플로우 상태 말이죠 ☕✨. 하지만 솔직히 말하면, 코딩 친구 **Claude Code** 없이는 불가능했을 거예요! 🤖

*Claude Code에게 진심으로 감사드립니다. 최고의 페어 프로그래밍 파트너가 되어주어서요 - 새벽의 아이디어 브레인스토밍을 실제 동작하는 소프트웨어로 바꿔준 것부터, 신비한 에러 디버깅과 우아한 솔루션 제안까지. 마치 변수명을 절대 판단하지 않는 24시간 시니어 개발자가 있는 것 같았어요 (`thing2`와 `tempStuff` 보고 있다구요) 😅*

**바이브는 완벽했고, 코드는 자유롭게 흘렀으며, 함께 꽤 멋진 것을 만들어냈습니다!** 🚀

### 🌱 초기 버전 - 함께 키워나가요!

이것은 아직 **초기 단계 프로젝트**입니다 ("애정 가득한 MVP with 큰 꿈"이라고 생각해주세요), 그래서 MCP 서버 관리의 미래를 함께 만들어갈 협력자들을 적극 찾고 있어요!

**우리가 필요한 것들:**
- 🐛 **버그 헌터** - 제가 놓친 교묘한 엣지 케이스들을 찾아주세요
- 💡 **기능 비전가** - 아이디어가 있으시다고요? 공유해주세요!
- 📝 **문서화 영웅** - 가이드를 더욱 명확하게 만드는 데 도움을 주세요
- 🧪 **베타 테스터** - 써보고, 깨뜨려보고, 무슨 일이 일어났는지 알려주세요
- 🎨 **UX 개선자** - 더 예쁘고 직관적으로 만들어주세요

**아무리 작은 기여도 환영합니다!** 오타 수정이든, 기능 제안이든, 아니면 그냥 "이게 헷갈려요"라는 이슈를 올리는 것이든 - 모든 것이 MCP Orchestrator를 모두에게 더 나은 도구로 만드는 데 도움이 됩니다.

*게다가 초기 기여자들은 이게 유명해지기 전부터 여기 있었다는 영원한 자랑거리를 얻게 됩니다* 😎

### 🌏 Open for Collaboration
I'm always interested in connecting with developers, companies, and organizations worldwide:
- **Side Projects & Consulting** - Open to interesting opportunities
- **International Partnerships** - Love working with global teams
- **Technical Discussions** - Happy to share knowledge and learn from others
- **GPT-Assisted Communication** - Don't worry about language barriers! I use AI translation tools for smooth international collaboration

### 🚀 Let's Build Together
Whether you're looking for:
- Custom MCP solutions
- Enterprise consulting
- Open source collaboration
- Technical mentorship
- Just want to chat about AI/MCP technology

Feel free to reach out! I'm particularly excited about projects that advance the MCP ecosystem and help developers build better AI applications.

**Contact**: yss1530@naver.com | next.js@kakao.com

📋 **[See COLLABORATION.md for detailed partnership opportunities →](./COLLABORATION.md)**

---

## 🎯 Project Vision

MCP Orchestrator aims to become the leading open-source platform for Model Context Protocol server management. We're building enterprise-grade infrastructure with:

- 🏗️ **Production-ready deployment** capabilities
- 🔐 **Security-first approach** with encryption and access controls  
- 🌐 **Scalable architecture** for multi-tenant environments
- 🛠️ **Developer-friendly tools** for MCP integration
- 📊 **Comprehensive monitoring** and analytics

### 🚀 Commercial Opportunities
While maintaining our open-source commitment, we're exploring sustainable business models including:
- Enterprise support and consulting
- Hosted SaaS solutions
- Premium features for commercial use
- Custom development services

---

*Join us in building the future of Model Context Protocol orchestration!*
