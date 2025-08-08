# 작업 완료 시 체크리스트

## 코드 변경 후 필수 실행 사항

### 1. 코드 품질 검사
#### Python 백엔드
```bash
# 1. 코드 포맷팅
black src/

# 2. Import 정렬
isort src/

# 3. 린팅 검사
flake8 src/

# 4. 타입 체크
mypy src/
```

#### TypeScript 프론트엔드
```bash
cd web

# 1. 린팅
pnpm run lint

# 2. 타입 체크
pnpm run type-check

# 3. 빌드 테스트
pnpm run build
```

### 2. 테스트 실행
```bash
# Python 테스트 (프로젝트 루트에서)
pytest

# 커버리지 포함 테스트
pytest --cov

# 특정 테스트만 실행
pytest tests/test_specific.py -v
```

### 3. 데이터베이스 관련 변경사항
#### 모델 변경 시
```bash
# 1. 마이그레이션 생성
uv run alembic revision --autogenerate -m "Add new field to model"

# 2. 마이그레이션 실행
uv run alembic upgrade head

# 3. 마이그레이션 상태 확인
uv run alembic current
```

### 4. 서비스 재시작 및 테스트
```bash
# 1. 백엔드 재시작 (변경사항 반영)
./scripts/restart-backend.sh

# 2. 프론트엔드 재빌드 (필요시)
./scripts/frontend.sh --rebuild

# 3. 서비스 상태 확인
./scripts/status.sh

# 4. 헬스 체크
curl http://localhost:8000/health
```

### 5. 환경별 테스트
#### 개발 환경
```bash
# 로컬 테스트
curl http://localhost:8000/health
curl http://localhost:3000

# MCP 도구 확인
uv run mcp-orch list-tools
uv run mcp-orch list-servers
```

#### 프로덕션 준비 체크
```bash
# 환경 변수 검증
grep -E "(SECRET|PASSWORD|KEY)" .env

# Docker 빌드 테스트
docker compose build

# 전체 스택 테스트
docker compose up -d
./scripts/status.sh --health
```

## 특정 변경 유형별 체크리스트

### API 엔드포인트 변경
- [ ] OpenAPI 문서 업데이트 확인 (`/docs`)
- [ ] 인증/권한 체크
- [ ] 에러 핸들링 테스트
- [ ] 응답 스키마 검증

### 데이터베이스 모델 변경
- [ ] 마이그레이션 파일 생성 및 실행
- [ ] 기존 데이터 무결성 확인
- [ ] 인덱스 성능 검토
- [ ] 백업 전략 검토

### 프론트엔드 컴포넌트 변경
- [ ] TypeScript 타입 검사 통과
- [ ] 접근성 (a11y) 검사
- [ ] 다양한 화면 크기 테스트
- [ ] 브라우저 호환성 체크

### MCP 서버 관련 변경
- [ ] MCP 프로토콜 호환성 확인
- [ ] 도구 등록 및 호출 테스트
- [ ] 네임스페이스 충돌 체크
- [ ] 성능 및 안정성 테스트

### 보안 관련 변경
- [ ] JWT 토큰 검증 테스트
- [ ] 권한 기반 접근 제어 확인
- [ ] 데이터 암호화 검증
- [ ] API 키 관리 테스트

## 최종 배포 전 체크리스트
- [ ] 모든 테스트 통과
- [ ] 코드 품질 검사 통과
- [ ] 문서 업데이트 완료
- [ ] 환경 변수 보안 검증
- [ ] 백업 계획 수립
- [ ] 롤백 계획 준비
- [ ] 모니터링 설정 확인

## 오류 발생 시 디버깅 명령어
```bash
# 로그 확인
tail -f logs/mcp-orch-$(date +%Y%m%d).log

# 데이터베이스 연결 테스트
./scripts/database.sh --psql

# 서비스 상태 상세 확인
./scripts/status.sh --health

# Docker 컨테이너 로그
docker compose logs -f

# 프로세스 상태 확인
ps aux | grep "mcp-orch"
```