# MCP Orchestrator 프로젝트 개요

## 프로젝트 목적
MCP Orchestrator는 **Model Context Protocol (MCP) 서버 관리 및 오케스트레이션을 위한 엔터프라이즈급 플랫폼**입니다.

### 핵심 기능
- **📁 프로젝트 기반 조직화**: MCP 서버를 프로젝트별로 관리
- **👥 팀 협업**: 멤버 초대, 권한 설정, 활동 추적
- **🔐 엔터프라이즈 보안**: JWT 인증, API 키, 감사 로그
- **🖥️ 전문 웹 UI**: 6개 탭 관리 인터페이스와 실시간 모니터링
- **🚀 프로덕션 준비**: Docker 지원, PostgreSQL 백엔드, 확장 가능한 아키텍처

## 아키텍처
- **Frontend**: Next.js 15.3.3 + React 19 + TypeScript
- **Backend**: FastAPI + Python 3.11+ + SQLAlchemy
- **Database**: PostgreSQL
- **Deployment**: Docker + Docker Compose

## 주요 특징
1. **하이브리드 MCP 프록시**: 개별 서버 제어와 통합 오케스트레이션 선택 가능
2. **보안 중심**: JWT 기반 인증, 데이터 암호화, 접근 제어
3. **다중 전송 지원**: SSE + Streamable HTTP 프로토콜
4. **네임스페이스 기반 도구 라우팅**: `github.search()`, `slack.send()` 등
5. **실시간 협업**: 역할 기반 권한과 실시간 업데이트

## 사용 사례
- AI 도구(Cursor, Cline, Claude)와의 통합
- 여러 MCP 서버의 중앙 집중식 관리
- 팀 기반 MCP 인프라 거버넌스
- 엔터프라이즈 AI 워크플로 관리