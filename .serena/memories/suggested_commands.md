# MCP Orchestrator 주요 명령어

## 개발 환경 설정
### 빠른 시작
```bash
# 전체 자동 설정 (권장)
./scripts/quickstart.sh

# 개별 서비스 관리
./scripts/database.sh              # PostgreSQL 시작
./scripts/backend.sh               # 백엔드 시작 (네이티브)
./scripts/frontend.sh              # 프론트엔드 시작 (Docker)
```

### 서비스 상태 확인
```bash
./scripts/status.sh                # 전체 상태 대시보드
./scripts/status.sh --quick        # 빠른 상태 확인
./scripts/status.sh --health       # 헬스 체크
```

## 패키지 관리
### Python 의존성
```bash
uv sync                           # 의존성 동기화
uv add <package>                  # 패키지 추가
uv remove <package>               # 패키지 제거
```

### Frontend 의존성
```bash
cd web
pnpm install                      # 의존성 설치
pnpm add <package>                # 패키지 추가
pnpm remove <package>             # 패키지 제거
```

## MCP 서버 관리
### CLI 명령어
```bash
uv run mcp-orch serve             # 서버 시작 (기본 포트 8000)
uv run mcp-orch serve --port 3000 # 포트 지정
uv run mcp-orch list-servers      # 설정된 서버 목록
uv run mcp-orch list-tools        # 사용 가능한 도구 목록
```

## 데이터베이스 관리
### 마이그레이션
```bash
uv run alembic upgrade head       # 마이그레이션 실행
uv run alembic revision --autogenerate -m "description"  # 새 마이그레이션 생성
uv run alembic current            # 현재 마이그레이션 상태
```

### 데이터베이스 연결
```bash
./scripts/database.sh --psql      # PostgreSQL 콘솔 접속
./scripts/database.sh --logs      # PostgreSQL 로그 확인
```

## 개발 및 품질 관리
### 코드 품질
```bash
# Python
black src/                        # 코드 포맷팅
isort src/                        # import 정렬
flake8 src/                       # 린팅
mypy src/                         # 타입 체크

# Frontend
cd web
pnpm run lint                     # ESLint 실행
pnpm run type-check               # TypeScript 타입 체크
pnpm run build                    # 프로덕션 빌드
```

### 테스트
```bash
# Python 테스트
pytest                            # 모든 테스트 실행
pytest -v                        # 상세 출력
pytest --cov                     # 커버리지 포함
```

## Docker 관리
### 서비스 관리
```bash
docker compose up -d              # 모든 서비스 시작 (백그라운드)
docker compose down               # 모든 서비스 중지
docker compose logs -f            # 실시간 로그 확인
docker compose ps                 # 컨테이너 상태 확인
```

### 개별 서비스
```bash
docker compose up -d postgresql   # PostgreSQL만 시작
docker compose restart mcp-orch-backend  # 백엔드 재시작
```

## 배포 및 운영
### 프로덕션 배포
```bash
docker compose -f docker-compose.yml up -d  # 프로덕션 배포
```

### 서비스 재시작
```bash
./scripts/restart-backend.sh      # 백엔드만 재시작
./scripts/shutdown.sh             # 모든 서비스 종료
```

## 로그 및 모니터링
### 로그 확인
```bash
tail -f logs/mcp-orch-$(date +%Y%m%d).log  # 백엔드 로그
docker logs mcp-orch-postgres -f  # PostgreSQL 로그
docker logs mcp-orch-frontend -f  # 프론트엔드 로그
```

### 헬스 체크
```bash
curl http://localhost:8000/health  # 백엔드 헬스 체크
curl http://localhost:3000         # 프론트엔드 접근 확인
```

## 환경 설정
### 환경 파일
```bash
cp .env.hybrid.example .env        # 환경 파일 생성
```

### 암호화 키 생성
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

## 유용한 URL
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API 문서: http://localhost:8000/docs
- PostgreSQL: localhost:5432