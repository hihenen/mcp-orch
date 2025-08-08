# 기술 스택 및 의존성

## Backend (Python)
### 핵심 프레임워크
- **FastAPI** (>=0.104.0) - API 서버 프레임워크
- **SQLAlchemy** (>=2.0.0) - ORM 및 데이터베이스 추상화
- **Alembic** (>=1.13.0) - 데이터베이스 마이그레이션
- **Pydantic** (>=2.5.0) - 데이터 검증 및 설정 관리

### 웹 서버 및 네트워킹
- **Uvicorn** (>=0.24.0) - ASGI 웹 서버
- **aiohttp** (>=3.9.0) - 비동기 HTTP 클라이언트
- **httpx** (>=0.25.0) - 현대적 HTTP 클라이언트
- **sse-starlette** (>=1.6.0) - Server-Sent Events 지원

### 보안 및 인증
- **python-jose[cryptography]** (>=3.3.0) - JWT 토큰 처리
- **passlib[bcrypt]** (>=1.7.4) - 패스워드 해싱
- **bcrypt** (>=4.1.2) - 암호화
- **PyJWT** (>=2.8.0) - JWT 라이브러리

### 데이터베이스
- **asyncpg** (>=0.29.0) - 비동기 PostgreSQL 드라이버
- **psycopg2-binary** (>=2.9.10) - PostgreSQL 어댑터
- **greenlet** (>=2.0.0) - 비동기 지원

### MCP 및 도구
- **mcp** (>=1.10.1) - Model Context Protocol 지원
- **fastmcp** (>=2.10.2) - FastMCP 구현
- **typer** (>=0.9.0) - CLI 인터페이스
- **rich** (>=13.7.0) - 콘솔 출력 포맷팅

### 유틸리티
- **python-dotenv** (>=1.0.0) - 환경변수 관리
- **apscheduler** (>=3.10.4) - 스케줄링
- **psutil** (>=5.9.0) - 시스템 모니터링
- **python-json-logger** (>=2.0.4) - 구조화된 로깅

## Frontend (TypeScript/JavaScript)
### 핵심 프레임워크
- **Next.js** (15.3.3) - React 메타프레임워크
- **React** (^19.1.0) - UI 라이브러리
- **TypeScript** (^5.3.3) - 정적 타입 지원

### 인증 및 상태 관리
- **next-auth** (5.0.0-beta.28) - 인증 솔루션
- **zustand** (^4.5.0) - 상태 관리

### UI 컴포넌트 및 스타일링
- **@radix-ui/** - 접근성 우선 UI 컴포넌트
- **Tailwind CSS** (^3.4.1) - 유틸리티 우선 CSS 프레임워크
- **lucide-react** (^0.323.0) - 아이콘 라이브러리
- **tailwindcss-animate** (^1.0.7) - CSS 애니메이션

### 차트 및 데이터 시각화
- **recharts** (^2.10.4) - React 차트 라이브러리

### 유틸리티
- **date-fns** (^4.1.0) - 날짜 처리
- **sonner** (^2.0.5) - 토스트 알림
- **pg** (^8.11.3) - PostgreSQL 클라이언트

## 개발 도구 및 품질 관리
### Python 개발 도구
- **pytest** (>=7.4.0) - 테스트 프레임워크
- **black** (>=23.11.0) - 코드 포맷터
- **isort** (>=5.12.0) - import 정렬
- **flake8** (>=6.1.0) - 린터
- **mypy** (>=1.7.0) - 타입 체커

### 패키지 관리
- **uv** - 빠른 Python 패키지 관리자
- **pnpm** - Node.js 패키지 관리자

## 인프라 및 배포
- **Docker** - 컨테이너화
- **Docker Compose** - 멀티 컨테이너 오케스트레이션
- **PostgreSQL 15** - 관계형 데이터베이스