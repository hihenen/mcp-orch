# 스크린샷 및 데모 GIF 제작 가이드

## 🎯 필요한 시각적 자료

### 1. 핵심 스크린샷 (우선순위 순)

#### 필수 스크린샷
1. **메인 대시보드** - 프로젝트 리스트 화면
2. **프로젝트 관리 UI** - 6개 탭이 보이는 화면
3. **서버 관리 화면** - MCP 서버 추가/관리 UI
4. **팀 협업 화면** - 멤버 관리 및 권한 설정
5. **보안 설정 화면** - API 키 및 JWT 인증 설정

#### 추가 스크린샷
6. **활동 로그 화면** - 감사 추적 기능
7. **설정 화면** - 프로젝트 설정 옵션들
8. **로그인/회원가입 화면** - 인증 프로세스
9. **모바일 반응형** - 모바일에서의 UI

### 2. 데모 GIF (우선순위 순)

#### 핵심 데모 GIF
1. **프로젝트 생성부터 서버 추가까지** (30초)
   - 새 프로젝트 생성
   - MCP 서버 추가
   - 설정 완료까지의 전체 플로우

2. **팀 멤버 초대 및 권한 설정** (20초)
   - 팀 멤버 초대
   - 권한 설정
   - 활동 확인

3. **API 키 생성 및 Claude Code 연동** (25초)
   - API 키 생성
   - Claude Code 설정 파일 생성
   - 연동 테스트

#### 추가 데모 GIF
4. **실시간 모니터링** (15초)
   - 서버 상태 변화
   - 활동 로그 실시간 업데이트

5. **보안 설정** (20초)
   - JWT 설정
   - 감사 로그 확인

---

## 📸 스크린샷 촬영 가이드

### 준비사항
1. **브라우저 설정**
   - Chrome 브라우저 사용
   - 창 크기: 1920x1080 (Full HD)
   - 줌 레벨: 100%
   - 개발자 도구 닫기

2. **데이터 준비**
   - 샘플 프로젝트 생성
   - 다양한 MCP 서버 설정
   - 팀 멤버 데이터 준비
   - 활동 로그 데이터 생성

3. **UI 상태**
   - 로딩 상태 아닌 완료된 상태
   - 에러 메시지 없는 정상 상태
   - 적절한 데이터가 표시된 상태

### 촬영 가이드라인

#### 해상도 및 크기
- **스크린샷**: 1920x1080 또는 1280x720
- **GIF**: 1280x720 (파일 크기 고려)
- **파일 형식**: PNG (스크린샷), GIF (애니메이션)

#### 품질 기준
- **선명도**: 텍스트가 명확히 읽힐 것
- **색상**: 실제 UI 색상과 일치
- **여백**: 적절한 여백으로 UI 요소가 잘리지 않도록

---

## 🎬 데모 GIF 제작 가이드

### 권장 도구
1. **ScreenToGif** (Windows)
2. **LICEcap** (Windows/Mac)
3. **Gifox** (Mac)
4. **Chrome Extension**: Screencastify

### GIF 제작 설정
- **프레임 레이트**: 15-20 FPS
- **해상도**: 1280x720
- **시간**: 15-30초
- **파일 크기**: 10MB 이하

### 촬영 시나리오

#### 1. 프로젝트 생성 플로우 (30초)
```
1. 로그인 화면 (2초)
2. 대시보드 진입 (2초)
3. "Create Project" 클릭 (2초)
4. 프로젝트 정보 입력 (5초)
5. 프로젝트 생성 완료 (2초)
6. 서버 추가 버튼 클릭 (2초)
7. MCP 서버 정보 입력 (10초)
8. 서버 추가 완료 (3초)
9. 최종 결과 확인 (2초)
```

#### 2. 팀 협업 플로우 (20초)
```
1. Teams 탭 클릭 (2초)
2. "Invite Member" 클릭 (2초)
3. 이메일 입력 (4초)
4. 권한 설정 (4초)
5. 초대 전송 (2초)
6. 멤버 리스트 확인 (3초)
7. 권한 변경 시연 (3초)
```

#### 3. API 키 생성 플로우 (25초)
```
1. API Keys 탭 클릭 (2초)
2. "Generate Key" 클릭 (2초)
3. 키 설명 입력 (3초)
4. 키 생성 완료 (2초)
5. 복사 기능 시연 (2초)
6. Claude Code 설정 파일 열기 (3초)
7. 설정 정보 붙여넣기 (8초)
8. 연동 테스트 (3초)
```

---

## 🎨 브랜딩 가이드라인

### 색상 일관성
- **Primary Color**: #667eea (보라색 그라데이션)
- **Secondary Color**: #764ba2
- **Background**: 흰색/회색 (#f8f9fa)
- **Text**: 진한 회색 (#333)

### 로고 및 브랜딩
- MCP-Orch 로고 포함
- 일관된 폰트 사용
- 브랜드 아이덴티티 유지

---

## 📁 파일 구조 및 명명 규칙

### 스크린샷 명명
```
screenshots/
├── 01-dashboard-overview.png
├── 02-project-management.png
├── 03-server-configuration.png
├── 04-team-collaboration.png
├── 05-security-settings.png
├── 06-activity-logs.png
├── 07-project-settings.png
└── 08-mobile-responsive.png
```

### GIF 명명
```
demos/
├── 01-project-creation-flow.gif
├── 02-team-collaboration.gif
├── 03-api-key-integration.gif
├── 04-realtime-monitoring.gif
└── 05-security-configuration.gif
```

---

## 📊 활용 계획

### README.md 활용
- 메인 비교표 상단에 대시보드 스크린샷
- 각 기능 설명 섹션에 해당 스크린샷
- Quick Start 섹션에 데모 GIF

### GitHub Pages 활용
- 히어로 섹션에 메인 데모 GIF
- 기능별 섹션에 해당 스크린샷
- 사용 사례별 데모 GIF

### 마케팅 자료 활용
- 소셜 미디어 공유용 이미지
- 기술 블로그 포스트 삽입
- 프레젠테이션 자료

---

## ✅ 제작 체크리스트

### 스크린샷 체크리스트
- [ ] 메인 대시보드 (프로젝트 리스트)
- [ ] 프로젝트 관리 화면 (6개 탭)
- [ ] 서버 관리 화면
- [ ] 팀 협업 화면
- [ ] 보안 설정 화면
- [ ] 활동 로그 화면
- [ ] 설정 화면
- [ ] 로그인/회원가입 화면

### 데모 GIF 체크리스트
- [ ] 프로젝트 생성 플로우 (30초)
- [ ] 팀 멤버 초대 플로우 (20초)
- [ ] API 키 생성 및 연동 (25초)
- [ ] 실시간 모니터링 (15초)
- [ ] 보안 설정 (20초)

### 품질 검토 체크리스트
- [ ] 해상도 적절성
- [ ] 텍스트 가독성
- [ ] 색상 일관성
- [ ] 브랜딩 일관성
- [ ] 파일 크기 최적화

---

*이 가이드를 따라 제작된 시각적 자료들은 MCP-Orch의 전문성과 차별점을 효과적으로 어필할 것입니다.*