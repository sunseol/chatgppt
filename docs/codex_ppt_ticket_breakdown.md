# DeckForge 전체 작업 티켓 백로그

- 기준 문서: `docs/codex_ppt_prd.md`
- 범위: MVP 전체 + PRD에 명시된 Post-MVP/장기 확장 백로그
- 작성일: 2026-06-17
- 티켓 상태 기본값: `Backlog`

---

## 티켓 규칙

### 우선순위

| 우선순위 | 의미 |
|---|---|
| P0 | Technical MVP blocker. 없으면 end-to-end MVP가 성립하지 않음 |
| P1 | Release quality gate. Technical MVP는 가능하지만 사용자 테스트/비공개 베타 전에 필요 |
| P2 | Beta polish. 초기 사용자 테스트 후 개선 가능 |
| P3 | Post-MVP 또는 장기 확장 백로그 |

P0는 Technical MVP 차단 요소를 뜻한다. 개발 착수 순서는 P0 전체 목록이 아니라 `Vertical Slice 0 티켓 목록`을 우선한다.

### 크기

| 크기 | 의미 |
|---|---|
| S | 0.5~1일 |
| M | 1~3일 |
| L | 3~7일 |
| XL | 1주 이상 또는 분할 필요 |

### 공통 완료 기준

- PRD의 승인 기반 상태머신을 깨지 않는다.
- 산출물은 로컬 프로젝트 폴더에 버전과 해시를 가진 파일로 저장된다.
- 상위 산출물이 변경되면 하위 산출물은 `invalidated` 처리된다.
- 민감 정보는 프론트엔드 상태, 로그, 프로젝트 파일에 저장되지 않는다.
- 주요 기능은 Mock Provider로 테스트 가능해야 한다.
- 변경 범위에 맞는 unit, integration, e2e, manual QA 증거가 남아야 한다.

---

## 마일스톤 개요

| 마일스톤 | 목표 | 주요 산출물 |
|---|---|---|
| M0. Product & Repo Foundation | 실행 가능한 앱 뼈대와 개발 착수 기준 확정 | Tauri 앱, 저장소/DB, benchmark seed, mock vertical slice |
| M1. Workflow Harness | 승인 기반 상태머신과 산출물 저장 기반 | WorkflowEngine, ArtifactStore, minimal AuditLog |
| M2. Auth & Provider Layer | Codex/ChatGPT 연결과 Provider Adapter | Runtime discovery, CodexProvider, Image Provider spike, Job Manager |
| M3. Interview + Research + Planning | 생성 전 의미/근거/기획 확정 | Interview Brief, Research Pack, Deck Plan |
| M4. Design + Layout IR + HTML Preview | 디자인 시스템과 레이아웃 기준선 승인 | Design System, Layout IR, deterministic HTML/CSS, layout PNG, DOM layers |
| M5. Slide Generation + Review | 병렬 이미지 생성과 수정 승인 | Slide PNGs, revision history, consistency QA |
| M6. Editable Overlay + Editor | 편집 가능한 결과물 변환 및 편집 | Generated background, editable overlays, SVG/Layer Model, Canvas Editor |
| M7. Export + Report + QA | 내보내기, 최종 보고, MVP 점수 검증 | PNG/SVG/PPTX, Generation Report, benchmark results |
| M8. Post-MVP Expansion | PRD의 V1 이후 확장 | Brand Kit, Figma/Canva, collaboration |

---

## 개발 착수 전략

### Phase A. 기술 불확실성 제거

개발 착수 전 또는 초기에 다음 리스크를 먼저 검증한다.

```text
1. Tauri 앱 스캐폴드
2. 로컬 저장소/ArtifactStore 최소 구현
3. Codex runtime/auth spike
4. Image generation provider spike
5. Layout IR + deterministic HTML renderer spike
6. Generated background + editable overlay spike
7. Mock 기반 happy path E2E
```

### Phase B. Mock 기반 전체 관통

진짜 AI 품질 전에 다음 세로 슬라이스를 먼저 관통한다.

```text
초기 프롬프트
→ mock interview
→ mock research
→ mock deck plan
→ mock design system
→ layout IR
→ HTML preview
→ mock generated background
→ editable overlay
→ editor text 수정
→ PNG/SVG export
→ Generation Report
```

### Phase C. 실제 AI 단계 교체

Mock으로 검증된 단계부터 실제 provider로 교체한다.

```text
interview real
→ deck plan real
→ design system real
→ layout IR real
→ image generation real
→ revision real
```

### Phase D. 조사/팩트 품질 강화

Research는 세로 슬라이스 이후 품질을 단계적으로 올린다.

```text
research source policy
→ source fetcher
→ evidence extraction
→ dataset normalization
→ source map
→ fact checking
→ report citation
```

### Vertical Slice 0 완료 기준

- Mock Provider만으로 프로젝트 생성부터 Generation Report까지 관통한다.
- 각 단계 산출물이 artifact id, version, hash를 가진다.
- 승인 게이트와 downstream invalidation이 최소 한 번 이상 검증된다.
- HTML은 AI가 직접 생성하지 않고 Layout IR을 deterministic renderer가 HTML/CSS로 변환한다.
- 최종 미리보기는 generated background + editable overlay 구조를 사용한다.
- PNG/project export와 보고서가 생성된다. SVG export는 바로 다음 단계에서 붙인다.

---

## E0. Product & Repo Foundation

### DF-001. Tauri v2 데스크탑 앱 스캐폴드

- Priority: P0
- Size: M
- PRD Ref: §6.1, §20.1
- Depends on: 없음
- Scope: macOS 우선 Tauri v2 앱, Rust backend, TypeScript frontend 기본 구조를 만든다.
- Acceptance Criteria:
  - 앱이 로컬에서 실행된다.
  - 기본 창, 라우팅, 빈 워크스페이스 화면이 표시된다.
  - Rust command 호출 샘플이 동작한다.
- Verification:
  - `tauri dev` 또는 동등한 개발 실행 명령 성공
  - 기본 smoke test 통과

### DF-002. 프론트엔드 프레임워크와 UI 기본 구조 확정

- Priority: P0
- Size: M
- PRD Ref: §6.1, §16.1
- Depends on: DF-001
- Scope: React 또는 Svelte 중 하나를 확정하고 Stepper, Main Work Area, Bottom Gate 레이아웃을 구성한다.
- Acceptance Criteria:
  - 좌측 단계 Stepper가 0~9 단계까지 표시된다.
  - 현재 단계에 따라 Main Work Area가 바뀐다.
  - 하단 승인 게이트 영역이 모든 단계에서 동일하게 노출된다.
- Verification:
  - 데스크탑 창에서 단계 전환 UI 수동 확인
  - 기본 UI snapshot 또는 component test 통과

### DF-003. Rust/TypeScript 품질 게이트 설정

- Priority: P0
- Size: M
- PRD Ref: §17.3, §20.2
- Depends on: DF-001
- Scope: format, lint, typecheck, unit test, integration test 실행 스크립트를 정의한다.
- Acceptance Criteria:
  - 한 명령으로 Rust/TS 검증을 실행할 수 있다.
  - CI 없이도 로컬 검증 절차가 README 또는 개발 문서에 기록된다.
  - 실패 로그가 원인 파악 가능한 수준으로 출력된다.
- Verification:
  - format/lint/typecheck/test 명령 실행 결과 0

### DF-004. 로컬 프로젝트 폴더 스키마 정의

- Priority: P0
- Size: M
- PRD Ref: §10.3
- Depends on: DF-001
- Scope: `/projects/{project_id}` 하위 briefs, research, plans, design, layout_prototypes, contexts, slides, exports 폴더 구조를 생성한다.
- Acceptance Criteria:
  - 새 프로젝트 생성 시 PRD의 저장소 구조가 생성된다.
  - 프로젝트 파일에는 인증 정보가 포함되지 않는다.
  - 폴더 구조 버전이 명시된다.
- Verification:
  - 임시 프로젝트 생성 후 파일 트리 비교 테스트

### DF-004A. Local Metadata DB와 Migration 시스템

- Priority: P0
- Size: M
- PRD Ref: §6.1, §10.3
- Depends on: DF-004
- Scope: 프로젝트 목록, artifact index, job state, approval state, audit index를 저장하는 SQLite 또는 동등한 로컬 DB를 정의한다.
- Acceptance Criteria:
  - schema version과 migration이 존재한다.
  - 프로젝트 파일만 있고 DB가 손상된 경우 artifact index 재구성이 가능하다.
  - migration 실패 시 프로젝트 원본 파일은 손상되지 않는다.
- Verification:
  - DB migration test
  - corrupted index rebuild test

### DF-005. 개발용 Mock Provider 세트 준비

- Priority: P0
- Size: M
- PRD Ref: §6.2, §17.3
- Depends on: DF-003
- Scope: 실제 Codex/OpenAI 호출 없이 전체 워크플로우를 테스트할 수 있는 deterministic mock 응답을 만든다.
- Acceptance Criteria:
  - 인터뷰, 조사, 덱 플랜, 디자인 시스템, HTML 레이아웃, 이미지 생성, 변환 mock이 존재한다.
  - 같은 입력에 같은 출력이 생성된다.
  - 실패 케이스 mock을 선택할 수 있다.
- Verification:
  - Mock Provider 기반 happy path integration test

### DF-006. MVP Benchmark Seed Set 작성

- Priority: P0
- Size: M
- PRD Ref: §17.1, §23
- Depends on: 없음
- Scope: 전체 30개 benchmark 전에 초기 10개 seed benchmark를 작성한다.
- Acceptance Criteria:
  - 데이터 중심, 한글 중심, 디자인 중심, 수정 중심, 오류 유도 케이스를 포함한다.
  - 각 benchmark는 기대 산출물, 실패 조건, 검증 포인트를 가진다.
  - 인터뷰, 조사, 기획, 디자인, Layout IR, 이미지 생성 개발의 공통 기준으로 사용할 수 있다.
- Verification:
  - benchmark seed manifest review

### DF-007A. Mock Vertical Slice 0 Harness Skeleton

- Priority: P0
- Size: M
- PRD Ref: §7, §20
- Depends on: DF-005, DF-006
- Scope: mock scenario runner, fixture loader, artifact snapshot 구조를 만든다.
- Acceptance Criteria:
  - seed benchmark fixture를 읽어 mock scenario를 시작할 수 있다.
  - 단계별 fixture output과 artifact snapshot을 저장할 수 있다.
  - 후속 구현 티켓이 이 하네스에 실제 모듈을 점진적으로 연결할 수 있다.
- Verification:
  - harness skeleton smoke test

### DF-007B. Mock Vertical Slice 0 Full Pass

- Priority: P0
- Size: L
- PRD Ref: §7, §20
- Depends on: DF-007A, DF-010, DF-011, DF-012, DF-013, DF-013A, DF-014, DF-015A, DF-020, DF-030, DF-060, DF-069, DF-070, DF-072A, DF-073, DF-074, DF-089, DF-096, DF-110, DF-111A, DF-120, DF-122, DF-124, DF-130A, DF-140, DF-141
- Scope: Mock Provider로 프로젝트 생성부터 report/export까지 실제로 관통하는 세로 슬라이스를 완성한다.
- Acceptance Criteria:
  - 실제 AI 품질 없이 전체 상태 전이를 검증한다.
  - mock interview, research, deck plan, design system, Layout IR, generated background, editable overlay, editor text edit, PNG/project export, mock report artifact가 모두 연결된다.
  - 승인 게이트와 downstream invalidation이 최소 한 번 이상 검증된다.
- Verification:
  - Vertical Slice 0 full pass test

---

## E1. Workflow Harness

### DF-010. WorkflowEngine 상태머신 구현

- Priority: P0
- Size: L
- PRD Ref: §7.2
- Depends on: DF-004
- Scope: `PROJECT_CREATED`부터 `EXPORT_READY`까지 상태 전이를 구현한다.
- Acceptance Criteria:
  - 승인 없이 다음 단계로 이동할 수 없다.
  - 수정 요청 시 같은 단계 또는 허용된 상위 단계로만 이동한다.
  - 상태는 앱 재시작 후 복구된다.
- Verification:
  - State Machine Test
  - 앱 재시작 복구 테스트

### DF-011. Approval Gate Manager 구현

- Priority: P0
- Size: M
- PRD Ref: §7.3, §16.2
- Depends on: DF-010
- Scope: 단계별 승인 버튼, 승인 해시 저장, 승인 로그 작성을 담당한다.
- Acceptance Criteria:
  - 승인 버튼 문구가 승인 대상과 다음 단계를 명확히 표시한다.
  - 승인 시 artifact hash가 저장된다.
  - 승인 전 다음 단계 실행 버튼은 비활성화된다.
- Verification:
  - Approval Gate unit test
  - UI manual QA

### DF-012. Downstream invalidation 정책 구현

- Priority: P0
- Size: M
- PRD Ref: §7.3, §9.5
- Depends on: DF-010, DF-011
- Scope: 상위 산출물 변경 시 하위 산출물을 자동 `invalidated` 처리한다.
- Acceptance Criteria:
  - Interview 수정 시 Research 이후 산출물이 무효화된다.
  - Design System 수정 시 HTML Layout Prototype 이후 산출물이 무효화된다.
  - HTML Layout Prototype 수정 시 Deck Context 이후 산출물이 무효화된다.
- Verification:
  - Context Hash Test
  - invalidated 산출물 export 차단 테스트

### DF-013. ArtifactStore 구현

- Priority: P0
- Size: L
- PRD Ref: §10.2, §10.3
- Depends on: DF-004
- Scope: 산출물 저장, 버전 관리, 해시 계산, 파일 참조를 담당한다.
- Acceptance Criteria:
  - 모든 산출물은 artifact id, version, hash를 가진다.
  - 산출물 조회 API는 현재 승인 버전과 최신 버전을 구분한다.
  - 손상된 산출물은 오류로 표시된다.
- Verification:
  - artifact write/read/hash unit test
  - 손상 파일 복구/오류 표시 테스트

### DF-013A. Atomic Write & Project Locking 구현

- Priority: P0
- Size: M
- PRD Ref: §10.3, §20.2
- Depends on: DF-013
- Scope: 산출물 저장 중 앱 종료/크래시가 발생해도 프로젝트가 깨지지 않도록 atomic write와 project lock을 적용한다.
- Acceptance Criteria:
  - 산출물 저장은 temp file + fsync + atomic rename 방식 또는 동등한 안전성을 가진다.
  - 같은 프로젝트를 중복으로 열면 lock 경고가 표시된다.
  - 중단된 write는 앱 재시작 시 복구 또는 폐기된다.
- Verification:
  - interrupted write test
  - concurrent open lock test

### DF-014. ContextGraph 구현

- Priority: P0
- Size: L
- PRD Ref: §9.1, §9.5
- Depends on: DF-012, DF-013
- Scope: Brief, Research, Deck Plan, Design System, HTML Layout Prototype, Deck Context, Slide 간 참조 그래프를 관리한다.
- Acceptance Criteria:
  - 각 산출물은 upstream/downstream 관계를 가진다.
  - 특정 산출물의 변경 영향 범위를 계산할 수 있다.
  - 최종 보고서에 산출물 lineage를 제공할 수 있다.
- Verification:
  - graph traversal unit test
  - lineage snapshot test

### DF-015A. Minimal Audit Event Log

- Priority: P0
- Size: M
- PRD Ref: §15.4
- Depends on: DF-011, DF-013
- Scope: MVP 보고서와 디버깅에 필요한 최소 감사 이벤트를 JSONL로 기록한다.
- Acceptance Criteria:
  - approval, provider job summary, artifact hash, stage transition이 기록된다.
  - event id, timestamp, stage, artifact id/hash가 포함된다.
  - 토큰, API Key, Authorization 헤더는 기록되지 않는다.
- Verification:
  - minimal audit event snapshot test
  - secret redaction smoke test

### DF-015. Full Audit Log Redaction & Report Integration

- Priority: P1
- Size: M
- PRD Ref: §15.4
- Depends on: DF-015A
- Scope: 최소 감사 로그를 확장해 재생성, 수정, export, provider 사용량 요약, 보고서 통합까지 완성한다.
- Acceptance Criteria:
  - 주요 이벤트에 trace id와 관련 artifact lineage가 연결된다.
  - 비용/사용량 요약은 민감정보 없이 기록된다.
  - 최종 보고서가 감사 로그를 참조한다.
- Verification:
  - redaction unit test
  - audit event snapshot test

---

## E2. Auth & Provider Layer

### DF-019. Codex Runtime Discovery & Version Pinning

- Priority: P0
- Size: M
- PRD Ref: §6.2, §10.1
- Depends on: DF-001
- Scope: 로컬 Codex CLI/SDK/App Server 사용 가능 여부, 버전, 실행 경로, 권한을 확인한다.
- Acceptance Criteria:
  - Codex runtime이 없거나 버전이 맞지 않으면 사용자에게 해결 경로를 제공한다.
  - renderer는 runtime 경로나 auth 파일에 직접 접근하지 않는다.
  - 지원되는 runtime version 범위가 명시된다.
- Verification:
  - runtime discovery test
  - missing runtime manual QA

### DF-020. Provider Adapter 인터페이스 정의

- Priority: P0
- Size: M
- PRD Ref: §6.2
- Depends on: DF-005
- Scope: CodexProvider, OpenAIImageProvider, MockProvider, LocalProvider 공통 인터페이스를 정의한다.
- Acceptance Criteria:
  - 텍스트 작업, 이미지 생성, 수정 생성, health check가 분리된다.
  - Provider별 기능 차이를 표현할 수 있다.
  - MockProvider가 같은 인터페이스를 구현한다.
- Verification:
  - provider contract test

### DF-021. Codex/ChatGPT 연결 상태 확인

- Priority: P0
- Size: M
- PRD Ref: §6.2, §8.2
- Depends on: DF-020
- Scope: 앱 시작 시 Codex 로그인 상태를 확인하고 UI에 표시한다.
- Acceptance Criteria:
  - 로그인 전 AI 실행 단계가 잠긴다.
  - 로그인 후 CodexProvider health check가 통과한다.
  - 실패 시 재시도 경로와 오류 설명이 표시된다.
- Verification:
  - auth status mock integration test
  - 로그인 실패 manual QA

### DF-022. Codex CLI/SDK 실행 어댑터 구현

- Priority: P0
- Size: L
- PRD Ref: §6.2, §10.1
- Depends on: DF-019, DF-020, DF-021
- Scope: Rust backend에서 Codex CLI/SDK 또는 App Server를 호출하는 어댑터를 구현한다.
- Acceptance Criteria:
  - renderer가 auth 파일을 직접 읽지 않는다.
  - long-running 작업은 Provider Job Manager를 통해 progress와 cancellation을 노출한다.
  - stdout/stderr에는 민감 정보가 redaction된다.
- Verification:
  - CLI 호출 integration test
  - 민감정보 로그 검사

### DF-023A. Image Generation Auth Feasibility Spike

- Priority: P0
- Size: M
- PRD Ref: §6.2, §6.3
- Depends on: DF-019, DF-020
- Scope: Codex/ChatGPT OAuth 세션으로 이미지 생성이 가능한지, 별도 API Key가 필요한지, 사용자 인증 UX를 어떻게 분리할지 검증한다.
- Acceptance Criteria:
  - 실제 이미지 생성 경로 1개가 확정된다.
  - 불가능한 경로는 명시적으로 제외된다.
  - DF-092가 의존할 concrete provider가 정해진다.
  - 인증/과금/권한 차이가 제품 문구로 정리된다.
- Verification:
  - provider feasibility note
  - one successful image generation path or explicit fallback decision

### DF-023. OpenAIImageProvider fallback 설계 및 구현

- Priority: P1
- Size: L
- PRD Ref: §6.2, §6.3
- Depends on: DF-023A
- Scope: 이미지 생성이 Codex 세션으로 불가능할 때 API Key 기반 fallback을 제공한다.
- Acceptance Criteria:
  - fallback 모드는 명시적으로 구분된다.
  - API Key는 프로젝트 파일이나 프론트엔드 상태에 저장되지 않는다.
  - 이미지 생성 권한/과금 차이가 UI에 표시된다.
- Verification:
  - secret storage test
  - fallback provider contract test

### DF-024. Provider 기능 매트릭스 UI 구현

- Priority: P2
- Size: M
- PRD Ref: §6.2
- Depends on: DF-021, DF-023A
- Scope: 현재 인증 방식에서 가능한 기능과 잠긴 기능을 사용자에게 보여준다.
- Acceptance Criteria:
  - 텍스트 기획, 조사 보조, 이미지 생성, 수정 생성 가능 여부가 표시된다.
  - 불가능한 기능은 이유와 해결 경로를 제공한다.
- Verification:
  - provider capability UI test

### DF-025. Provider Job Manager 구현

- Priority: P0
- Size: L
- PRD Ref: §16.3, §20.2
- Depends on: DF-015A, DF-020
- Scope: 모든 AI 작업을 `job_id` 기반으로 실행하고 timeout, retry, cancellation, progress, partial result, crash recovery를 관리한다.
- Acceptance Criteria:
  - 장시간 작업 중 앱을 닫아도 작업 상태가 손상되지 않는다.
  - 실패한 provider 작업은 재시도 가능하다.
  - 비용/사용량 요약이 audit log에 민감정보 없이 기록된다.
  - progress/cancel UI가 참조할 수 있는 job 상태 API를 제공한다.
- Verification:
  - provider job lifecycle test
  - crash recovery job test

---

## E3. Project Creation & Interview

### DF-030. 새 프로젝트 생성 플로우

- Priority: P0
- Size: M
- PRD Ref: §8.1
- Depends on: DF-004, DF-010
- Scope: 프로젝트명, 초기 프롬프트, 화면 비율, 언어, 예상 슬라이드 수를 입력받아 프로젝트를 생성한다.
- Acceptance Criteria:
  - 생성 직후 상태는 `PROJECT_CREATED`다.
  - 인터뷰 단계 외 다른 단계는 비활성화된다.
  - 앱 재시작 후 프로젝트 목록에서 다시 열 수 있다.
- Verification:
  - project creation integration test
  - restart manual QA

### DF-031. 인터뷰 질문 생성기 구현

- Priority: P0
- Size: L
- PRD Ref: §8.3
- Depends on: DF-020, DF-030
- Scope: 초기 프롬프트 기반으로 목적, 청중, 결과, 메시지, 톤, 필수/금지 요소를 수집하는 질문을 생성한다.
- Acceptance Criteria:
  - 필수 필드 누락 시 추가 질문을 생성한다.
  - 충돌하거나 모호한 요구는 `open_questions`로 표시한다.
  - 사용자의 명시 지시가 브리프에 반영된다.
- Verification:
  - 5개 테스트 프롬프트 interview extraction test

### DF-032. Interview Brief 스키마와 저장 구현

- Priority: P0
- Size: M
- PRD Ref: §8.3
- Depends on: DF-013, DF-031
- Scope: 승인 가능한 Interview Brief JSON을 저장하고 버전 관리한다.
- Acceptance Criteria:
  - 목적, 청중, desired outcome, slide count, language, tone, must include/avoid, success criteria가 저장된다.
  - 승인된 브리프는 immutable artifact로 잠긴다.
- Verification:
  - schema validation test
  - approval immutability test

### DF-033. 인터뷰 UI와 승인/수정 UX

- Priority: P0
- Size: L
- PRD Ref: §8.3, §16.2
- Depends on: DF-011, DF-032
- Scope: 질문/답변 UI, 브리프 미리보기, 수정 요청, 승인 버튼을 구현한다.
- Acceptance Criteria:
  - 사용자는 브리프를 승인하거나 수정 요청할 수 있다.
  - 승인 전 조사 단계로 넘어갈 수 없다.
  - 승인 버튼 문구는 `인터뷰 결과를 승인하고 조사 시작`이다.
- Verification:
  - UI integration test
  - manual approval gate test

### DF-034. Project Asset Import MVP

- Priority: P1
- Size: L
- PRD Ref: §8.1, §10.3, §15.1
- Depends on: DF-004, DF-013
- Scope: 이미지, PDF, CSV/XLSX, 텍스트 파일을 프로젝트 에셋으로 추가한다.
- Acceptance Criteria:
  - 업로드된 파일은 artifact id/hash를 가진다.
  - 조사, 덱 플랜, 디자인 시스템에서 참조 가능하다.
  - 민감 파일은 외부 provider로 보내기 전 사용자에게 명시된다.
- Verification:
  - asset import integration test
  - artifact hash test

### DF-035. Logo/Image Asset Placement

- Priority: P1
- Size: M
- PRD Ref: §8.5, §8.6
- Depends on: DF-034
- Scope: 사용자가 제공한 로고/이미지를 Design System 또는 Slide Spec에 안전하게 반영한다.
- Acceptance Criteria:
  - 로고와 제품 이미지는 source asset id를 유지한다.
  - 이미지 provider에 전달할지 여부를 사용자가 확인할 수 있다.
  - 임의 생성 로고보다 사용자 제공 asset을 우선한다.
- Verification:
  - asset placement test

---

## E4. Research & Fact Foundation

### DF-040. Research Pack 스키마 정의

- Priority: P0
- Size: M
- PRD Ref: §8.4, §12.1
- Depends on: DF-013, DF-032
- Scope: sources.json, claims.json, datasets, charts, fact_check_report.md 구조를 정의한다.
- Acceptance Criteria:
  - Source 등급, Claim confidence, dataset id, slide candidates를 표현한다.
  - 주요 수치에는 단위, 기준연도, 지역, 정의가 포함된다.
  - 불확실한 항목은 `uncertain`으로 표시된다.
- Verification:
  - research schema validation test

### DF-041. Research Orchestrator MVP

- Priority: P0
- Size: L
- PRD Ref: §8.4, §12.1
- Depends on: DF-020, DF-040, DF-041A, DF-041B, DF-041C
- Scope: Source Policy, Fetcher, Evidence Extractor, Validator 호출 순서를 연결하고 Research Pack artifact를 생성한다.
- Acceptance Criteria:
  - 정부, 국제기구, 연구기관, 공식자료를 우선한다.
  - 출처 없는 핵심 주장은 슬라이드 기획에 사용할 수 없다.
  - 상충 자료는 최소한 review required로 표시한다.
- Verification:
  - benchmark research pack generation
  - Source Map Test

### DF-041A. Research Source Policy 정의

- Priority: P0
- Size: M
- PRD Ref: §8.4, §12.1
- Depends on: DF-040
- Scope: 정부, 국제기구, 학술기관, 기업 공식자료, 언론, 블로그 등 source 등급과 사용 가능 조건을 정의한다.
- Acceptance Criteria:
  - source type별 신뢰 등급과 금지 조건이 정의된다.
  - 주요 주장과 주요 수치에 허용되는 source 등급이 명시된다.
  - 불확실한 정보의 표시 규칙이 포함된다.
- Verification:
  - source policy review

### DF-041B. Web/PDF/Data Source Fetcher 구현

- Priority: P0
- Size: L
- PRD Ref: §8.4, §12.1
- Depends on: DF-041A
- Scope: 웹페이지, PDF, CSV/XLSX, 공식 API 등 source type별 수집기를 구현한다.
- Acceptance Criteria:
  - fetch 결과는 원문, URL/파일 경로, fetch timestamp, source type을 가진다.
  - 실패한 fetch는 재시도 가능 상태로 기록된다.
  - 외부 전송 전 사용자 제공 민감 파일 여부를 확인할 수 있다.
- Verification:
  - source fetcher integration test

### DF-041C. Evidence Extractor 구현

- Priority: P0
- Size: L
- PRD Ref: §8.4, §12.2
- Depends on: DF-041A, DF-041B
- Scope: source에서 claim, number, unit, year, geography, definition, quote span을 추출한다.
- Acceptance Criteria:
  - 각 evidence는 source_id와 quote span 또는 table reference를 가진다.
  - 단위, 기준연도, 지역, 정의가 누락된 수치는 review required로 표시된다.
  - 추출 결과는 Claim/Source/Dataset 검증기로 전달된다.
- Verification:
  - evidence extraction benchmark

### DF-041D. Dataset Normalizer 구현

- Priority: P1
- Size: L
- PRD Ref: §12.3
- Depends on: DF-041C
- Scope: 차트용 데이터를 표준 dataset schema로 정리한다.
- Acceptance Criteria:
  - CSV/XLSX/table/API 데이터를 공통 dataset schema로 변환한다.
  - 단위, 기간, 지역, 결측치 처리 규칙을 저장한다.
  - 차트 metadata와 연결된다.
- Verification:
  - dataset normalization test

### DF-041E. Citation Renderer 구현

- Priority: P1
- Size: M
- PRD Ref: §8.14, §12.1
- Depends on: DF-041A, DF-041C
- Scope: 슬라이드 하단 출처, Generation Report, Source Map에 쓸 citation format을 생성한다.
- Acceptance Criteria:
  - source type별 citation format이 정의된다.
  - 슬라이드용 짧은 출처와 보고서용 상세 출처를 모두 생성한다.
  - 불확실하거나 낮은 등급 source는 명확히 표시된다.
- Verification:
  - citation snapshot test

### DF-042. Claim/Source/Dataset 검증기 구현

- Priority: P0
- Size: L
- PRD Ref: §12.2
- Depends on: DF-040, DF-041
- Scope: 핵심 주장과 수치가 적절한 source_id, dataset_id, assumption_id를 가지는지 검증한다.
- Acceptance Criteria:
  - 출처 없는 사실 주장 생성 시 실패 처리한다.
  - 가설은 사실처럼 표현되지 않도록 label_required를 요구한다.
  - 주요 수치 오류는 치명 결함으로 분류된다.
- Verification:
  - fact checker unit test
  - 오류 유도 benchmark

### DF-043A. Basic Chart Overlay MVP

- Priority: P0
- Size: M
- PRD Ref: §12.3, §8.11
- Depends on: DF-040, DF-042, DF-053A
- Scope: bar/line chart 2종만 데이터 기반 overlay layer로 렌더링한다.
- Acceptance Criteria:
  - 차트는 dataset_id, unit, period, source_id를 가진다.
  - 이미지 모델이 만든 가짜 차트는 최종 레이어로 사용하지 않는다.
  - Layout IR의 chart placeholder와 연결된다.
- Verification:
  - basic chart overlay test

### DF-043. 차트 데이터 준비 파이프라인

- Priority: P1
- Size: L
- PRD Ref: §12.3
- Depends on: DF-043A
- Scope: 원천 데이터 기반 chart metadata, 다중 chart type, dataset normalization, placeholder 정보를 확장한다.
- Acceptance Criteria:
  - 차트는 이미지 모델이 임의로 그리지 않는다.
  - 차트 metadata에는 dataset, 단위, 기준연도, 출처가 저장된다.
  - HTML Layout Prototype과 최종 레이어에서 같은 chart id를 사용한다.
- Verification:
  - chart metadata validation test

### DF-044. Research Review UI 구현

- Priority: P0
- Size: L
- PRD Ref: §8.4, §16.2
- Depends on: DF-041, DF-042
- Scope: 출처, 주장, 데이터셋, 불확실 항목, fact check report를 검토하고 승인하는 UI를 만든다.
- Acceptance Criteria:
  - 사용자는 조사팩을 승인하거나 보강 요청할 수 있다.
  - 승인 전 슬라이드 기획으로 넘어갈 수 없다.
  - 불확실 항목은 숨기지 않는다.
- Verification:
  - Research approval manual QA
  - Source Map UI test

---

## E5. Deck Plan Markdown

### DF-050. Deck Plan 생성 프롬프트 구현

- Priority: P0
- Size: L
- PRD Ref: §8.5, §11.1
- Depends on: DF-032, DF-044
- Scope: 승인된 브리프와 Research Pack으로 슬라이드별 마크다운 기획을 생성한다.
- Acceptance Criteria:
  - 모든 슬라이드가 역할, 핵심 메시지, 시각화 방향, 근거, 편집 가능 요소를 가진다.
  - 근거 없는 핵심 주장은 plan에 포함되지 않는다.
  - 5~12장 덱 범위를 지원한다.
- Verification:
  - Deck Plan generation snapshot test

### DF-051. Slide Spec 파서와 검증기

- Priority: P0
- Size: M
- PRD Ref: §8.5, §9.4
- Depends on: DF-050
- Scope: Markdown Deck Plan을 구조화된 Slide Spec으로 변환하고 검증한다.
- Acceptance Criteria:
  - slide number, role, title, core message, body points, visual composition, data/source constraints가 추출된다.
  - 누락 필드는 승인 차단 오류로 표시된다.
  - 사용자가 수정한 Markdown은 Slide Spec에 반영된다.
- Verification:
  - markdown parser unit test
  - schema validation test

### DF-052. Deck Plan Editor와 승인 UX

- Priority: P0
- Size: L
- PRD Ref: §8.5, §16.2
- Depends on: DF-011, DF-051
- Scope: 마크다운 기획 편집, 미리보기, 수정 요청, 승인 플로우를 구현한다.
- Acceptance Criteria:
  - 승인 전 디자인 시스템 생성으로 넘어갈 수 없다.
  - 수정 후 downstream invalidation이 작동한다.
  - 승인된 Deck Plan은 해시와 버전을 가진다.
- Verification:
  - editor UI test
  - approval/invalidation integration test

### DF-053A. Minimal Slide Source Map

- Priority: P0
- Size: M
- PRD Ref: §8.5, §12.2, §8.14
- Depends on: DF-042, DF-051
- Scope: `slide_id`별 `claim_id`, `source_id`, `dataset_id`를 연결하는 최소 Source Map을 만든다.
- Acceptance Criteria:
  - 출처 없는 수치가 Slide Context Bundle로 들어가지 않는다.
  - Generation Report가 최소 Source Map을 표시할 수 있다.
  - Slide Prompt Package가 source map을 참조할 수 있다.
- Verification:
  - minimal source map test

### DF-053. Slide Source Map UI/고급 연결

- Priority: P1
- Size: M
- PRD Ref: §8.5, §12.2
- Depends on: DF-053A
- Scope: 최소 Source Map을 사용자가 검토하고, 슬라이드별 주장/차트/출처 연결을 수동 보정할 수 있게 한다.
- Acceptance Criteria:
  - 최종 보고서가 슬라이드별 근거 맵을 표시할 수 있다.
  - 출처 없는 수치가 이미지 생성 단계로 전달되지 않는다.
- Verification:
  - Source Map Test

---

## E6. Design System

### DF-060. Design System 스키마 정의

- Priority: P0
- Size: M
- PRD Ref: §8.6, §13.2
- Depends on: DF-003
- Scope: Canvas, Grid, Color Tokens, Typography, Layout Rules, Component Rules, Visual Language, Negative Rules를 구조화한다.
- Acceptance Criteria:
  - 모든 토큰은 JSON schema로 검증된다.
  - safe margin, grid, typography min/max가 포함된다.
  - negative rules가 slide generation과 layout generation에 전달된다.
- Verification:
  - design system schema test

### DF-061. Design System 생성기 구현

- Priority: P0
- Size: L
- PRD Ref: §8.6, §13.1
- Depends on: DF-020, DF-060
- Scope: 승인된 Deck Plan을 바탕으로 덱 전체 디자인 시스템을 생성한다.
- Acceptance Criteria:
  - 모든 슬라이드가 같은 design_system_id를 참조한다.
  - 디자인 시스템 승인 전 HTML Layout Prototype을 생성할 수 없다.
  - 임의 차트 값, 작은 글씨, 랜덤 그라디언트 등 금지 규칙이 포함된다.
- Verification:
  - Design Token Test
  - approval gate test

### DF-062. Design System Editor 구현

- Priority: P1
- Size: L
- PRD Ref: §8.6, §16.1
- Depends on: DF-062A
- Scope: 사용자가 디자인 토큰과 negative rules를 검토하고 수정할 수 있는 UI를 만든다.
- Acceptance Criteria:
  - 수정 시 이후 HTML Layout Prototype과 slides가 invalidated된다.
  - 주요 토큰 수정은 미리보기로 확인 가능하다.
  - 승인 버튼 문구는 `디자인 시스템을 승인하고 레이아웃 초안 생성 시작`이다.
- Verification:
  - design editor UI test
  - invalidation integration test

### DF-062A. Design System Minimal Approval UI

- Priority: P0
- Size: M
- PRD Ref: §8.6, §16.2
- Depends on: DF-061
- Scope: 생성된 디자인 시스템을 읽고 승인하거나 재생성 요청할 수 있는 최소 UI를 만든다.
- Acceptance Criteria:
  - 사용자는 Design System JSON/요약/미리보기를 확인할 수 있다.
  - 승인 버튼 문구는 `디자인 시스템을 승인하고 레이아웃 초안 생성 시작`이다.
  - full token editor 없이도 DF-080이 참조할 승인된 design_system_id를 생성한다.
- Verification:
  - minimal design approval UI test

### DF-066A. Minimal Font Policy

- Priority: P0
- Size: M
- PRD Ref: §13.2, §19.7
- Depends on: DF-060
- Scope: 앱 기본 한글 fallback font stack, line-height, SVG export font-family 정책을 정의한다.
- Acceptance Criteria:
  - HTML preview, editor, SVG export에서 같은 font fallback을 사용한다.
  - 한글 제목/본문/캡션이 깨지지 않는다.
  - 라이선스가 불명확한 폰트는 기본 번들에 포함하지 않는다.
- Verification:
  - minimal Korean font rendering test

### DF-066. Font Manager 구현

- Priority: P1
- Size: L
- PRD Ref: §13.2, §19.7
- Depends on: DF-066A
- Scope: 로컬 사용 가능 폰트 탐지, 앱 기본 폰트 fallback, 한국어 line-height/letter-spacing, SVG/PPTX export font mapping을 관리한다.
- Acceptance Criteria:
  - 한국어 제목/본문/캡션이 깨지지 않는다.
  - HTML preview, editor, SVG export에서 같은 폰트 fallback 정책을 사용한다.
  - 라이선스가 불명확한 폰트는 앱에 번들하지 않는다.
- Verification:
  - font fallback rendering test
  - Korean sample deck visual QA

### DF-067. Korean Typography QA

- Priority: P1
- Size: M
- PRD Ref: §14.4, §19.7
- Depends on: DF-066
- Scope: 한글 줄바꿈, 자간, 행간, 숫자/영문 혼합, 출처 캡션 가독성을 검증한다.
- Acceptance Criteria:
  - 한글 깨짐은 0건이어야 한다.
  - 제목/본문/캡션별 최소 크기와 line-height가 검증된다.
  - 숫자/영문 혼합 문자열과 출처 캡션이 읽을 수 있어야 한다.
- Verification:
  - Korean typography benchmark

### DF-063. Deck Consistency Checker 1차 구현

- Priority: P1
- Size: L
- PRD Ref: §13.3, §14.2
- Depends on: DF-060
- Scope: 팔레트, 제목 위치, 안전 여백, 텍스트 크기, 차트 스타일, 장식 요소 이탈을 검사한다.
- Acceptance Criteria:
  - 디자인 시스템 위반 비율을 계산한다.
  - 스타일 이탈 슬라이드를 재생성 후보로 표시할 수 있다.
  - 10장 기준 2장 이하 목표를 평가할 수 있다.
- Verification:
  - consistency checker unit test

---

## E7. HTML Layout Prototype

### DF-069. Layout IR 스키마와 컴포넌트 렌더러 정의

- Priority: P0
- Size: L
- PRD Ref: §8.7, §13.1
- Depends on: DF-060, DF-070
- Scope: AI가 직접 HTML/CSS를 생성하지 않고, 허용 컴포넌트와 slots, layer role, source_id, bbox preference만 가진 Layout IR JSON을 생성하도록 스키마와 deterministic renderer 계약을 정의한다.
- Acceptance Criteria:
  - Layout IR은 JSON Schema로 검증된다.
  - 허용되지 않은 컴포넌트, 색상, 폰트, 임의 CSS는 표현할 수 없다.
  - HTML/CSS는 앱의 deterministic renderer가 생성한다.
  - Layout IR은 DOM layer metadata와 1:1로 추적 가능한 layer id를 가진다.
- Verification:
  - Layout IR schema validation test
  - renderer contract test

### DF-070. 제한된 슬라이드 컴포넌트 카탈로그 구현

- Priority: P0
- Size: L
- PRD Ref: §8.7
- Depends on: DF-060
- Scope: CoverHero, Agenda, SectionDivider, KeyMessage, TwoColumn, ChartWithInsight, MetricCards, ComparisonTable, Timeline, ImageWithCaption, ClosingSummary 컴포넌트 규칙을 정의한다.
- Acceptance Criteria:
  - 자유 HTML이 아니라 허용 컴포넌트만 사용한다.
  - 각 컴포넌트는 required slots와 editable layer roles를 가진다.
  - 컴포넌트는 승인된 디자인 토큰만 사용한다.
- Verification:
  - component schema validation test

### DF-071. Layout IR 생성 프롬프트 구현

- Priority: P0
- Size: L
- PRD Ref: §8.7, §11.1
- Depends on: DF-050, DF-060, DF-069
- Scope: 승인된 Deck Plan과 Design System으로 슬라이드별 Layout IR JSON을 생성한다.
- Acceptance Criteria:
  - 출력은 Layout IR JSON Schema를 통과해야 한다.
  - 허용 컴포넌트, slots, layer role, source_id, editable flag만 표현할 수 있다.
  - 임의 CSS, 임의 색상, 임의 폰트, JavaScript, 외부 리소스는 표현할 수 없다.
  - Layout IR은 최종 디자인이 아닌 레이아웃 초안임을 metadata에 표시한다.
- Verification:
  - Layout IR prompt output snapshot test
  - schema validation failure test

### DF-072A. Renderer Sandbox Minimum

- Priority: P0
- Size: M
- PRD Ref: §8.7, §15.5
- Depends on: DF-069
- Scope: Layout IR renderer가 외부 URL 요청, Tauri API 접근, script 실행을 할 수 없도록 최소 sandbox를 보장한다.
- Acceptance Criteria:
  - 외부 URL 요청이 차단된다.
  - Tauri API 접근이 불가능하다.
  - script 실행과 inline event handler가 불가능하다.
  - sandbox 실패 시 layout rendering이 실패 처리된다.
- Verification:
  - renderer sandbox minimum test

### DF-072. CSS Whitelist & 악성 샘플 하드닝

- Priority: P1
- Size: L
- PRD Ref: §8.7, §15.5
- Depends on: DF-072A
- Scope: 앱이 생성하는 deterministic HTML/CSS도 안전한 렌더링 표면으로 제한하고, CSS whitelist와 악성 샘플 회귀 테스트를 강화한다.
- Acceptance Criteria:
  - `script`, `iframe`, inline event handler가 차단된다.
  - 외부 URL 요청이 차단된다.
  - Tauri API 접근이 불가능하다.
- Verification:
  - HTML Sanitizer Test
  - 보안 악성 샘플 테스트

### DF-073. 로컬 HTML 렌더러 구현

- Priority: P0
- Size: XL
- PRD Ref: §8.7, §10.1
- Depends on: DF-069, DF-070, DF-072A
- Scope: 검증된 Layout IR을 deterministic HTML/CSS로 변환하고, sandboxed WebView 또는 별도 렌더러로 layout PNG를 생성한다.
- Acceptance Criteria:
  - 모든 슬라이드가 지정된 화면 비율로 렌더링된다.
  - 렌더러는 Tauri API에 접근할 수 없다.
  - 렌더 실패는 단계 오류로 표시된다.
  - 동일한 Layout IR은 동일한 HTML/CSS와 DOM layer metadata를 생성한다.
- Verification:
  - Layout Render Test
  - 렌더 실패 복구 테스트

### DF-074. DOM layer metadata와 bounding box 추출

- Priority: P0
- Size: L
- PRD Ref: §8.7, §8.11
- Depends on: DF-073
- Scope: 렌더링된 DOM에서 편집 가능 객체의 bounds와 role metadata를 추출한다.
- Acceptance Criteria:
  - DOM layer metadata 누락은 0건이어야 한다.
  - bounds는 canvas 좌표계 기준으로 저장된다.
  - source_id, dataset_id, editable 여부가 보존된다.
- Verification:
  - DOM Layer Metadata Test
  - coordinate snapshot test

### DF-075. Layout validation 구현

- Priority: P0
- Size: L
- PRD Ref: §8.7, §14.3
- Depends on: DF-073, DF-074
- Scope: 화면 비율, text overflow, 안전 여백, 제목/본문/출처 구분, 정보 밀도 일관성을 검사한다.
- Acceptance Criteria:
  - HTML 렌더링 성공률 100%를 측정한다.
  - overflow 발생 슬라이드가 5% 이하인지 계산한다.
  - 안전 여백 침범이 5% 이하인지 계산한다.
- Verification:
  - layout validation unit test
  - benchmark layout report

### DF-076. Layout Approval UI 구현

- Priority: P0
- Size: L
- PRD Ref: §8.7, §16.2
- Depends on: DF-075
- Scope: layout PNG 썸네일, 슬라이드별 수정 요청, 전체 방향 수정, 상위 단계 되돌아가기, 승인 UX를 만든다.
- Acceptance Criteria:
  - 승인 전 이미지 생성 단계로 넘어갈 수 없다.
  - 사용자에게 최종 디자인이 아니라 레이아웃 초안임을 안내한다.
  - 승인 버튼 문구는 `레이아웃 초안을 승인하고 슬라이드 생성 시작`이다.
- Verification:
  - layout approval e2e test

---

## E8. Context & Prompt Packaging

### DF-080. Frozen Deck Context Bundle 생성

- Priority: P0
- Size: L
- PRD Ref: §8.8, §9.3
- Depends on: DF-032, DF-044, DF-052, DF-053A, DF-062A, DF-076
- Scope: 승인된 Brief, Research Pack, Deck Plan, Design System, HTML Layout Prototype을 잠근 Deck Context를 만든다.
- Acceptance Criteria:
  - `deck_context_id`, approved artifact ids, hash, locked flag가 저장된다.
  - 모든 병렬 생성 작업은 같은 deck_context_id를 사용한다.
  - layout_prototype_id와 DOM layer metadata가 포함된다.
- Verification:
  - Context Hash Test
  - prompt package integration test

### DF-081. Slide Context Bundle 생성

- Priority: P0
- Size: M
- PRD Ref: §9.4
- Depends on: DF-080, DF-053A
- Scope: 슬라이드별 생성 작업에 필요한 최소 컨텍스트 패키지를 만든다.
- Acceptance Criteria:
  - global summary, design tokens, layout screenshot, DOM layers, slide spec, facts가 포함된다.
  - 원본 대화 히스토리에 의존하지 않는다.
  - source map이 슬라이드별로 포함된다.
- Verification:
  - Slide Context Bundle snapshot test

### DF-082. 프롬프트 자산 버전 관리

- Priority: P0
- Size: M
- PRD Ref: §11.1
- Depends on: DF-020
- Scope: interview, research, deck plan, design system, html layout, slide generation, edit, QA, vectorization, report 프롬프트를 버전 관리한다.
- Acceptance Criteria:
  - 모든 핵심 프롬프트는 파일로 관리된다.
  - 실행 로그에 prompt version이 기록된다.
  - 최종 보고서에 사용된 prompt version이 포함된다.
- Verification:
  - prompt manifest test

---

## E9. Slide Image Generation

### DF-089. Text Overlay Strategy 정의

- Priority: P0
- Size: M
- PRD Ref: §6.3, §8.9, §8.11
- Depends on: DF-069, DF-074
- Scope: 이미지 생성 모델이 렌더링할 텍스트와 앱이 overlay로 렌더링할 텍스트를 분리한다.
- Acceptance Criteria:
  - 제목, 본문, 숫자, 출처는 최종적으로 editable text layer로 렌더링된다.
  - 이미지 생성 프롬프트는 정확한 텍스트를 임의로 그리지 않도록 제어한다.
  - 시각적 배경과 편집 가능한 텍스트 레이어가 충돌하지 않는다.
  - 차트/출처는 source map과 연결되는 overlay layer로 처리된다.
- Verification:
  - text overlay strategy review
  - prompt package snapshot test

### DF-090. 슬라이드 생성 큐 구현

- Priority: P0
- Size: L
- PRD Ref: §8.9
- Depends on: DF-081
- Scope: 슬라이드별 이미지 생성 작업을 병렬 큐로 실행하고 진행률을 추적한다.
- Acceptance Criteria:
  - 병렬 생성은 속도를 위한 것이며 각 작업자가 독자적으로 덱을 해석하지 않는다.
  - 각 작업은 같은 Deck Context와 Design System, HTML Layout Prototype을 참조한다.
  - 실패한 작업은 재시도 또는 사용자 오류 표시가 가능하다.
- Verification:
  - queue integration test
  - partial failure test

### DF-091. Slide Prompt Package 구성

- Priority: P0
- Size: M
- PRD Ref: §8.9, §11.3
- Depends on: DF-081, DF-082
- Scope: approved slide plan, design system, layout screenshot, DOM layers, source map, constraints, negative prompt를 묶는다.
- Acceptance Criteria:
  - HTML layout screenshot은 composition reference로 명시된다.
  - literal web UI reproduction과 generic SaaS dashboard aesthetic을 금지한다.
  - 새로운 수치, 문장, 로고, 출처 추가를 금지한다.
- Verification:
  - Prompt Package Test

### DF-092. 이미지 생성 Provider 호출 구현

- Priority: P0
- Size: L
- PRD Ref: §6.3, §8.9
- Depends on: DF-023A, DF-091
- Scope: GPT Image 계열 또는 fallback provider로 슬라이드 이미지를 생성한다.
- Acceptance Criteria:
  - 16:9 또는 4:3 비율을 지킨다.
  - layout screenshot을 구성 참조로 사용한다.
  - provider 실패 시 오류와 재시도 경로를 제공한다.
- Verification:
  - provider mock image generation test
  - provider error handling test

### DF-093. 생성 이미지 기본 검증

- Priority: P0
- Size: L
- PRD Ref: §8.9, §14.2
- Depends on: DF-096
- Scope: 최종 합성 슬라이드 기준으로 비율, 가독성, 출처 없는 수치, layout 구조 일치 여부를 1차 검사한다.
- Acceptance Criteria:
  - 출처 없는 수치가 생성되면 실패 처리한다.
  - HTML Layout Prototype과 핵심 구조 불일치가 10% 이하인지 평가한다.
  - 주요 텍스트와 숫자가 읽을 수 있어야 한다.
- Verification:
  - image QA mock test
  - benchmark scoring

### DF-094. Deck Consistency Checker 2차 구현

- Priority: P1
- Size: L
- PRD Ref: §8.9, §13.3
- Depends on: DF-063, DF-093
- Scope: 생성된 전체 덱의 스타일 이탈, 디자인 시스템 위반, 정보 밀도 편차를 검사한다.
- Acceptance Criteria:
  - 스타일이 크게 다른 슬라이드는 자동 재생성 후보로 표시된다.
  - 디자인 시스템 위반 비율 목표 10% 이하를 산출한다.
- Verification:
  - consistency benchmark

### DF-095. Slide Review Gallery 구현

- Priority: P0
- Size: L
- PRD Ref: §8.10
- Depends on: DF-096, DF-093
- Scope: 생성된 슬라이드를 그리드와 발표 모드로 표시하고 승인/선택 슬라이드 재생성/수정 요청 액션을 제공한다.
- Acceptance Criteria:
  - 전체 승인, 특정 슬라이드 승인, 선택 슬라이드 재생성, 삭제/추가 요청이 가능하다.
  - 원본 유지 부분 수정 UI는 DF-101 완료 전에는 비활성 또는 실험 기능으로 표시된다.
  - 승인 전 SVG/레이어 변환으로 넘어갈 수 없다.
  - 검증 실패 슬라이드는 명확히 표시된다.
- Verification:
  - slide review UI test
  - approval gate manual QA

### DF-096. Final Slide Compositor 구현

- Priority: P0
- Size: L
- PRD Ref: §8.9, §8.11, §8.13
- Depends on: DF-089, DF-074, DF-111A
- Scope: generated background artifact와 Editable Layer Model을 화면/PNG 미리보기로 합성한다.
- Acceptance Criteria:
  - 생성 이미지의 텍스트 오류가 최종 editable layer와 충돌하지 않는다.
  - 최종 PNG/SVG export는 compositor 결과를 기준으로 한다.
  - 제목, 본문, 숫자, 출처, 차트 overlay는 DF-111A가 만든 Editable Layer Model에서 읽어온다.
  - 복잡한 장식과 일러스트는 generated visual background로 유지된다.
- Verification:
  - compositor snapshot test
  - Korean text overlay visual QA

### DF-097. Image Slop & Style Elevation QA

- Priority: P1
- Size: M
- PRD Ref: §19.3
- Depends on: DF-096
- Scope: 의미 없는 장식, 깨진 텍스트, 가짜 그래프, 웹 UI 같은 시각 리듬, 디자인 시스템 이탈을 평가한다.
- Acceptance Criteria:
  - AI slop 후보를 자동 또는 수동 QA checklist로 표시한다.
  - HTML preview를 그대로 복제한 웹 UI 느낌을 실패 후보로 표시한다.
  - 재생성 또는 수정 요청으로 연결된다.
- Verification:
  - image slop QA checklist run

---

## E10. Slide Revision

### DF-100. 슬라이드 수정 요청 모델 구현

- Priority: P0
- Size: M
- PRD Ref: §8.10
- Depends on: DF-095
- Scope: edit_instruction, must_keep, must_change, design_system_id, slide_plan_id를 구조화한다.
- Acceptance Criteria:
  - 수정 대상 외 주요 요소가 보존 목록에 포함된다.
  - 사용자의 자연어 수정 요청이 구조화된다.
  - revision artifact가 저장된다.
- Verification:
  - edit intent parser test

### DF-101. 원본 유지 수정 생성 구현

- Priority: P1
- Size: L
- PRD Ref: §8.10
- Depends on: DF-092, DF-100
- Scope: 원본 슬라이드 이미지와 수정 지시를 함께 전달해 국소 수정 생성을 수행한다.
- Acceptance Criteria:
  - must_keep 항목이 임의 변경되면 실패 처리한다.
  - 수정본은 새 버전으로 저장된다.
  - 수정 전후 비교가 가능하다.
- Verification:
  - revision generation mock test
  - before/after snapshot test

### DF-102. Revision Compare UI 구현

- Priority: P1
- Size: M
- PRD Ref: §8.10
- Depends on: DF-101
- Scope: 수정 전후 슬라이드 비교, 승인, 재수정 요청 UI를 제공한다.
- Acceptance Criteria:
  - 사용자는 수정본 승인 또는 재수정 요청을 할 수 있다.
  - 변경 요약과 의도치 않은 변경 가능성이 표시된다.
- Verification:
  - revision compare UI test

### DF-103. Revision Mask & Delta Checker

- Priority: P1
- Size: M
- PRD Ref: §8.10
- Depends on: DF-101
- Scope: 수정 생성 시 변경 허용 영역과 보존 영역을 비교하고 의도치 않은 변경을 탐지한다.
- Acceptance Criteria:
  - must_keep 영역의 큰 변화는 실패 또는 경고로 표시된다.
  - 수정 전후 delta summary가 revision history에 저장된다.
  - 사용자는 의도치 않은 변경 후보를 보고 승인 또는 재수정할 수 있다.
- Verification:
  - revision delta snapshot test

---

## E11. SVG/Editable Layer Conversion

### DF-110. Editable Layer Model 스키마 정의

- Priority: P0
- Size: M
- PRD Ref: §8.11
- Depends on: DF-074
- Scope: PNG + DOM layer metadata 기반 레이어 모델 스키마를 정의한다.
- Acceptance Criteria:
  - layer id, source_layer_id, type, role, bounds, editable, dataset_id를 표현한다.
  - Level 2 최소 합격과 Level 3 목표 품질을 구분한다.
- Verification:
  - layer model schema test

### DF-111A. DOM 기반 MVP 레이어 합성 구현

- Priority: P0
- Size: L
- PRD Ref: §8.11, §19.5
- Depends on: DF-074, DF-110
- Scope: DOM layer metadata, Slide Spec, Source Map을 기준으로 제목, 본문, 숫자, 출처, 차트를 포함한 MVP Editable Layer Model을 생성한다.
- Acceptance Criteria:
  - 제목 텍스트 편집 가능률 95% 이상을 목표로 한다.
  - 본문 텍스트 편집 가능률 85% 이상을 목표로 한다.
  - 차트/출처는 source map과 연결된다.
  - generated background와 독립적인 overlay layer model을 만들며, PNG 분석 실패와 무관하게 Level 2 편집 가능성을 달성한다.
- Verification:
  - editable overlay composition test
  - benchmark editability scoring

### DF-111C. PNG2SVG Adapter Feasibility Spike

- Priority: P1
- Size: M
- PRD Ref: §8.11, §21
- Depends on: DF-111A
- Scope: `sunseol/PNG2SVG.git`의 Python CLI/Figma-first prototype을 DeckForge 보조 변환 엔진으로 감쌀 수 있는지 검증한다. Figma plugin 의존성은 제외하고, `manifest.json`, `slides/*.svg`, `slides/*.hybrid.svg`, `text_candidates`, `raster_regions`, `visual_regions`를 DeckForge Editable Layer Model draft로 변환한다.
- Acceptance Criteria:
  - Figma plugin 또는 `figma-import.json` 없이 CLI 또는 library adapter mode로 실행 가능하다.
  - 입력 PNG 10개에 대해 vector regions, raster regions, visual regions, text candidates를 추출한다.
  - PNG2SVG 출력이 `source: png2svg.*` 메타데이터를 가진 Editable Layer Model draft로 변환된다.
  - macOS 환경에서 Windows OCR 없이도 `ocr-engine=none` 또는 adapter stub으로 pipeline이 실패하지 않는다.
  - 실패 케이스, 품질 한계, 라이선스/소유권 확인 필요 항목을 기록하고 DF-156으로 넘긴다.
- Verification:
  - PNG2SVG adapter spike report
  - 10개 fixture visual diff

### DF-111D. PNG2SVG Visual Region Detector Port

- Priority: P1
- Size: L
- PRD Ref: §8.11, §19.5
- Depends on: DF-111C, DF-156
- Scope: PNG2SVG의 panel, icon block, photo-like region 탐지 로직을 DeckForge의 movable `image_region` 또는 `visual_region` layer로 이식한다. Figma importer는 제품 경로에 포함하지 않는다.
- Acceptance Criteria:
  - 주요 패널, 이미지, 아이콘 블록을 이동 가능한 raster region layer로 분리한다.
  - DF-111A가 만든 제목, 본문, 숫자, 출처 overlay 영역과 충돌하지 않는다.
  - 과분할, 누락, 흐림, 텍스트 침범 케이스를 benchmark 결과로 남긴다.
  - adapter 산출물은 원본 PNG, region bounds, confidence, source id를 추적할 수 있다.
- Verification:
  - visual region benchmark
  - overlay collision regression test

### DF-111B. PNG + DOM 기반 고급 레이어 매칭 구현

- Priority: P1
- Size: L
- PRD Ref: §8.11, §19.5
- Depends on: DF-111A, DF-111D
- Scope: DF-111A의 MVP Editable Layer Model에 PNG2SVG-adapted visual region 결과를 병합해 이미지 내부 도형, 아이콘, 카드, 배경 요소의 Level 3 이상 편집성을 높인다.
- Acceptance Criteria:
  - 주요 편집 가능 객체는 DOM layer metadata 또는 `png2svg.visual_region` source와 연결된다.
  - generated background + editable overlay P0 안전 경로를 대체하지 않는다.
  - OCR만 믿지 않고 Slide Spec 텍스트와 DOM layer metadata를 우선 사용한다.
  - 객체 과분할로 편집 불가능한 슬라이드가 10% 이하가 되도록 설계한다.
- Verification:
  - advanced layer matching benchmark

### DF-112. 텍스트/폰트 재구성 구현

- Priority: P0
- Size: L
- PRD Ref: §8.11, §19.7
- Depends on: DF-066A, DF-111A
- Scope: 제목, 본문, 캡션, 숫자를 편집 가능한 텍스트 레이어로 재구성하고 폰트 스타일 후보를 매칭한다.
- Acceptance Criteria:
  - 제목 텍스트 편집 가능률 95% 이상을 목표로 한다.
  - 본문 텍스트 편집 가능률 85% 이상을 목표로 한다.
  - 한글 깨짐은 0건이어야 한다.
- Verification:
  - Korean text reconstruction test
  - font fallback rendering test

### DF-112A. OCR Candidate Importer as Review Hints

- Priority: P1
- Size: M
- PRD Ref: §8.11, §19.7
- Depends on: DF-111C, DF-112
- Scope: PNG2SVG의 OCR/text candidate 출력을 DeckForge 텍스트 복원 원천이 아니라 QA/review hint로 사용한다.
- Acceptance Criteria:
  - Slide Spec과 DOM layer metadata의 원문 텍스트가 OCR 후보보다 우선한다.
  - 원문 텍스트와 OCR 후보가 충돌하면 review required로 표시한다.
  - Windows OCR이 없어도 DeckForge 생성 슬라이드 pipeline은 정상 동작한다.
  - OCR correction dictionary는 사용자 편집 가능 구조 또는 별도 설정으로 분리된다.
- Verification:
  - OCR hint comparison test
  - macOS no-OCR smoke test

### DF-113. 차트/표 레이어 재구성 구현

- Priority: P1
- Size: L
- PRD Ref: §12.3, §8.11
- Depends on: DF-043, DF-111A
- Scope: 차트와 표를 이미지가 아니라 데이터 기반 편집 가능 레이어로 삽입한다.
- Acceptance Criteria:
  - chart layer는 dataset_id를 가진다.
  - 데이터 단위, 기준연도, 출처가 유지된다.
  - 이미지 모델이 그린 가짜 그래프는 최종 레이어로 사용하지 않는다.
- Verification:
  - chart layer reconstruction test

### DF-114. SVG 렌더러 구현

- Priority: P0
- Size: L
- PRD Ref: §8.11, §8.13
- Depends on: DF-110, DF-111A, DF-112
- Scope: DeckForge native Editable Layer Model을 SVG로 렌더링한다. PNG2SVG adapter가 제공하는 `vector_region` 또는 `image_region` layer는 확장 입력으로 받을 수 있게 하되, 기본 P0 renderer는 PNG2SVG/Figma plugin 없이 동작한다.
- Acceptance Criteria:
  - SVG는 주요 객체가 편집 가능한 구조를 유지한다.
  - SVG 렌더링과 원본 PNG의 사람이 느끼는 큰 차이가 10% 이하가 되도록 비교 가능하다.
  - 배경 이미지, 텍스트, 도형, 차트 레이어가 분리된다.
  - `vector_region`과 `image_region` layer가 있을 때 SVG에 안정적으로 반영된다.
  - Figma plugin과 `figma-import.json`은 MVP runtime 의존성이 아니다.
- Verification:
  - SVG render snapshot test
  - visual similarity check

### DF-115. Editable Review Gate 구현

- Priority: P1
- Size: M
- PRD Ref: §7.2, §8.11
- Depends on: DF-114
- Scope: 변환 결과를 검토하고 승인하거나 재변환 요청하는 게이트를 만든다.
- Acceptance Criteria:
  - SVG/레이어 승인 전 편집/내보내기로 넘어갈 수 없다.
  - 편집 가능성 검증 결과가 표시된다.
  - 실패 항목은 숨기지 않는다.
- Verification:
  - editable gate UI test

---

## E12. Canvas Editor

### DF-120. 캔버스 렌더링 엔진 구현

- Priority: P0
- Size: L
- PRD Ref: §8.12
- Depends on: DF-111A
- Scope: Editable Layer Model을 편집 가능한 캔버스 화면으로 렌더링한다.
- Acceptance Criteria:
  - 텍스트, 도형, 이미지, 차트 레이어가 표시된다.
  - 레이어 잠금 상태가 반영된다.
  - 10장 덱 로컬 프로젝트 열기 5초 이하 목표를 고려한다.
- Verification:
  - canvas rendering test
  - performance smoke test

### DF-121. 객체 선택/이동/리사이즈 구현

- Priority: P0
- Size: L
- PRD Ref: §8.12, §20.3
- Depends on: DF-120
- Scope: 클릭 선택, 드래그 이동, 핸들 리사이즈를 구현한다.
- Acceptance Criteria:
  - 사용자는 5분 안에 객체 이동과 크기 변경을 수행할 수 있다.
  - 객체 드래그 반응은 지연 없이 체감 가능해야 한다.
  - 안전 여백 가이드 또는 스냅이 동작한다.
- Verification:
  - editor interaction test
  - manual usability test

### DF-122. 텍스트 편집 구현

- Priority: P0
- Size: L
- PRD Ref: §8.12, §14.4
- Depends on: DF-120
- Scope: 더블클릭 후 텍스트 수정, 저장, 재렌더링을 구현한다.
- Acceptance Criteria:
  - 제목과 본문 텍스트 수정이 가능하다.
  - 한글 입력과 저장이 깨지지 않는다.
  - 변경 후 SVG/export에 반영된다.
- Verification:
  - Korean text edit test
  - export roundtrip test

### DF-123. Undo/Redo, 복제, 삭제, 그룹 기능

- Priority: P1
- Size: L
- PRD Ref: §8.12
- Depends on: DF-121, DF-122
- Scope: 핵심 편집 작업 이력과 객체 조작 기능을 제공한다.
- Acceptance Criteria:
  - Undo/Redo가 편집 이력을 보존한다.
  - 객체 복제, 삭제, 그룹/그룹 해제가 동작한다.
  - 편집 중 오류가 작업물을 손상시키지 않는다.
- Verification:
  - editor command unit test

### DF-124. 자동 저장과 크래시 복구

- Priority: P0
- Size: M
- PRD Ref: §8.12, §20.2
- Depends on: DF-013, DF-120
- Scope: 주요 편집 이벤트 후 또는 10초 이하 주기로 편집 상태를 저장한다.
- Acceptance Criteria:
  - 앱 재시작 후 편집 상태가 복구된다.
  - 크래시 후 마지막 자동 저장 지점으로 복구된다.
  - 최종 산출물 저장/복구 성공률 100%를 목표로 한다.
- Verification:
  - autosave recovery test
  - crash simulation test

---

## E13. Export & Generation Report

### DF-130A. PNG/Project Export

- Priority: P0
- Size: M
- PRD Ref: §8.13
- Depends on: DF-096, DF-124
- Scope: 최종 compositor 결과를 PNG와 프로젝트 파일로 내보낸다.
- Acceptance Criteria:
  - 내보낸 PNG는 승인된 최종 레이아웃과 일치한다.
  - 프로젝트 파일은 인증 정보를 포함하지 않는다.
  - export artifact id/hash가 저장된다.
- Verification:
  - PNG/project export regression test
  - secret scan

### DF-130B. SVG Export

- Priority: P1
- Size: L
- PRD Ref: §8.13
- Depends on: DF-114, DF-130A
- Scope: DeckForge Editable Layer Model과 compositor 결과를 native SVG 슬라이드 파일로 내보낸다. PNG2SVG adapter layer가 있을 경우 `source_layer_id`와 `png2svg.*` source metadata를 가능한 범위에서 보존한다.
- Acceptance Criteria:
  - SVG는 주요 객체가 편집 가능한 구조를 유지한다.
  - DOM layer metadata와 source_layer_id가 가능한 범위에서 유지된다.
  - SVG 렌더링 결과가 최종 PNG와 크게 다르지 않아야 한다.
  - PNG2SVG의 Figma handoff package 구조를 그대로 제품 포맷으로 사용하지 않는다.
- Verification:
  - SVG export regression test

### DF-130C. Hybrid SVG Compatibility Export

- Priority: P1
- Size: M
- PRD Ref: §8.13, §21
- Depends on: DF-130B, DF-111C
- Scope: PNG2SVG의 `hybrid-safe` 개념을 DeckForge export option으로 흡수한다. 원본 visual background를 locked base로 보존하고 editable guide/text/vector layers를 함께 내보내는 compatibility SVG를 생성한다.
- Acceptance Criteria:
  - hybrid SVG는 시각적 보존을 우선하며 최종 PNG와 크게 다르지 않다.
  - editable overlay, visual region, source_layer_id가 가능한 범위에서 유지된다.
  - 일반 SVG export 실패와 hybrid SVG export 실패가 서로를 오염시키지 않는다.
- Verification:
  - hybrid SVG visual diff
  - SVG export regression test

### DF-131. PPTX 내보내기 Stretch Goal 구현

- Priority: P2
- Size: XL
- PRD Ref: §8.13, §21
- Depends on: DF-130B
- Scope: PNG/SVG/프로젝트 파일 export 이후 stretch goal로 PPTX export를 구현한다.
- Acceptance Criteria:
  - PowerPoint에서 텍스트와 주요 도형을 수정할 수 있다.
  - 지원하지 않는 레이어는 명확히 fallback 처리된다.
  - PPTX export 실패 시 PNG/SVG export는 영향을 받지 않는다.
- Verification:
  - PPTX manual compatibility test

### DF-132. Generation Report 생성

- Priority: P0
- Size: L
- PRD Ref: §8.14
- Depends on: DF-014, DF-015A, DF-053A, DF-080, DF-082, DF-130A
- Scope: 사용자 요구, 승인 결과, 조사 출처, Source Map, Design System, HTML Layout Prototype, prompt version, 수정 이력, 변환 품질, 검증 결과를 보고서로 생성한다.
- Acceptance Criteria:
  - 모든 슬라이드는 기획, 출처, 디자인 시스템, HTML Layout Prototype 기반을 추적할 수 있다.
  - 검증 실패 또는 불확실 항목은 숨기지 않는다.
  - 사용자가 신뢰 수준을 판단할 수 있다.
- Verification:
  - report snapshot test
  - lineage completeness test

### DF-133. 최종 승인과 내보내기 게이트

- Priority: P0
- Size: M
- PRD Ref: §7.3, §8.14
- Depends on: DF-130A, DF-132
- Scope: 최종 승인 전 검증 실패, invalidated 산출물, 누락 보고서를 차단한다.
- Acceptance Criteria:
  - invalidated 결과물은 export할 수 없다.
  - 최종 승인 후 export artifacts가 고정된다.
  - 보고서와 파일 내보내기가 함께 완료된다.
- Verification:
  - final gate e2e test

---

## E14. UX, Observability, Error Handling

### DF-140. 전체 Workflow Stepper UX 구현

- Priority: P0
- Size: M
- PRD Ref: §16.1
- Depends on: DF-010
- Scope: 0 Project부터 9 Export까지 현재 단계, 잠긴 단계, invalidated 단계, 완료 단계를 표시한다.
- Acceptance Criteria:
  - 사용자는 현재 단계와 다음 가능한 액션을 이해할 수 있다.
  - 잠긴 단계는 왜 잠겼는지 설명한다.
  - invalidated 단계는 재생성 필요성을 표시한다.
- Verification:
  - stepper UI test

### DF-141. 장시간 AI 작업 진행 상태 UI

- Priority: P0
- Size: M
- PRD Ref: §16.3
- Depends on: DF-025
- Scope: 현재 단계, provider job progress, cancellation, retry, 생성된 중간 산출물, 실패/재시도 요약을 표시하는 최소 UI를 구현한다.
- Acceptance Criteria:
  - 내부 로그를 그대로 노출하지 않고 신뢰 가능한 요약을 제공한다.
  - 작업 취소 또는 재시도 경로가 명확하다.
  - job_id 기준으로 앱 재시작 후 상태를 복구한다.
- Verification:
  - long-running mock task manual QA

### DF-142. 오류 처리와 복구 정책 구현

- Priority: P0
- Size: L
- PRD Ref: §16.3, §20.2
- Depends on: DF-013A, DF-015A
- Scope: provider 오류, 렌더 오류, 저장 오류, 변환 오류를 사용자 액션 가능한 형태로 표시한다.
- Acceptance Criteria:
  - 오류는 단계, 원인, 재시도 가능 여부를 포함한다.
  - 저장 실패는 작업물 유실을 방지한다.
  - 치명 결함은 최종 승인으로 넘어가지 못한다.
- Verification:
  - failure injection tests

### DF-143. Local-first 데이터 제어 UI

- Priority: P2
- Size: M
- PRD Ref: §15.1
- Depends on: DF-004
- Scope: 프로젝트 폴더 열기, 삭제, 내보내기, 저장 위치 표시 기능을 제공한다.
- Acceptance Criteria:
  - 사용자는 프로젝트 산출물이 어디에 저장되는지 확인할 수 있다.
  - 프로젝트 폴더를 직접 내보낼 수 있다.
  - 클라우드 동기화는 MVP에서 제공하지 않는다.
- Verification:
  - local project folder manual QA

### DF-144. 민감 정보 보호와 로그 redaction

- Priority: P0
- Size: M
- PRD Ref: §15.2
- Depends on: DF-015A, DF-022, DF-023A
- Scope: 토큰, API Key, Authorization 헤더, Codex auth 파일 경로가 프론트엔드/로그/프로젝트 파일에 노출되지 않게 한다.
- Acceptance Criteria:
  - 로그 redaction test가 통과한다.
  - 프로젝트 폴더에 인증 정보가 저장되지 않는다.
  - renderer에서 민감 경로를 직접 읽을 수 없다.
- Verification:
  - security log scan
  - project artifact secret scan

---

## E15. Test, Benchmark, Release QA

### DF-150. Full 30 Benchmark Suite 확장

- Priority: P1
- Size: M
- PRD Ref: §17.1, §23
- Depends on: DF-006
- Scope: seed benchmark 10개를 투자 제안서, 내부 보고, 교육 자료, 데이터 중심, 브랜드 중심, 한글 중심, 비교, 수정, 편집, 오류 유도 요청을 포함한 30개 benchmark로 확장한다.
- Acceptance Criteria:
  - 각 benchmark는 초기 프롬프트와 기대 검증 포인트를 가진다.
  - 30개 중 80% 이상 성공 기준을 평가할 수 있다.
- Verification:
  - benchmark manifest validation

### DF-151. 자동 테스트 스위트 구현

- Priority: P1
- Size: XL
- PRD Ref: §17.3
- Depends on: DF-010, DF-013, DF-072, DF-114, DF-130B
- Scope: State Machine, Context Hash, Prompt Package, Source Map, Design Token, Layout IR, HTML Hardening, Layout Render, DOM Layer Metadata, SVG Editability, Export Regression 테스트를 전체 스위트로 구성한다.
- Acceptance Criteria:
  - 핵심 회귀 테스트가 한 명령으로 실행된다.
  - 실패 시 관련 단계와 artifact id가 표시된다.
  - Mock Provider 기반으로 CI 없이도 실행 가능하다.
- Verification:
  - 전체 test suite green

### DF-151A. PNG2SVG Regression Corpus

- Priority: P1
- Size: M
- PRD Ref: §17.1, §17.3
- Depends on: DF-111C, DF-150
- Scope: 사용자가 수동 테스트해온 PNG2SVG 사례와 DeckForge benchmark 이미지를 DeckForge regression corpus로 변환한다.
- Acceptance Criteria:
  - 최소 20개 fixture가 원본 PNG, 기대 manifest/SVG, 실패 조건, 수동 QA 메모를 가진다.
  - text_candidates, raster_regions, visual_regions, hybrid-safe 결과를 비교할 수 있다.
  - PNG2SVG adapter 변경 시 fixture별 visual diff와 metadata diff가 생성된다.
- Verification:
  - regression corpus snapshot
  - PNG2SVG fixture diff report

### DF-152. Happy Path E2E 테스트 구현

- Priority: P1
- Size: L
- PRD Ref: §7, §20
- Depends on: DF-007B, DF-150, DF-151
- Scope: seed를 넘어 전체 benchmark 대표 케이스에서 프로젝트 생성부터 최종 보고/내보내기까지 관통하는 e2e 테스트를 만든다.
- Acceptance Criteria:
  - 승인 기반 워크플로우 전체가 한 번에 실행된다.
  - 각 단계 산출물이 생성된다.
  - 최종 export와 report가 존재한다.
- Verification:
  - happy path e2e pass

### DF-153. MVP 점수 산정 하네스

- Priority: P0
- Size: L
- PRD Ref: §14.1, §20.2
- Depends on: DF-006, DF-007B
- Scope: Technical MVP 점수표 기준으로 seed benchmark와 vertical slice 결과의 워크플로우, 인터뷰, 조사, 기획, 디자인, Layout IR/HTML preview, 이미지, editable overlay, 에디터, 보고 점수를 산정한다.
- Acceptance Criteria:
  - 총점 80점 이상 여부를 자동 산출한다.
  - 치명 결함은 점수와 무관하게 출시 불가로 표시한다.
  - benchmark별 점수와 실패 이유가 남는다.
- Verification:
  - scoring harness test

### DF-156. Dependency License / OSS Compliance

- Priority: P1
- Size: M
- PRD Ref: §15, §19.7
- Depends on: DF-003
- Scope: Rust/TypeScript 의존성, 폰트, 렌더링 도구, export 도구, `sunseol/PNG2SVG.git` adapter 후보의 라이선스와 배포 가능성을 검토한다.
- Acceptance Criteria:
  - MVP 번들에 포함되는 의존성의 라이선스 목록이 생성된다.
  - 상용/제한 라이선스 리스크가 표시된다.
  - 폰트 번들 정책이 Font Manager와 일치한다.
  - PNG2SVG 코드 소유권, 병합 가능 라이선스, Python 의존성(OpenCV, Pillow, numpy 등), Windows OCR 사용 조건이 확인된다.
  - PNG2SVG Figma plugin 코드는 MVP 번들에서 제외하거나 별도 승인된 Post-MVP 범위로 분리된다.
- Verification:
  - license report review

### DF-157. Packaging, Code Signing, Notarization 준비

- Priority: P1
- Size: L
- PRD Ref: §6.1, §20.1
- Depends on: DF-001, DF-156
- Scope: macOS 우선 설치 패키지, code signing, notarization 또는 내부 테스트 배포 절차를 준비한다.
- Acceptance Criteria:
  - 내부 테스트용 앱 패키지를 생성할 수 있다.
  - 서명/공증 요구사항과 필요한 인증서가 문서화된다.
  - 배포 실패 시 fallback 테스트 경로가 있다.
- Verification:
  - packaging dry run

### DF-154. Manual QA 시나리오 문서 작성

- Priority: P1
- Size: M
- PRD Ref: §20.3
- Depends on: DF-152
- Scope: 신규 사용자 10분 프로젝트 생성, 5분 편집, 최종 보고 이해 가능성 검증 절차를 문서화한다.
- Acceptance Criteria:
  - QA 담당자가 따라 할 수 있는 단계별 체크리스트가 있다.
  - 관찰 지표와 합격 기준이 명시된다.
- Verification:
  - QA dry run

### DF-155. MVP 릴리스 체크리스트 작성

- Priority: P1
- Size: S
- PRD Ref: §20
- Depends on: DF-153, DF-154
- Scope: 기능 기준, 품질 기준, 사용자 기준, 보안 점검을 릴리스 전 체크리스트로 만든다.
- Acceptance Criteria:
  - 모든 P0 티켓 완료 여부를 확인한다.
  - 미검증 항목과 출시 차단 항목을 분리한다.
  - 최종 보고서 샘플과 benchmark 결과 위치를 기록한다.
- Verification:
  - release readiness review

---

## E16. Post-MVP Expansion Backlog

### DF-170. PPTX 내보내기 품질 개선

- Priority: P3
- Size: XL
- PRD Ref: §21
- Depends on: DF-131
- Scope: PowerPoint 호환성, 텍스트/도형 편집성, 차트 변환 품질을 개선한다.
- Acceptance Criteria:
  - PowerPoint에서 주요 레이어가 자연스럽게 수정된다.
  - SVG fallback 의존도를 줄인다.
- Verification:
  - PPTX compatibility matrix

### DF-171. 브랜드 키트 업로드

- Priority: P3
- Size: L
- PRD Ref: §21
- Depends on: DF-060, DF-062
- Scope: 로고, 폰트, 컬러, 브랜드 가이드를 업로드하고 Design System에 반영한다.
- Acceptance Criteria:
  - 브랜드 토큰이 기존 Design System에 병합된다.
  - 라이선스/폰트 경고가 표시된다.
- Verification:
  - brand kit import test

### DF-172. 슬라이드 템플릿 마켓

- Priority: P3
- Size: XL
- PRD Ref: §21
- Depends on: DF-070
- Scope: 제한된 컴포넌트 시스템 위에 템플릿 탐색, 적용, 저장 기능을 제공한다.
- Acceptance Criteria:
  - 템플릿은 HTML Layout Prototype 규칙을 준수한다.
  - 임의 JS/외부 리소스가 포함된 템플릿은 차단된다.
- Verification:
  - template validation test

### DF-173. Figma 가져오기/내보내기

- Priority: P3
- Size: XL
- PRD Ref: §8.13, §21
- Depends on: DF-114, DF-130B
- Scope: Figma 호환 포맷 내보내기와 가져오기 가능성을 구현한다. PNG2SVG의 Figma importer는 참고 구현으로만 사용하며, MVP DeckForge runtime이나 SVG export의 필수 의존성으로 삼지 않는다.
- Acceptance Criteria:
  - 주요 텍스트와 도형 레이어가 Figma에서 수정 가능하다.
  - 호환되지 않는 레이어는 명확히 fallback 처리된다.
  - PNG2SVG `figma-import.json`/plugin 구조를 재사용할 경우 Post-MVP 라이선스와 포맷 소유권이 명시된다.
- Verification:
  - Figma roundtrip manual QA

### DF-174. Canva 호환 가져오기 패키지

- Priority: P3
- Size: XL
- PRD Ref: §8.13
- Depends on: DF-130B
- Scope: Canva에서 가져올 수 있는 패키지 구조를 연구하고 export한다.
- Acceptance Criteria:
  - Canva 호환 한계가 문서화된다.
  - 지원 가능한 레이어는 편집 가능성을 유지한다.
- Verification:
  - Canva import manual QA

### DF-175. 협업과 팀 워크스페이스

- Priority: P3
- Size: XL
- PRD Ref: §21
- Depends on: DF-004, DF-015
- Scope: 팀 워크스페이스, 협업 권한, 동시 편집 또는 비동기 리뷰 기능을 설계한다.
- Acceptance Criteria:
  - Local-first 기본 원칙과 충돌하지 않는 동기화 전략이 정의된다.
  - 승인 로그와 충돌 해결 정책이 확장된다.
- Verification:
  - collaboration architecture review

### DF-176. 커스텀 조사 소스 커넥터

- Priority: P3
- Size: L
- PRD Ref: §21
- Depends on: DF-041
- Scope: 사용자 또는 팀이 신뢰 소스를 추가할 수 있는 connector 인터페이스를 만든다.
- Acceptance Criteria:
  - source 등급 정책을 유지한다.
  - 커스텀 소스도 claim/source/dataset 구조로 변환된다.
- Verification:
  - custom connector integration test

### DF-177. 과거 덱 스타일 학습

- Priority: P3
- Size: XL
- PRD Ref: §21
- Depends on: DF-060, DF-070, DF-130A
- Scope: 사용자의 과거 덱에서 디자인 패턴을 추출해 Design System과 Layout Prototype 추천에 반영한다.
- Acceptance Criteria:
  - 사용자가 업로드한 덱은 로컬 우선으로 처리된다.
  - 추출된 스타일은 사용자의 승인 전 적용되지 않는다.
- Verification:
  - style extraction benchmark

---

## 권장 실행 순서

1. Phase A0, Foundation: DF-001, DF-002, DF-003, DF-004, DF-004A, DF-005, DF-010, DF-011, DF-013, DF-013A, DF-015A, DF-020
2. Phase A1, Provider uncertainty and security: DF-019, DF-021, DF-022, DF-023A, DF-025, DF-144
3. Phase A2, Layout/renderer spike: DF-060, DF-070, DF-069, DF-072A, DF-073, DF-074
4. Phase A3, Editable overlay spike: DF-110, DF-111A, DF-089, DF-096, DF-120, DF-122
5. Phase A4, Mock harness skeleton: DF-006, DF-007A
6. Phase B, Mock vertical slice full pass: DF-012, DF-014, DF-030, DF-124, DF-130A, DF-140, DF-141, DF-142, DF-007B, DF-153
7. Phase C1, Interview backbone: DF-031, DF-032, DF-033
8. Phase C2, Research/fact backbone: DF-040, DF-041A, DF-041B, DF-041C, DF-041, DF-042, DF-044
9. Phase C3, Planning/source-map backbone: DF-050, DF-051, DF-052, DF-053A, DF-043A
10. Phase D, Real AI pipeline: DF-061, DF-062A, DF-071, DF-075, DF-076, DF-080, DF-081, DF-082, DF-090, DF-091, DF-092, DF-093, DF-095, DF-100
11. Phase E, Editing/export completion: DF-066A, DF-112, DF-114, DF-121, DF-132, DF-133
12. Phase F, Release quality gates: P1/P2 티켓 중 DF-015, DF-023, DF-024, DF-034, DF-035, DF-041D, DF-041E, DF-043, DF-053, DF-062, DF-063, DF-066, DF-067, DF-072, DF-094, DF-097, DF-101, DF-102, DF-103, DF-111C, DF-156, DF-111D, DF-111B, DF-112A, DF-113, DF-115, DF-123, DF-130B, DF-130C, DF-131, DF-143, DF-150, DF-151, DF-151A, DF-152, DF-154, DF-155, DF-157
13. Phase G, Post-MVP expansion: DF-170~DF-177

---

## Vertical Slice 0 티켓 목록

첫 번째 개발 목표는 전체 품질이 아니라 Mock 기반 관통이다. 다음 티켓이 완료되면 최소 Tauri UI, 승인 게이트, backend/service, artifact/export/report 구조가 실제로 연결되는지 확인할 수 있다.

```text
DF-001, DF-002, DF-003, DF-004, DF-004A, DF-005, DF-006, DF-007A, DF-007B,
DF-010, DF-011, DF-012, DF-013, DF-013A, DF-014, DF-015A,
DF-020, DF-025, DF-030,
DF-060, DF-069, DF-070, DF-072A, DF-073, DF-074,
DF-089, DF-096,
DF-110, DF-111A,
DF-120, DF-122, DF-124,
DF-130A, DF-140, DF-141, DF-153
```

---

## Technical MVP 차단 티켓 목록

P0 티켓은 Technical MVP 완료 전에 모두 완료되어야 한다.

```text
DF-001, DF-002, DF-003, DF-004, DF-004A, DF-005, DF-006, DF-007A, DF-007B,
DF-010, DF-011, DF-012, DF-013, DF-013A, DF-014, DF-015A,
DF-019, DF-020, DF-021, DF-022, DF-023A, DF-025,
DF-030, DF-031, DF-032, DF-033,
DF-040, DF-041, DF-041A, DF-041B, DF-041C, DF-042, DF-043A, DF-044,
DF-050, DF-051, DF-052, DF-053A,
DF-060, DF-061, DF-062A, DF-066A,
DF-069, DF-070, DF-071, DF-072A, DF-073, DF-074, DF-075, DF-076,
DF-080, DF-081, DF-082,
DF-089, DF-090, DF-091, DF-092, DF-093, DF-095, DF-096,
DF-100,
DF-110, DF-111A, DF-112, DF-114,
DF-120, DF-121, DF-122, DF-124,
DF-130A, DF-132, DF-133,
DF-140, DF-141, DF-142, DF-144,
DF-153
```

---

## 완료 판정

### Technical MVP 완료 기준

- Tauri 데스크탑 앱으로 실행 가능하다.
- Codex/ChatGPT 인증 연결 또는 상태 확인이 가능하다.
- 승인 기반 워크플로우가 인터뷰부터 최종 보고까지 강제된다.
- seed benchmark 10개 기준 80% 이상이 end-to-end로 통과한다.
- Layout IR 기반 HTML Layout Prototype 렌더링 성공률이 100%다.
- DOM layer metadata 누락이 0건이다.
- 최종 미리보기와 export는 generated background + editable overlay 구조를 사용한다.
- 선택 슬라이드 재생성 또는 사용자 지시 반영 후 사용 가능한 슬라이드가 90% 이상이다.
- PNG/project export와 Generation Report가 생성된다.
- 최종 산출물 저장/복구 성공률이 100%다.

### Private Beta 출시 기준

- full benchmark 30개 중 80% 이상이 최종 MVP 판정 문장을 만족한다.
- Source Map과 Generation Report가 슬라이드별 근거를 추적 가능하게 표시한다.
- 한글 typography QA와 기본 font fallback 검증을 통과한다.
- SVG export가 주요 객체 편집 가능성을 유지한다.
- packaging dry run이 통과한다.

### Public MVP 출시 기준

- 치명 결함 0건이다.
- 주요 수치 오류와 출처 없는 핵심 주장이 0건이다.
- 보안 로그와 민감정보 redaction 검증을 통과한다.
- 의존성/폰트 라이선스 리포트가 검토 완료 상태다.
- 신규 사용자가 10분 안에 첫 프로젝트를 생성하고 인터뷰 승인까지 갈 수 있다.
