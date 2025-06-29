# Projects.py 리팩토링 진행 체크리스트

## 📅 **진행 상황 요약**

**시작일**: 2025-06-29  
**현재 Phase**: Phase 1 (Critical Issues)  
**전체 진행률**: 52% → **목표**: 100%  
**긴급도**: 🚨 Critical (Owner 권한 문제)

---

## 🎯 **Phase 1: Critical Issues 해결** ⏳

**목표**: Owner 권한 문제 및 프론트엔드 호환성 긴급 수정  
**예상 소요 시간**: 1-2일  
**우선순위**: Critical  

### **TASK_143: 프론트엔드 호환성 긴급 수정**

#### **Step 1.1: TypeScript 타입 정의 수정** ✅
- [x] `/web/src/types/index.ts` 파일 수정
  - [x] `Project` 인터페이스에 `user_role?: ProjectRole` 필드 추가
  - [x] `ProjectDetail` 인터페이스에 `user_role?: ProjectRole` 필드 추가 (상속으로 해결)
  - [x] `ProjectServer` 인터페이스에서 `disabled: boolean` → `is_enabled: boolean` 변경
  - [x] `McpServer` 타입에서 `disabled` → `is_enabled` 필드명 변경 (이미 적용됨)
  - [x] 기타 관련 타입들 일괄 검토 및 수정
  - [ ] **검증**: TypeScript 컴파일 에러 0개 확인

#### **Step 1.2: ProjectStore Owner 권한 수정**
- [ ] `/web/src/stores/projectStore.ts` 파일 수정
  - [ ] `loadProject` 함수 수정
    - [ ] `project.user_role` 직접 사용하도록 변경
    - [ ] `project.members` 배열에서 역할 찾는 로직 제거
  - [ ] 권한 체크 함수들 수정
    - [ ] `isOwner` 계산 로직 수정
    - [ ] `canEdit` 계산 로직 수정
    - [ ] `canManageMembers` 계산 로직 수정
  - [ ] **검증**: console.log로 user_role 값 확인

#### **Step 1.3: 서버 관리 컴포넌트 수정**
- [ ] `/web/src/components/servers/` 디렉터리 수정
  - [ ] `ServerCard.tsx` - `disabled` → `is_enabled` 변경
  - [ ] `ServerList.tsx` - 필터링 로직 수정  
  - [ ] `ServerDetailTab.tsx` - 상태 표시 로직 수정
  - [ ] `ServerToolsTab.tsx` - 서버 상태 확인 로직 수정
  - [ ] 모든 컴포넌트에서 `!server.disabled` → `server.is_enabled` 로직 반전
  - [ ] **검증**: 서버 목록에서 활성화/비활성화 상태 정상 표시 확인

#### **Step 1.4: 프로젝트 설정 페이지 수정**
- [ ] `/web/src/app/projects/[projectId]/settings/page.tsx` 수정
  - [ ] Owner 권한 확인 로직 수정
  - [ ] "Read-only Mode" 표시 조건 수정
  - [ ] 권한 기반 UI 렌더링 로직 수정
  - [ ] 에러 메시지 및 권한 안내 문구 개선
  - [ ] **검증**: Owner 로그인 시 편집 가능한 UI 표시 확인

#### **Step 1.5: 기타 프론트엔드 파일 수정**
- [ ] 서버 관련 페이지들 일괄 수정
  - [ ] `/web/src/app/projects/[projectId]/servers/page.tsx`
  - [ ] 기타 `disabled` 필드 사용하는 컴포넌트들 검색 후 수정
- [ ] API 호출 부분 검증
  - [ ] fetch 요청에서 올바른 필드명 사용 확인
  - [ ] 응답 처리에서 새로운 필드 구조 반영

#### **Step 1.6: 긴급 기능 검증** 🧪
- [ ] **Owner 권한 테스트**
  - [ ] Owner 계정으로 로그인
  - [ ] 프로젝트 설정 페이지 접근 (`/projects/{id}/settings`)
  - [ ] "Read-only Mode" 메시지 사라짐 확인
  - [ ] 프로젝트 이름/설명 편집 가능 확인
- [ ] **서버 관리 테스트**  
  - [ ] 서버 목록에서 활성화/비활성화 상태 정상 표시 확인
  - [ ] 서버 토글 기능 정상 작동 확인
  - [ ] 서버 추가/편집/삭제 기능 확인
- [ ] **멤버 관리 테스트**
  - [ ] 멤버 추가 기능 확인
  - [ ] 멤버 역할 변경 기능 확인  
  - [ ] 멤버 제거 기능 확인
- [ ] **API 키 관리 테스트**
  - [ ] API 키 생성 기능 확인
  - [ ] API 키 목록 조회 확인
  - [ ] API 키 삭제 기능 확인

**Phase 1 완료 기준**: ✅ Owner 권한 정상 인식 + 핵심 기능 정상 작동

---

## 🔧 **Phase 2: 백엔드 안정화** ⏸️

**목표**: API 엔드포인트 완전 검증 및 안정화  
**예상 소요 시간**: 2-3일  
**우선순위**: High  

### **TASK_144: API 엔드포인트 완전 검증**

#### **Step 2.1: 엔드포인트 매핑 전수 조사**
- [ ] **프로젝트 기본 관리** (5개)
  - [ ] `GET /api/projects` - 프로젝트 목록 조회
  - [ ] `POST /api/projects` - 프로젝트 생성  
  - [ ] `GET /api/projects/{id}` - 프로젝트 상세 조회
  - [ ] `PUT /api/projects/{id}` - 프로젝트 정보 수정
  - [ ] `DELETE /api/projects/{id}` - 프로젝트 삭제
- [ ] **멤버 관리** (6개)
  - [ ] `GET /api/projects/{id}/members` - 멤버 목록 조회
  - [ ] `POST /api/projects/{id}/members` - 멤버 추가
  - [ ] `PUT /api/projects/{id}/members/{member_id}` - 멤버 역할 수정
  - [ ] `DELETE /api/projects/{id}/members/{member_id}` - 멤버 제거
  - [ ] `POST /api/projects/{id}/teams` - 팀 일괄 초대
  - [ ] `GET /api/projects/{id}/available-teams` - 초대 가능한 팀 목록
- [ ] **서버 관리** (10개)
  - [ ] `GET /api/projects/{id}/servers` - 서버 목록 조회
  - [ ] `POST /api/projects/{id}/servers` - 서버 추가
  - [ ] `GET /api/projects/{id}/servers/{server_id}` - 서버 상세 조회
  - [ ] `PUT /api/projects/{id}/servers/{server_id}` - 서버 정보 수정
  - [ ] `DELETE /api/projects/{id}/servers/{server_id}` - 서버 삭제
  - [ ] `POST /api/projects/{id}/servers/{server_id}/toggle` - 서버 활성화/비활성화
  - [ ] `POST /api/projects/{id}/servers/refresh-status` - 전체 서버 상태 새로고침
  - [ ] `POST /api/projects/{id}/servers/{server_id}/refresh-status` - 개별 서버 상태 새로고침
  - [ ] 기타 서버 관련 엔드포인트들
- [ ] **팀 관리** (4개)
- [ ] **즐겨찾기 관리** (4개)  
- [ ] **API 키 관리** (3개)
- [ ] **기타 유틸리티** (2개)

#### **Step 2.2: 응답 형식 일치성 확보**
- [ ] **Pydantic 모델 vs TypeScript 타입 비교**
  - [ ] 필드명 일치성 확인 (특히 `disabled` vs `is_enabled`)
  - [ ] 데이터 타입 일치성 확인
  - [ ] 필수/선택 필드 일치성 확인
  - [ ] 중첩 객체 구조 일치성 확인
- [ ] **날짜/시간 형식 통일성**
  - [ ] ISO 8601 형식 일관성 확인
  - [ ] 타임존 처리 일관성 확인
  - [ ] 프론트엔드 파싱 로직 호환성 확인

#### **Step 2.3: 에러 처리 표준화**
- [ ] **HTTP 상태 코드 표준화**
  - [ ] 200: 성공 응답
  - [ ] 400: 잘못된 요청
  - [ ] 401: 인증 필요  
  - [ ] 403: 권한 없음
  - [ ] 404: 리소스 없음
  - [ ] 500: 서버 내부 오류
- [ ] **에러 응답 형식 통일**
- [ ] **로깅 레벨 및 형식 통일**

#### **Step 2.4: 권한 확인 로직 검증**
- [ ] **Owner 권한 테스트**
- [ ] **Developer 권한 테스트**
- [ ] **Viewer 권한 테스트**  
- [ ] **팀 멤버 권한 테스트**
- [ ] **비멤버 접근 차단 테스트**

---

## 🧹 **Phase 3: 정리 및 최적화** ⏸️

**목표**: 코드 정리, 최적화, 문서화  
**예상 소요 시간**: 1-2일  
**우선순위**: Medium  

### **TASK_145: 코드 정리 및 최적화**

#### **Step 3.1: 기존 파일 완전 제거**
- [ ] `/src/mcp_orch/api/projects.py` (2,031줄) 백업 생성
- [ ] 기존 파일 제거
- [ ] `app.py`에서 기존 라우터 import 및 등록 제거
- [ ] 관련 주석 및 deprecated 코드 정리

#### **Step 3.2: Import 경로 최적화**
- [ ] 순환 의존성 제거
- [ ] 불필요한 의존성 제거  
- [ ] 상대/절대 경로 일관성 확보

#### **Step 3.3: 성능 최적화**
- [ ] 데이터베이스 쿼리 최적화
- [ ] N+1 쿼리 문제 해결
- [ ] 응답 크기 최적화

#### **Step 3.4: 문서화 업데이트**
- [ ] API 문서 업데이트
- [ ] README 파일 업데이트

---

## ✅ **Phase 4: 최종 검증 및 배포** ⏸️

**목표**: 종합 테스트 및 프로덕션 배포  
**예상 소요 시간**: 1일  
**우선순위**: High  

### **TASK_146: 종합 검증 및 배포**

#### **Step 4.1: 전체 기능 테스트**
- [ ] **프로젝트 생명주기 테스트**
- [ ] **성능 테스트**  
- [ ] **호환성 테스트**

#### **Step 4.2: 보안 검증**
- [ ] 권한 우회 취약점 테스트
- [ ] 인증/인가 시스템 검증

#### **Step 4.3: 최종 배포**
- [ ] 스테이징 환경 배포
- [ ] 사용자 승인 테스트 (UAT)
- [ ] 프로덕션 배포

---

## 📊 **진행 상황 대시보드**

### **전체 진행률**
```
Progress: [████████████▒▒▒▒▒▒▒▒] 52% → 100%

Phase 1: [▒▒▒▒▒▒▒▒▒▒] 0%   ← 현재 위치
Phase 2: [▒▒▒▒▒▒▒▒▒▒] 0%   
Phase 3: [▒▒▒▒▒▒▒▒▒▒] 0%   
Phase 4: [▒▒▒▒▒▒▒▒▒▒] 0%   
```

### **금일 목표**
- [x] 분석 문서 작성 완료
- [x] 실행 계획 수립 완료  
- [x] 체크리스트 작성 완료
- [ ] **Phase 1 Step 1.1 시작**: TypeScript 타입 정의 수정

### **이슈 및 블로커**
- 🚨 **Critical**: Owner 권한 인식 실패 (프로덕션 영향)
- ⚠️ **High**: 프론트엔드 타입 에러 다수 예상
- ℹ️ **Medium**: 기존 코드와 신규 코드 병존 상태

### **다음 작업**
1. **즉시**: TypeScript 타입 정의 수정 시작
2. **오늘 중**: ProjectStore 권한 로직 수정
3. **내일**: 서버 관리 컴포넌트 수정 완료

---

**마지막 업데이트**: 2025-06-29 16:05  
**다음 업데이트**: Phase 1 Step 1.1 완료 후