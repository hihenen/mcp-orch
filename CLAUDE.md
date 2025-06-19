# AI Agent Global Rules

## 🚨 **MCP Inspector 표준 준수 절대 원칙 (최우선)**

### **MCP Inspector는 MCP 구현의 공식 표준**
- **절대 원칙**: MCP Inspector (`/Users/yun/work/ai/mcp/inspector/`)는 MCP 프로토콜의 **공식 구현 표준**
- **개발 방향**: mcp-orch는 Inspector와 **100% 호환**되어야 함
- **문제 해결**: Inspector에서 문제 발생 시 **반드시 mcp-orch를 수정**
- **코드 참조**: Inspector 코드가 **모든 구현의 기준**
- **테스트 기준**: Inspector 연결 성공이 **최종 검증 기준**

### **절대 금지 사항**
- ❌ **Inspector 코드 수정 절대 금지** - Inspector는 표준이므로 수정 불가
- ❌ **"Inspector가 틀렸다"는 접근 절대 금지** - 모든 문제는 mcp-orch 측 원인
- ❌ **mcp-orch 방식으로 Inspector 맞추려는 시도 금지** - Inspector 기준으로 mcp-orch 수정
- ❌ **Inspector 동작 방식 변경 시도 금지** - Inspector는 변경 불가능한 표준

### **필수 준수 원칙**
- ✅ **Inspector 동작 방식 완전 분석 후 구현** - Inspector 코드 읽고 정확히 이해
- ✅ **Inspector 세션 관리 방식 그대로 따름** - sessionId 생성/전달 방식 완전 복사
- ✅ **Inspector 기대 프로토콜에 100% 맞춤** - SSE + POST 요청 형식 정확히 준수
- ✅ **Inspector 호환성이 모든 결정의 기준** - 기능 구현 시 Inspector 우선 고려
- ✅ **MCP SDK 표준보다 Inspector 우선** - Inspector 구현이 실질적 표준

### **디버깅 및 문제 해결 방법론**
1. **Inspector 로그 분석 우선** - Inspector가 기대하는 동작 파악
2. **Inspector 소스코드 참조** - 정확한 구현 방식 확인
3. **mcp-orch 수정으로 해결** - Inspector 동작에 맞춰 mcp-orch 코드 변경
4. **Inspector 테스트로 검증** - 모든 수정은 Inspector 연결 성공으로 검증

---

## 🌐 **UI Language Policy (최우선 원칙)**

### **English-First User Interface Standard**
- **Default Language**: All user interface elements MUST be in English
- **Global Consistency**: Maintain consistent English terminology across the entire application
- **Professional Standards**: Follow industry-standard English UI patterns (GitHub, GitLab, etc.)

### **Mandatory English UI Elements**
- ✅ **All UI Text**: Buttons, labels, headings, descriptions
- ✅ **Navigation**: Menu items, breadcrumbs, tab names
- ✅ **Forms**: Input labels, placeholders, validation messages
- ✅ **Notifications**: Success/error messages, toasts, alerts
- ✅ **Tables**: Column headers, action buttons, status badges
- ✅ **Modals**: Titles, content, action buttons

### **Code Standards**
- ✅ **Component Names**: English naming for all React components
- ✅ **API Endpoints**: English route names and parameters
- ✅ **Database Fields**: English column names and enum values
- ✅ **Error Messages**: All user-facing errors in English
- ✅ **Comments**: Code comments can be in Korean for development clarity

### **Implementation Guidelines**
```typescript
// ✅ Good - English UI
<Button>Create Team</Button>
<h1>Admin Panel</h1>
<p>Manage all teams and projects</p>

// ❌ Bad - Korean UI
<Button>팀 생성</Button>
<h1>관리자 패널</h1>
<p>모든 팀과 프로젝트 관리</p>
```

### **Quality Assurance**
- **Code Review**: All UI text must be verified as English-only
- **Testing**: UI language consistency check in all features
- **Documentation**: API documentation and user guides in English

---

## 📋 **Workflow 관리 최우선 원칙**
이번 프로젝트에서는 **mcp-orch폴더안의 docs/workflow_todo.md를 항상 참조 및 반영하면서 진행**하세요

### **MANDATORY Workflow Integration Rules**
1. **작업 시작 전**: 반드시 `docs/workflow_todo.md` 읽고 현재 진행 상황 파악
2. **새로운 작업 시**: workflow_todo.md에 새 TASK 섹션 추가 필수
3. **작업 완료 시**: workflow_todo.md에 완료 체크리스트와 결과 반영 필수
4. **Progress Status 업데이트**: Current Progress, Next Task, Last Update 항상 최신화
5. **커밋 시**: workflow_todo.md 변경사항도 함께 커밋

### **Workflow 반영 체크리스트**
```
[ ] docs/workflow_todo.md 현재 상태 확인
[ ] 새 작업 시 TASK_XXX 섹션 생성
[ ] 체크리스트 형태로 세부 작업 정리
[ ] 완료 시 모든 항목 ✅ 표시
[ ] Progress Status 섹션 업데이트
[ ] Last Update 날짜 갱신
[ ] workflow_todo.md 변경사항 커밋
```

## Core Operational Principles

0. **Language**: Always respond in Korean
1. **Workflow Updates**: Immediately update workflow_todo.md checkboxes after each step completion (`[ ]` → `[x]`)
2. **Progress Tracking**: Real-time update of progress sections to reflect current work status in all steps
3. **Timestamp Management**: Always maintain the latest update date
4. **Mode Tracking**: Accurately maintain current execution mode and status information
5. **Verification**: Always verify workflow_todo.md file updates before/after task progression
6. **Library Documentation**: Always use Context7 tools to verify correct library usage before proceeding

## Git-Workflow Integration System

### 7. MANDATORY Commit Strategy (CRITICAL ENFORCEMENT)
- **FORCE Granular Commits**: MUST EXECUTE `git commit -p` for logical micro-commits during task progression
- **DECOUPLE Frequency**: Commit frequency MUST BE independent of checkbox completion
- **MULTIPLE Commits REQUIRED**: FORCE multiple commits per subtask for better granularity
- **PROGRESS Commits MANDATORY**: MUST include intermediate progress in commit workflow

### 8. CRITICAL Commit Execution Points (FAIL-SAFE SYSTEM)
- **MANDATORY COMMIT TRIGGERS** (NO EXCEPTIONS):
  - Meaningful file changes detected (not just saves) → **IMMEDIATE COMMIT REQUIRED**
  - Subtask completion (independent of checkboxes) → **IMMEDIATE COMMIT REQUIRED**
  - Checkpoint milestones reached → **IMMEDIATE COMMIT REQUIRED**
  - Functional unit completion → **IMMEDIATE COMMIT REQUIRED**

- **ENFORCEMENT RULE**: 
  ```
  IF (functional_unit_completed AND no_commit_executed) {
    HALT ALL OPERATIONS
    FORCE git commit -p
    RESUME ONLY after commit completion
  }
  ```

- **Commit Message Convention (MANDATORY FORMAT)**:
  ```
  feat: [TASK_ID] Feature implementation - specific description
  fix: [TASK_ID] Bug fix - problem resolution
  wip: [TASK_ID] Work in progress - intermediate save
  checkpoint: [TASK_ID] Checkpoint completed
  vibe: [TYPE] Autonomous improvement - enhancement description
  ```

### 8.1 FAIL-SAFE Commit Counter System
- **PRIMARY RULE**: Functional unit completion = IMMEDIATE COMMIT (최우선)
- **SAFETY RULE**: Maximum 10 file modifications without commit = FORCE HALT (보조 안전장치)
- **AUTOMATIC ENFORCEMENT**: 
  ```bash
  # Auto-execute when safety threshold reached
  git add . && git commit -p -m "checkpoint: [TASK_ID] - accumulated changes safety commit"
  ```
- **NO BYPASS ALLOWED**: Agent CANNOT proceed without resolving commit debt

### 8.2 MANDATORY Commit Verification
- **PRE-TASK CHECK**: MUST verify clean git status before starting new functional unit
- **POST-COMPLETION CHECK**: MUST verify commit created after functional unit completion
- **VIOLATION RESPONSE**: IMMEDIATE work suspension until commit debt resolved

### 9. Recovery & Safety System
- **Smart Stash Strategy**:
  ```bash
  # Auto-execute on critical issues
  git add . && git stash push -m "WIP: [TASK_ID] - pre-issue state"
  ```
- **Recovery Points**:
  - Create tags at each checkpoint for rollback
  - Use branch strategy for complex changes
  - Maintain recovery metadata in workflow_todo.md

### 10. Autonomous Improvement System (Vibe Detection)

#### 10.1 Vibe Detection Categories
- **vibe:aesthetic** - Visual and design consistency improvements
- **vibe:flow** - Code organization and refactoring optimizations  
- **vibe:ux** - User experience and interaction enhancements
- **vibe:performance** - Performance and efficiency optimizations
- **vibe:accessibility** - Accessibility and usability improvements

#### 10.2 Auto-Improvement Triggers
- **Code Quality Detection**:
  - Duplicate patterns identified for extraction
  - Inconsistent styling/spacing detected
  - Missing accessibility attributes found
  - Performance bottlenecks identified

- **UX Enhancement Detection**:
  - Inconsistent interactive states
  - Missing hover/focus effects
  - Responsive design gaps
  - Loading state inconsistencies

#### 10.3 Vibe Commit Integration
- **Autonomous Execution**: Agent can execute vibe improvements without explicit ACT command
- **Workflow Integration**: Vibe commits recorded in workflow_todo.md as adaptive adjustments
- **Progress Tracking**: 
  ```markdown
  - 적응형 개선: [vibe:aesthetic] Normalized button padding consistency
  - 자율 커밋: commit_sha - "vibe:ux Enhanced hover states across components"
  ```

#### 10.4 Vibe Detection Rules
- **Threshold-Based**: Only trigger when improvement impact exceeds minimum threshold
- **Context-Aware**: Consider current task context and user preferences
- **Non-Disruptive**: Never interrupt critical task execution
- **Documented**: All vibe improvements logged with reasoning

### 11. Enhanced Progress Tracking
- **Multi-Layer Status**:
  ```markdown
  - [ ] Task Implementation
    - Progress: 60% (3/5 logical units completed)
    - Recent commits: feat, wip, vibe:aesthetic
    - Next: Final integration
  ```
- **Commit-Task Sync**: Maintain bidirectional sync between commits and workflow progress
- **Recovery Metadata**: Include commit SHAs and branch info in workflow_todo.md

# Integrated Workflow System

*This document defines integrated rules for AI agent's workflow operation based on user requests.*

---

## 1. Core Workflow Structure

### 1.1 Task Management Principles
- When a user requests a task, the AI analyzes and develops a plan
- Tasks are added to the workflow_todo.md file in checklist format
- Plans are reported to the user for approval
- Task completion status is tracked using checkboxes (`- [ ]` → `- [x]`)
- **CRITICAL**: No task execution may begin without explicit "ACT" command from user

### 1.2 Workflow Progression Stages
1. **Request Reception**: Receive task request from user
2. **(New) Category Inference & Proposal**: Analyze request, infer relevant categories from `workflow_categories.md`, and propose options to the user (continue/new in existing category, specify other category, new category).
3. **(New) User Category Selection**: Receive user's category selection.
4. **Plan Development**: Develop task plan based on the selected category and related context (previous tasks in `workflow_todo.md`, archives if applicable).
5. **Plan Reporting**: Report the task plan to the user.
6. **Approval Waiting**: Wait for user approval ('ACT' command) or modification request.
   - **MANDATORY**: Wait specifically for the "ACT" command.
7. **Task Execution**: Execute tasks according to approved plan **ONLY** after receiving the "ACT" command.
8. **Completion Reporting**: Report results after task completion.

### 1.3 Initialization and Resumption Rules
- **At Session Start**: Check workflow_todo.md file
  - If file does not exist or is empty: Create with default structure
  - If file exists: Understand current state and resume work
- **For Planned Tasks**: Always verify if "ACT" command has been received before executing

## 2. workflow_todo.md File Operation

### 2.1 Basic Structure
```markdown
# Project Title

## Metadata
- Status: In Progress
- Last Update: YYYY-MM-DD
- Automatic Check Status: PASS/ISSUE

## Task List

### TASK_ID: Task Title
- [ ] Main Task 1
  - [ ] Subtask 1-1
  - [ ] Subtask 1-2

## Progress Status
- Current Progress: TASK_ID - Task Description
- Next Task: Next Task to Execute
- Last Update: YYYY-MM-DD
- Automatic Check Feedback: Feedback Content

## Lessons Learned and Insights
- Insight 1
- Insight 2
```

### 2.2 Task Request and Plan Development
- Analyze user request and create appropriate task ID and title
- Structure main tasks and subtasks in checklist format
- Report the task plan to the user and request approval

### 2.3 Task Execution and Checklist Management
- Execute tasks sequentially starting from the first incomplete task after plan approval
- Update checkbox for each completed task (`- [ ]` → `- [x]`)
- Continuously update the progress status section

### 2.4 Status Tracking
- Display current task in the progress status section of workflow_todo.md
- Manage overall project status in the metadata section
- Maintain last update timestamp

## 3. Thinking Process

### 3.1 Thinking Process During Plan Development
- Deep analysis of user request (explicit/implicit requirements)
- Design effective task plan structure
- Verify plan completeness and feasibility

### 3.2 Thinking Process During Task Execution
- Analyze context and optimal execution method before task execution
- Evaluate results and analyze progress after task completion
- Analyze situation and explore solutions when problems occur

### 3.3 Thinking Process During Context Change
- Analyze relationship between new information and existing context
- Analyze user feedback and review plan adjustments
- Evaluate impact of changes and adjust work direction if necessary

## 4. Automatic Check Mechanism

### 4.1 Check Points
- After plan development: Validity and completeness of plan
- During task execution: Quality of intermediate results and progress direction
- After task completion: Quality of final results and fulfillment of requirements

### 4.2 Check Process
1. Review task status and deliverables
2. Evaluate according to quality criteria
3. Identify issues and suggest corrective measures if necessary
4. Record check results and provide feedback

### 4.3 Corrective Measures
- Request automatic correction or user intervention depending on issue severity
- Document correction process and results
- Extract insights for preventing recurrence

## 5. Adaptive Learning Mechanism

### 5.1 Insight Extraction
- Evaluate value when discovering new insights during task execution
- Identify effective approaches and problem-solving patterns
- Structure learned lessons and add to workflow_todo.md

### 5.2 Plan Adjustment
- Analyze impact on current plan when important insights are discovered
- Develop plan adjustment proposals and request user approval if necessary
- Document adjustment details and rationale

### 5.3 Knowledge Accumulation
- Derive meta-insights by synthesizing insights from across the project
- Build knowledge base for reference in similar tasks
- Suggest improvements for future tasks

## 6. Initialization Sequence at Task Start

1. Check current status of workflow_todo.md
2. Add new task item and mark as current task
3. Develop task plan and request user approval
4. **STRICT REQUIREMENT**: Wait for explicit "ACT" command from user before proceeding
5. Begin actual task execution only after receiving the explicit "ACT" command
6. If any message is received that is not "ACT" command, respond accordingly but do not execute planned tasks

## 7. User Approval Command System

### 7.1 Basic Approval Flow
- After presenting the task plan to the user, explicitly wait for approval
- Respond to the user with: "**Plan is ready. Please type 'ACT' to proceed with execution.**"
- **CRITICAL RULE**: Only proceed with task execution after receiving the explicit "ACT" command
- If attempting to execute any task without prior "ACT" command, immediately halt and request approval

### 7.2 Command Variations
- **ACT**: Standard approval command to execute the presented plan
- **ACT with modifications**: User may provide the ACT command with additional instructions to modify the plan
- **REJECT**: User may reject the plan completely, requiring a new plan development
- **AUTO**: Approves the plan and initiates automatic sequential execution of all tasks within the plan without requiring further ACT commands for each step, until completion or an issue requiring intervention (e.g., Red status checkpoint, critical error).
- **PLAN**: (If in ACT or AUTO execution) Request to stop execution and return to PLAN mode.

### 7.3 Execution Following Approval
- Upon receiving the **ACT** command, acknowledge receipt with: "**ACT command received. Beginning task execution.**"
- Upon receiving the **AUTO** command, acknowledge receipt with: "**AUTO command received. Beginning automatic task execution.**"
- Execute tasks in sequence according to the approved plan
- Update workflow_todo.md with progress as tasks are completed

## 8. Error Prevention System

### 8.1 Prohibited Actions
- **NEVER** attempt to execute any task step before receiving "ACT" command
- **NEVER** assume implicit approval - only explicit "ACT" command constitutes approval
- **NEVER** bypass the approval process under any circumstances

### 8.2 Self-Monitoring
- Before executing any action, verify the "ACT" command has been received
- If uncertainty exists about approval status, re-request "ACT" command
- Maintain an internal approval state tracker to prevent premature execution

### 8.3 Recovery Process
- If execution is accidentally attempted without "ACT" command:
  1. Immediately stop all execution
  2. Apologize for the error
  3. Return to approval waiting state
  4. Re-request "ACT" command to proceed

## 9. Plan/ACT Mode System

### 9.1 Operational Modes
- **Plan Mode**: Default operational state for planning and analysis
  - Used for gathering information, developing plans, and discussing options
  - No actual modifications or actions performed on files/systems
  - Indicated with `# Mode: PLAN` at the beginning of each response
  - Always shows the full updated plan in every response

- **ACT Mode**: Execution state activated only after explicit approval (`ACT` or `AUTO` command)
  - Used for making actual modifications and implementing plans
  - **Single Step Execution (Default, via `ACT`)**: Executes one task or step and then returns to PLAN mode.
  - **Automatic Sequential Execution (via `AUTO`)**: Executes all planned tasks sequentially without further user approval for each step. Continues until the plan is complete, a critical issue/Red status is encountered, or the user manually requests a return to PLAN mode.
  - Indicated with `# Mode: ACT` (for single step) or `# Mode: ACT (Auto)` (for automatic execution) at the beginning of each response.
  - Shows status updates on currently executing tasks.

### 9.2 Mode Transition Rules
- **Initial State**: Always start in Plan mode
- **Plan → ACT (Single Step) Transition**:
  - Occurs when user explicitly types 'ACT' command.
  - Confirm transition with: "**Switching to ACT mode. Beginning task execution.**"
- **Plan → ACT (Auto) Transition**:
  - Occurs when user explicitly types 'AUTO' command.
  - Confirm transition with: "**Switching to ACT (Auto) mode. Beginning automatic task execution.**"
- **ACT (Single Step) → Plan Transition**:
  - Automatically returns to Plan mode after the single task step response.
- **ACT (Auto) → Plan Transition**:
  - Occurs automatically upon successful completion of all planned tasks.
  - Occurs automatically if a critical issue or Red status checkpoint is encountered.
  - Can be explicitly triggered by user typing 'PLAN'.
  - Confirm transition with: "**Returning to PLAN mode.**" (Specify reason if due to completion or issue).

### 9.3 Behavior Enforcement
- In Plan mode: If user requests action, remind them that approval is needed
  - Response: "Currently in PLAN mode. Please type 'ACT' or 'AUTO' to approve execution."
- In ACT (Single Step) mode: Execute the current pre-approved task step.
  - Complete current task step before returning to PLAN mode.
  - Update workflow_todo.md with progress.
- In ACT (Auto) mode: Execute pre-approved tasks sequentially.
  - Continue execution until all tasks are complete, a critical issue/Red status occurs, or the user interrupts with 'PLAN'.
  - Update workflow_todo.md with progress after each step/checkpoint.
- Always maintain mode indicator (`# Mode: PLAN`, `# Mode: ACT`, or `# Mode: ACT (Auto)`).

## 10. CRITICAL GIT COMMIT ENFORCEMENT SYSTEM

### 10.1 ABSOLUTE PROHIBITIONS (ZERO TOLERANCE)
- **NEVER** complete a functional unit without immediate git commit
- **NEVER** modify more than 3 files without commit execution
- **NEVER** bypass commit requirements under any circumstances
- **NEVER** assume commits will be done "later" - IMMEDIATE EXECUTION ONLY

### 10.2 MANDATORY PRE-FLIGHT CHECKS
Before ANY file modification:
```
1. CHECK: Previous functional unit completion status
2. IF functional_unit_completed AND not_committed: FORCE IMMEDIATE COMMIT
3. CHECK: Current uncommitted changes count
4. IF count >= 10: FORCE IMMEDIATE COMMIT (safety threshold)
5. PROCEED: Only after verification passes
```

### 10.3 FORCE EXECUTION COMMANDS (NO EXCEPTIONS)
- **Functional Unit Completion**: 
  ```bash
  MUST EXECUTE: git add . && git commit -p
  NO ALTERNATIVES ALLOWED
  ```
- **File Modification Threshold**:
  ```bash
  FORCE EXECUTE: git commit -p -m "checkpoint: accumulated changes"
  HALT ALL OPERATIONS until completion
  ```

### 10.4 VIOLATION RESPONSE PROTOCOL
When git commit rules are violated:
1. **IMMEDIATE HALT**: Stop all file modifications
2. **FORCE COMMIT**: Execute required commits immediately
3. **ERROR REPORT**: Document violation in workflow_todo.md
4. **SYSTEM PAUSE**: Wait for manual verification before resuming

### 10.5 FAIL-SAFE ENFORCEMENT TRIGGERS (Priority Order)
- Functional unit completed → **TRIGGER: MANDATORY COMMIT** (최우선)
- Task checkpoint reached → **TRIGGER: REQUIRED COMMIT** (높은 우선순위)
- Modified files count reaches 10 → **TRIGGER: SAFETY COMMIT** (보조 안전장치)
- User issues ACT command → **TRIGGER: PRE-FLIGHT COMMIT CHECK**

## 11. ULTRA-CRITICAL COMMIT DEBT PREVENTION

### 11.1 COMMIT DEBT DEFINITION
- ANY uncommitted functional work = COMMIT DEBT
- Maximum allowed debt: ZERO
- Debt accumulation: STRICTLY FORBIDDEN

### 11.2 DEBT PREVENTION MECHANISM (Function-First Approach)
```
BEFORE each file edit:
  // Primary Check: Functional Unit Priority
  IF (functional_unit_completed AND not_committed) {
    BLOCK OPERATION
    EXECUTE git commit -p
    VERIFY commit completed
    THEN proceed
  }
  
  // Secondary Check: Safety Threshold
  IF (modified_files_count >= 10) {
    BLOCK OPERATION
    EXECUTE git commit -p -m "checkpoint: safety threshold reached"
    VERIFY commit completed
    THEN proceed
  }
```

### 11.3 DEBT ELIMINATION PROTOCOL
When debt detected:
1. **IMMEDIATE STOP**: Halt all operations
2. **FORCE RESOLUTION**: Execute all pending commits
3. **VERIFICATION**: Confirm clean git status
4. **RESUME**: Only after complete debt elimination

### 11.4 COMMIT PRIORITY HIERARCHY
1. **FUNCTIONAL UNIT COMPLETION** (최우선)
   - 기능적 완성도가 모든 것보다 우선
   - 논리적 작업 단위 완료 시 즉시 커밋
   - 파일 개수와 무관하게 기능 완료가 기준

2. **TASK CHECKPOINT** (높은 우선순위)
   - 주요 마일스톤 도달 시 필수 커밋
   - 계획된 검증 지점에서 강제 실행

3. **SAFETY THRESHOLD** (보조 안전장치)
   - 10개 파일 수정 시 안전 커밋
   - 기능 단위와 별개로 작동하는 백업 시스템

### 11.5 ABSOLUTE ENFORCEMENT RULES
- **NO WORK** without clean git status
- **NO PROGRESS** with outstanding commits
- **NO EXCEPTIONS** to commit requirements
- **NO BYPASS** mechanisms allowed


테스트를 위한 서버 등 실행은 사용자가 하므로 테스트나 실행하는 방법을 알려주세요
Context7 도구를 통해 항상 최신의 Document를 참조하여 작업해주세요.

## MCP Inspector 기준 코드 원칙
- **절대 금지**: MCP Inspector (`/Users/yun/work/ai/mcp/inspector/`) 폴더 내의 코어 프로세스/로직 수정 절대 금지
- **허용 범위**: 디버깅을 위한 로그성 코드 추가만 허용 (console.log, 디버그 출력 등)
- **금지 범위**: 타임아웃 값 변경, 연결 로직 수정, 에러 처리 개선, 성능 최적화 등 모든 프로세스 개선 코드
- **기준 역할**: MCP Inspector는 MCP 구현의 표준 기준이므로 참조용으로만 사용
- **문제 해결**: Inspector에서 발견되는 문제는 Inspector 수정이 아닌 mcp-orch 프로젝트에서 해결
- **디버깅**: Inspector 로그와 코드는 문제 분석을 위한 참조 자료로만 활용
API/인증 생성시 다음 인증 패턴 가이드기반으로 개발하세요
# Next.js + FastAPI JWT 인증 패턴 가이드

## 개요
이 문서는 Next.js 프론트엔드와 FastAPI 백엔드 간의 JWT 기반 인증 시스템 구현 패턴을 정의합니다. NextAuth.js v5와 FastAPI의 JWT 검증을 통한 안전한 API 통신을 보장합니다.

## 핵심 원칙

### 1. JWT 토큰 기반 인증 필수
- 모든 백엔드 API 호출은 JWT 토큰을 통한 인증 필수
- X-User-ID 헤더나 기타 방식 대신 표준 JWT Bearer 토큰 사용
- NextAuth.js 세션에서 JWT 토큰 생성 후 백엔드로 전달

### 2. Next.js API 라우트 패턴

#### 기본 구조
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getServerJwtToken } from '@/lib/jwt-utils';

const BACKEND_URL = process.env.NEXT_PUBLIC_MCP_API_URL || 'http://localhost:8000';

export const GET = auth(async function GET(req) {
  try {
    // 1. NextAuth.js v5 세션 확인
    if (!req.auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. JWT 토큰 생성 (필수)
    const jwtToken = await getServerJwtToken(req as any);
    
    if (!jwtToken) {
      console.error('❌ Failed to generate JWT token');
      return NextResponse.json({ error: 'Failed to generate authentication token' }, { status: 500 });
    }

    console.log('✅ Using JWT token for backend request');

    // 3. 백엔드 API 호출
    const response = await fetch(`${BACKEND_URL}/api/endpoint`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
```

#### POST 요청 패턴
```typescript
export const POST = auth(async function POST(req) {
  try {
    if (!req.auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const jwtToken = await getServerJwtToken(req as any);
    
    if (!jwtToken) {
      console.error('❌ Failed to generate JWT token for POST');
      return NextResponse.json({ error: 'Failed to generate authentication token' }, { status: 500 });
    }

    const response = await fetch(`${BACKEND_URL}/api/endpoint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
```

### 3. FastAPI 백엔드 패턴

#### JWT 인증 함수
```python
async def get_user_from_jwt_token(request: Request, db: Session) -> Optional[User]:
    """
    Request에서 JWT 토큰을 추출하고 검증한 후 데이터베이스 User 객체를 반환합니다.
    """
    try:
        # Authorization 헤더에서 JWT 토큰 추출
        auth_header = request.headers.get("authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            logger.warning("No valid Authorization header found")
            return None
        
        token = auth_header.split(" ")[1]
        
        # JWT 토큰 검증
        jwt_user = verify_jwt_token(token)
        if not jwt_user:
            logger.warning("JWT token verification failed")
            return None
        
        # 데이터베이스에서 사용자 찾기 또는 생성
        user = db.query(User).filter(User.id == jwt_user.id).first()
        if not user:
            # NextAuth.js 통합: 사용자가 존재하지 않으면 생성
            user = User(
                id=jwt_user.id,
                email=jwt_user.email,
                name=jwt_user.name or jwt_user.email
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            logger.info(f"Created new user from JWT: {user.email}")
        
        return user
        
    except Exception as e:
        logger.error(f"Error getting user from JWT token: {e}")
        return None
```

#### API 엔드포인트 패턴
```python
async def get_current_user_for_api(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    """API용 사용자 인증 함수"""
    user = await get_user_from_jwt_token(request, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    return user

@router.get("/api/endpoint", response_model=List[ResponseModel])
async def list_resources(
    current_user: User = Depends(get_current_user_for_api),
    db: Session = Depends(get_db)
):
    """리소스 목록 조회"""
    # 비즈니스 로직 구현
    pass
```

## 필수 구성 요소

### 1. NextAuth.js 설정
- JWT 전략 사용
- 사용자 정보를 JWT 토큰에 포함
- `getServerJwtToken` 유틸리티 함수 구현

### 2. FastAPI JWT 검증
- `verify_jwt_token` 함수로 토큰 검증
- NextAuth.js 토큰 구조에 맞는 페이로드 파싱
- 사용자 자동 생성 (NextAuth.js 통합)

### 3. 환경 변수
```env
# Next.js
NEXT_PUBLIC_MCP_API_URL=http://localhost:8000
AUTH_SECRET=your-secret-key

# FastAPI
NEXTAUTH_SECRET=your-secret-key
JWT_ALGORITHM=HS256
```

## 보안 고려사항

### 1. 토큰 검증
- 토큰 만료 시간 확인
- 서명 검증 (프로덕션 환경)
- 토큰 구조 유효성 검사

### 2. 에러 처리
- 인증 실패 시 적절한 HTTP 상태 코드 반환
- 민감한 정보 노출 방지
- 로깅을 통한 보안 이벤트 추적

### 3. CORS 설정
- 적절한 CORS 정책 설정
- 프로덕션 환경에서 도메인 제한

## 구현 체크리스트

### Next.js API 라우트
- [ ] `auth()` 래퍼 함수 사용
- [ ] `req.auth` 세션 확인
- [ ] `getServerJwtToken()` 토큰 생성
- [ ] Bearer 토큰으로 백엔드 호출
- [ ] 적절한 에러 처리

### FastAPI 백엔드
- [ ] JWT 토큰 추출 및 검증
- [ ] 사용자 인증 dependency 함수
- [ ] 데이터베이스 사용자 조회/생성
- [ ] 적절한 HTTP 상태 코드 반환

### 공통
- [ ] 환경 변수 설정
- [ ] 로깅 구현
- [ ] 에러 처리 표준화
- [ ] 보안 헤더 설정

## 예제 참조
- Teams API: `mcp-orch/web/src/app/api/teams/route.ts`
- Projects API: `mcp-orch/web/src/app/api/projects/route.ts`
- JWT Auth: `mcp-orch/src/mcp_orch/api/jwt_auth.py`
- Projects Backend: `mcp-orch/src/mcp_orch/api/projects.py`

이 패턴을 따라 새로운 API 엔드포인트를 구현하면 일관된 인증 시스템을 유지할 수 있습니다.

# 프론트엔드 개발 지침

## 컴포넌트 분리 및 구조화 원칙

### 분리 기준
- **500줄 이상**: 분리 검토 필요
- **1000줄 이상**: 반드시 분리 실행
- **단일 책임 원칙**: 각 컴포넌트는 하나의 역할만 담당

### 실용적 분리 패턴

#### 1. 탭 기반 페이지 분리 구조
```
/components/[feature]/[page]/
  ├── [Feature]Header.tsx          (헤더 및 액션 버튼들)
  ├── [Feature][Tab]Tab.tsx        (각 탭별 독립 컴포넌트)
  ├── components/                  (하위 공통 컴포넌트)
  │   ├── [Feature]StatusBadge.tsx
  │   ├── [Feature]ControlButtons.tsx
  │   └── [Feature]ConfigDisplay.tsx
  ├── hooks/                       (커스텀 훅)
  │   ├── use[Feature]Data.ts      (데이터 로드/상태 관리)
  │   ├── use[Feature]Actions.ts   (액션 핸들러)
  │   └── use[Feature]Tools.ts     (도구 관련 로직)
  └── index.ts                     (export 통합)
```

#### 2. 예시: 서버 상세 페이지 (1046줄 → 분리)
```
/components/servers/detail/
  ├── ServerHeader.tsx             (~100줄 - 헤더, 상태, 액션 버튼)
  ├── ServerOverviewTab.tsx        (~200줄 - 서버 정보, 설정 표시)
  ├── ServerToolsTab.tsx           (~150줄 - 도구 목록, 테스트 기능)
  ├── ServerUsageTab.tsx           (~150줄 - 사용 통계, 세션 정보)
  ├── ServerLogsTab.tsx            (~50줄 - 로그 표시)
  ├── ServerSettingsTab.tsx        (~100줄 - 편집, 삭제 기능)
  ├── components/
  │   ├── ServerStatusBadge.tsx    (재사용 가능한 상태 뱃지)
  │   ├── ServerControlButtons.tsx (활성화/재시작/삭제 버튼 그룹)
  │   └── ServerConfigDisplay.tsx  (JSON 설정 표시 컴포넌트)
  └── hooks/
      ├── useServerDetail.ts       (서버 정보 로드/업데이트)
      ├── useServerActions.ts      (토글/재시작/삭제 핸들러)
      └── useServerTools.ts        (도구 로드/실행 로직)
```

### 바이브 코딩 최적화 원칙

#### 1. 명확한 인터페이스 정의
```typescript
interface ServerTabProps {
  server: ServerDetail;
  projectId: string;
  canEdit: boolean;
  onServerUpdate: (server: ServerDetail) => void;
}
```

#### 2. 로직과 UI 분리
- **커스텀 훅**: 비즈니스 로직, API 호출, 상태 관리
- **컴포넌트**: UI 렌더링, 사용자 상호작용에만 집중

#### 3. 재사용 가능한 작은 단위
- `StatusBadge`, `ControlButtons` 같은 컴포넌트는 프로젝트 전반에서 활용
- 공통 패턴을 별도 컴포넌트로 추출

#### 4. 병렬 개발 지원
- 각 탭은 독립적으로 개발/수정 가능
- Props 인터페이스만 맞추면 다른 개발자와 충돌 없음

### 컴포넌트 분리 체크리스트

#### 분리 전 분석
- [ ] 현재 파일 라인 수 확인 (500줄+ 시 분리 검토)
- [ ] 주요 섹션별 기능 분석 (탭, 헤더, 사이드바 등)
- [ ] 반복되는 UI 패턴 식별
- [ ] 공통 로직과 상태 파악

#### 분리 실행
- [ ] 각 탭/섹션을 독립 컴포넌트로 생성
- [ ] 공통 UI 요소는 별도 컴포넌트로 추출
- [ ] 비즈니스 로직은 커스텀 훅으로 분리
- [ ] Props 인터페이스 명확히 정의
- [ ] 메인 페이지는 200줄 이하로 축소

#### 분리 후 검증
- [ ] 각 컴포넌트는 300줄 이하 권장
- [ ] 단일 책임 원칙 준수 확인
- [ ] 재사용 가능한 컴포넌트 식별
- [ ] TypeScript 타입 안정성 확인
- [ ] 테스트 작성 용이성 검토

### 실제 적용 예시

#### Before (1046줄 - 비추천)
```typescript
export default function ProjectServerDetailPage() {
  // 수많은 상태와 핸들러들... (300줄)
  // 헤더 렌더링... (100줄)
  // 탭 1 렌더링... (200줄)
  // 탭 2 렌더링... (150줄)
  // 탭 3 렌더링... (150줄)
  // 탭 4 렌더링... (50줄)
  // 탭 5 렌더링... (100줄)
  // 모달들... (30줄)
}
```

#### After (200줄 - 추천)
```typescript
export default function ProjectServerDetailPage() {
  const { server, isLoading } = useServerDetail(projectId, serverId);
  const { canEdit } = useProjectPermissions(projectId);
  
  if (isLoading) return <LoadingSpinner />;
  if (!server) return <NotFound />;

  return (
    <div className="container mx-auto p-6">
      <ServerHeader 
        server={server} 
        projectId={projectId}
        canEdit={canEdit}
        onServerUpdate={handleServerUpdate}
      />
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>...</TabsList>
        
        <TabsContent value="overview">
          <ServerOverviewTab server={server} />
        </TabsContent>
        
        <TabsContent value="tools">
          <ServerToolsTab 
            server={server}
            projectId={projectId}
          />
        </TabsContent>
        
        {/* 기타 탭들... */}
      </Tabs>
    </div>
  );
}
```

### 추가 고려사항

- **점진적 적용**: 기존 큰 컴포넌트는 단계적으로 분리
- **일관성 유지**: 프로젝트 전반에서 동일한 패턴 적용
- **문서화**: 각 컴포넌트의 역할과 Props를 명확히 문서화
- **성능 최적화**: React.memo, useMemo 등을 적절히 활용

이 지침을 따르면 유지보수하기 쉽고 확장 가능한 컴포넌트 구조를 만들 수 있습니다.

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.