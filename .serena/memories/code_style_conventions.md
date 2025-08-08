# 코드 스타일 및 규칙

## Python 코드 스타일 (Backend)
### Formatting
- **Black**: 라인 길이 88자
- **isort**: Black 프로필 사용, 멀티라인 출력 3
- 타겟 Python 버전: 3.11+

### Type Hints
- **mypy** 엄격 모드 활성화:
  - `disallow_untyped_defs = true`
  - `disallow_incomplete_defs = true`
  - `check_untyped_defs = true`
  - `no_implicit_optional = true`
  - `strict_equality = true`

### 프로젝트 구조
```
src/mcp_orch/
├── api/           # FastAPI 라우터 및 엔드포인트
├── models/        # SQLAlchemy 데이터베이스 모델
├── services/      # 비즈니스 로직 서비스
├── core/         # 핵심 MCP 오케스트레이션
├── security/     # 보안 관련 모듈
├── utils/        # 공통 유틸리티
├── cli.py        # CLI 인터페이스
└── config.py     # 설정 관리
```

### Import 순서 (isort 규칙)
1. 표준 라이브러리
2. 서드파티 라이브러리
3. 로컬 패키지 (`mcp_orch`)

### 함수 및 클래스 명명
- 함수: `snake_case`
- 클래스: `PascalCase`
- 상수: `UPPER_SNAKE_CASE`
- Private 멤버: `_leading_underscore`

## TypeScript 코드 스타일 (Frontend)
### Next.js 13+ App Router 구조
```
web/src/
├── app/          # App Router 페이지
├── components/   # 재사용 가능한 React 컴포넌트
├── stores/       # Zustand 상태 관리
└── lib/          # 유틸리티 및 헬퍼
```

### 컴포넌트 스타일
- 함수형 컴포넌트 사용
- TypeScript 인터페이스로 Props 정의
- 기본 export 사용

### 상태 관리
- **Zustand**: 글로벌 상태 관리
- **React hooks**: 로컬 상태 관리

## 공통 규칙
### 파일 명명
- Python: `snake_case.py`
- TypeScript: `kebab-case.tsx` 또는 `camelCase.tsx`
- 컴포넌트: `PascalCase.tsx`

### 주석 및 문서화
- 복잡한 비즈니스 로직에 대한 명확한 주석
- API 엔드포인트에 대한 OpenAPI 문서화
- README 파일은 한국어와 영어 버전 제공

### 환경 변수
- `.env.example` 파일로 필수 환경변수 문서화
- 민감한 정보는 절대 코드에 하드코딩하지 않음
- 개발/프로덕션 환경 분리

### 보안 원칙
- 모든 API 엔드포인트에 JWT 인증 적용
- 데이터 암호화 (MCP_ENCRYPTION_KEY 사용)
- SQL 인젝션 방지 (SQLAlchemy ORM 사용)
- CORS 정책 적용