# PRD: GitLab 스타일 핵심 팀 관리 시스템

## 개요

MCP Orchestrator의 팀 중심 관리 시스템을 GitLab의 핵심 기능을 참고하여 실용적이고 간소화된 형태로 구현합니다.

## 핵심 목표

- **실용성 우선**: 복잡한 기능보다는 핵심 기능에 집중
- **팀 중심 설계**: 개인 사용자도 팀을 만들어 사용하는 일관된 패턴
- **간소화된 권한**: 3단계 역할 시스템으로 단순화
- **API 키 단순화**: 팀 단위 API 키만 사용

## 1. 역할 시스템

### 3단계 역할 구조

#### 🔴 Owner (팀 소유자)
- **팀 관리**: 팀 이름 변경, 팀 삭제, 팀 설정 전체
- **멤버 관리**: 멤버 초대, 역할 변경, 멤버 제거
- **서버 관리**: 서버 추가/삭제, 서버 설정 편집, 활성화/비활성화
- **API 키 관리**: 팀 API 키 생성/삭제/관리
- **UI 권한**: 모든 탭 접근, 모든 액션 버튼 표시

#### 🟡 Developer (개발자)
- **서버 사용**: 서버 조회 및 사용 (추가/설정 편집 불가)
- **도구 실행**: 모든 도구 실행 및 조회 (팀 API 키 사용)
- **로그 조회**: 팀 로그 조회 권한
- **API 키**: 팀 API 키 조회만 가능 (생성/삭제 불가)
- **UI 권한**: Settings 탭 제외, 제한된 액션 버튼

#### 🔵 Reporter (보고자)
- **읽기 전용**: 모든 정보 읽기 전용 접근 (웹 UI만)
- **조회 권한**: 서버/도구 목록 조회만 가능 (실행 불가)
- **로그 조회**: 로그 조회만 가능
- **API 키**: 조회 불가 (보안상 완전 숨김)
- **UI 권한**: Settings, API Keys 탭 숨김, 모든 액션 버튼 숨김

## 2. 팀 상세 페이지 구조

### 7개 탭 구성

```
📊 Overview (팀 대시보드)
👥 Members (팀원 관리)
🖥️ Servers (서버 관리)
🔧 Tools (도구 목록)
📋 Activity (활동 피드)
⚙️ Settings (팀 설정) - Owner만
🔑 Access Tokens (API 키) - Owner/Developer만
```

### 각 탭별 기능

#### Overview 탭
- 팀 정보 카드 (이름, 설명, 생성일, 멤버 수)
- 최근 활동 타임라인 (서버 추가, 멤버 변경, 도구 실행 등)
- 서버 상태 요약 (활성/비활성, 에러 상태)
- 기본 사용량 통계 (도구 실행 횟수, 서버 수)
- 빠른 액션 버튼 (서버 추가, 멤버 초대, 설정) - Owner만

#### Members 탭
- 팀원 목록 테이블 (아바타, 이름, 이메일, 역할, 가입일)
- 역할별 필터링 및 검색
- 팀원 초대 시스템 (이메일 기반, 초기 역할 설정)
- 역할 변경 기능 (Owner만)
- 팀원 제거 기능 (Owner만)

#### Servers 탭
- 팀별 서버 목록 표시 (기존 서버 페이지 로직 재사용)
- 서버 추가 기능 (Owner/Developer)
- 서버 설정 편집 (Owner만)
- 서버 활성화/비활성화 토글 (Owner만)
- 서버별 기본 통계 표시

#### Tools 탭
- 팀의 모든 서버에서 사용 가능한 도구 통합 표시
- 도구 검색 및 필터링
- 도구 실행 바로가기 (도구 페이지로 이동)
- 기본 사용 통계 (실행 횟수)

#### Activity 탭
- 기본 팀 활동 피드
  - 새 멤버 가입/탈퇴
  - 서버 추가/수정/삭제
  - 중요한 도구 실행
  - 설정 변경
- 활동 필터링 (타입별, 날짜별)

#### Settings 탭 (Owner만)
- 팀 기본 정보 관리 (이름, 설명)
- 팀 가시성 설정 (공개/비공개)
- 팀 삭제 기능

#### Access Tokens 탭 (Owner/Developer)
- 팀 API 키 목록 표시
- API 키 생성/삭제 (Owner만)
- API 키 사용량 기본 모니터링
- Cline 설정 다운로드 기능

## 3. API 키 관리 시스템

### 팀 단위 API 키 전용

#### 핵심 아이디어
- **개인 API 키 완전 제거**: 팀 단위 API 키만 사용
- **일관된 패턴**: 개인 사용자도 개인 팀을 만들어서 API 키 사용
- **공유 방식**: API 키는 팀 전체에 공유

#### 사용 시나리오
1. **개인 사용자**: "John's Personal Team" 생성 → 팀 API 키 발급
2. **회사 팀**: "Frontend Team" 생성 → 팀 API 키를 팀원들이 공유
3. **Cline 설정**: 팀 API 키를 사용하여 팀의 모든 서버 접근

#### 권한 구조
- **Owner**: 팀 API 키 생성/삭제/관리
- **Developer**: 팀 API 키 사용 가능 (조회만)
- **Reporter**: API 키 사용 불가 (웹 UI만 사용)

#### 장점
1. **관리 복잡도 감소**: 개인별 키 관리 불필요
2. **보안 단순화**: 팀 단위 권한 관리로 충분
3. **사용자 경험 개선**: 개인도 팀을 만들어 사용하는 일관된 패턴
4. **협업 친화적**: 팀원들이 동일한 API 키로 협업 가능

## 4. 백엔드 API 설계

### 데이터베이스 스키마 확장

```sql
-- organization_members 테이블에 role 컬럼 추가
ALTER TABLE organization_members ADD COLUMN role VARCHAR(20) DEFAULT 'developer';
-- 3단계 역할: 'owner', 'developer', 'reporter'
```

### API 엔드포인트

#### 팀 멤버십 관리
- `GET /api/teams/{team_id}/members` - 팀원 목록
- `POST /api/teams/{team_id}/members/invite` - 팀원 초대
- `PUT /api/teams/{team_id}/members/{user_id}/role` - 역할 변경
- `DELETE /api/teams/{team_id}/members/{user_id}` - 팀원 제거

#### 팀별 서버 관리
- `GET /api/teams/{team_id}/servers` - 팀 서버 목록
- `POST /api/teams/{team_id}/servers` - 서버 추가

#### 팀별 도구 및 활동
- `GET /api/teams/{team_id}/tools` - 팀 도구 목록
- `GET /api/teams/{team_id}/activity` - 팀 활동 피드

#### API 키 관리
- `GET /api/teams/{team_id}/api-keys` - 팀 API 키 목록
- `POST /api/teams/{team_id}/api-keys` - 팀 API 키 생성
- `DELETE /api/teams/{team_id}/api-keys/{key_id}` - API 키 삭제

## 5. 프론트엔드 UI 설계

### 권한 기반 UI 제어

#### Owner 전용 UI
- 팀 설정 탭 전체 접근
- 팀원 관리 모든 기능 (초대, 역할 변경, 제거)
- 서버 관리 모든 기능 (추가, 삭제, 설정 편집)
- API 키 생성/삭제 버튼
- 팀 Overview의 모든 빠른 액션 버튼

#### Developer UI
- 서버 조회 및 사용 (편집 버튼 숨김)
- 도구 실행 및 조회
- 로그 조회
- API 키 조회 (생성/삭제 버튼 숨김)
- 제한된 액션 버튼

#### Reporter UI
- 모든 정보 읽기 전용
- Settings, API Keys 탭 완전 숨김
- 모든 액션 버튼 숨김
- "권한이 없습니다" 안내 메시지

### UI 컴포넌트

#### 역할 배지
```tsx
<Badge variant={role === 'owner' ? 'destructive' : role === 'developer' ? 'default' : 'secondary'}>
  {role.toUpperCase()}
</Badge>
```

#### 권한 체크 컴포넌트
```tsx
<PermissionGate requiredRole="owner">
  <Button>팀 설정</Button>
</PermissionGate>
```

## 6. 구현 우선순위

### Phase 1: 기본 구조 (2주)
1. 데이터베이스 스키마 확장
2. 3단계 역할 시스템 구현
3. 기본 팀 상세 페이지 구조

### Phase 2: 핵심 기능 (2주)
1. 팀원 관리 시스템
2. 팀별 서버 관리
3. 권한 기반 UI 제어

### Phase 3: 고급 기능 (1주)
1. 활동 피드
2. API 키 관리
3. Cline 설정 자동 생성

## 7. 성공 지표

### 기능적 지표
- 팀 생성 및 멤버 초대 성공률 > 95%
- 역할별 권한 제어 정확도 100%
- API 키 기반 서버 접근 성공률 > 99%

### 사용성 지표
- 팀 관리 작업 완료 시간 < 2분
- 사용자 만족도 > 4.0/5.0
- 권한 관련 문의 < 5%

## 8. 위험 요소 및 대응

### 기술적 위험
- **복잡한 권한 로직**: 단순한 3단계 역할로 최소화
- **API 키 보안**: 팀 단위 관리로 복잡도 감소

### 사용자 경험 위험
- **권한 혼란**: 명확한 UI 표시 및 안내 메시지
- **팀 관리 복잡도**: GitLab 패턴 차용으로 직관성 확보

## 9. 향후 확장 계획

### 단기 확장 (3개월)
- 팀별 사용량 통계
- 고급 활동 피드
- 팀 템플릿 기능

### 장기 확장 (6개월)
- 개인 API 키 추가 (필요시)
- 고급 권한 모델
- 팀 간 협업 기능

---

**결론**: 이 PRD는 복잡한 기능을 제거하고 핵심 팀 관리 기능에 집중하여, 실용적이고 사용하기 쉬운 시스템을 구현하는 것을 목표로 합니다.
