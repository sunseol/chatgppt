# CHATGPPT / GPPT / DeckForge 전체 아키텍처 설명서

- 문서 버전: v0.2
- 작성일: 2026-07-01 17:48 KST
- 작업 분류: `specification` / documentation-only
- 기준 저장소: `/Users/jake/chatgppt`
- 기준 앱: `/Users/jake/chatgppt/deck-scribe-craft-07`
- 기준 브랜치: `codex/mvp-functional-screenshot-evidence`
- 기준 HEAD: `f3a3c1d feat: add controlled full-slide image generation contract`
- 관련 기존 문서: `docs/gppt_project_direction.md`, `docs/gppt_architecture.md`, `docs/codex_ppt_prd.md`, `deck-scribe-craft-07/docs/live-release-decision.md`, `deck-scribe-craft-07/docs/controlled-full-slide-image-generation-direction-2026-07-01.md`

> 이 문서는 전체 아키텍처 설명용 문서다. 런타임 동작 변경, release ready, production accepted를 의미하지 않는다. 현재 release decision은 여전히 `Blocked`다.

---

## 0. Executive Summary

CHATGPPT는 프로젝트/저장소 이름이고, 제품 방향은 GPPT, 현재 구현 앱 이름은 DeckForge다.

**CHATGPPT / GPPT / DeckForge는 사용자가 가진 Codex를 로컬 데스크탑 앱에 연결해, 한 줄 프롬프트를 바로 PPT로 바꾸는 대신 `Brief → Research → Plan → Design → Layout → Full-slide Generation → Review → Editable Output → Export` 단계로 쪼개고, 각 단계의 승인 산출물과 품질 게이트를 통해 실제 제출 가능한 PPT를 만들기 위한 local-first deck production system이다.**

핵심은 “빠른 생성”이 아니라 다음 구조다.

```text
사용자 요청
→ 요구사항 인터뷰
→ 승인된 Brief
→ 출처 기반 Research Pack
→ Deck Plan
→ Design System
→ Layout IR / Prototype
→ Slide Context Bundle
→ Controlled Full-Slide Image Generation
→ Review / QA / Repair
→ Editable Layer Model
→ PPTX/PDF/SVG/Report Export
```

제품 철학은 기존 방향성 문서의 문장으로 요약된다.

> 정확하게 작업하는 게 가장 빠르다.

---

## 1. 이름과 범위

| 이름 | 의미 | 현재 역할 |
|---|---|---|
| `CHATGPPT` / `chatgppt` | GitHub/로컬 프로젝트 이름 | 저장소와 전체 프로젝트 컨텍스트 |
| `GPPT` | 제품 방향명 | “내 Codex로 만드는, AI 티 안 나는 오픈소스 디자인 PPT 도구” |
| `DeckForge` | 현재 구현 앱 이름 | Tauri desktop app, release artifact, 내부 코드 네이밍 |
| `deck-scribe-craft-07` | 앱 소스 디렉터리 | React/Tauri 구현체 |

이 문서에서 `CHATGPPT`는 전체 프로젝트, `GPPT`는 제품 컨셉, `DeckForge`는 현재 앱 구현체를 뜻한다.

---

## 2. 해결하려는 문제

기존 AI PPT 도구의 문제는 “PPT 생성 기능이 없다”가 아니다. 핵심 문제는 다음이다.

1. **AI PPT slop**
   - 과한 그라데이션, 의미 없는 아이콘, 비슷한 템플릿 반복
   - 출처 없는 수치와 가짜 차트
   - 발표자가 설명하기 어려운 추상 문장

2. **컨텍스트 붕괴**
   - 인터뷰에서 확정한 요구가 뒤 단계에서 누락됨
   - 조사 수치가 슬라이드 생성 단계에서 왜곡됨
   - 병렬 생성된 슬라이드가 서로 다른 덱처럼 보임

3. **수정 불가능한 결과물**
   - 예쁜 PNG 한 장은 실제 업무용 PPT가 아니다.
   - 제목, 숫자, 도형, 차트, 캡션이 편집 가능해야 한다.

4. **추가 구독 비용**
   - 사용자가 이미 Codex/ChatGPT 권한을 갖고 있다면, 또 다른 AI PPT SaaS를 필수로 요구하지 않는 구조가 필요하다.

5. **검증 없는 자동화**
   - AI가 그럴듯한 결과를 냈다는 보고만으로는 신뢰할 수 없다.
   - 실제 산출물, hash, provenance, gate 결과가 남아야 한다.

---

## 3. 설계 원칙

### 3.1 Brief-to-Deck, not Prompt-to-PPT

CHATGPPT는 사용자가 쓴 프롬프트를 즉시 슬라이드로 만들지 않는다. 먼저 작업 목적과 성공 기준을 구조화한다.

```text
Prompt-to-PPT     : 프롬프트 → 바로 생성 → 사용자가 고침
Brief-to-Deck     : 프롬프트 → 질문 → 승인된 Brief → 단계별 산출물 → 검증 → export
```

### 3.2 Codex는 “모델”이 아니라 “작업자”다

Codex는 최종 판단자가 아니다. Codex는 다음 역할을 맡는 provider/worker다.

- 질문 생성
- Brief 초안 작성
- Research 정리
- Deck Plan 작성
- Design System 제안
- Layout IR 생성
- Slide generation prompt package 작성
- QA 후보 탐지
- 수정 지시 반영

최종 판단 기준은 `사용자 승인 + 승인된 산출물 hash + deterministic QA gate + export evidence`다.

### 3.3 승인된 산출물이 source of truth다

긴 대화 기록이 아니라, 단계별로 승인된 산출물이 다음 단계의 입력이다.

```text
Approved InterviewBrief
→ Approved ResearchPack
→ Approved DeckPlan
→ Approved DesignSystem
→ Approved LayoutPrototype
→ FrozenDeckContext
→ SlideContextBundle
```

### 3.4 Development / Production / Test는 분리한다

현재 코드에는 execution mode가 존재한다.

| Mode | 목적 | Provider 선택 |
|---|---|---|
| `development` | 로컬 개발, mock demo, 빠른 UI 확인 | Mock Provider |
| `test` | deterministic test / CI | Mock Provider |
| `production` | 실제 사용자 / live provider 경로 | Codex / OpenAIImage |

Production에서 mock/fixture가 export lineage에 섞이면 final export gate가 막아야 한다.

### 3.5 문서는 Done이 아니다

프로젝트 운영 원칙은 다음이다.

```text
Documentation does not imply Done.
AI says passed does not imply Done.
Done implies machine-verifiable evidence exists.
```

따라서 이 아키텍처 문서도 specification이지 release acceptance가 아니다.

---

## 4. 전체 시스템 아키텍처

```text
┌──────────────────────────────────────────────────────────────────┐
│                         User / JAKE                               │
│  topic, goal, audience, constraints, approval, visual feedback     │
└───────────────────────────────┬──────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                    DeckForge Desktop App                          │
│                 Tauri v2 + WebView + Local-first UX               │
└───────────────────────────────┬──────────────────────────────────┘
                                │
        ┌───────────────────────┴────────────────────────┐
        ▼                                                ▼
┌──────────────────────────────┐              ┌──────────────────────────────┐
│ Frontend Workflow UI          │              │ Tauri / Rust Core             │
│ React 19 + TS + TanStack      │              │ local process + filesystem    │
│                              │              │                              │
│ - Project Workspace           │              │ - Codex CLI/App Server bridge │
│ - Stage UI                    │              │ - login status / terminal     │
│ - Approval gates              │              │ - project folder              │
│ - Provider status             │              │ - filesystem access boundary  │
│ - Review gallery              │              │ - sensitive operation boundary│
│ - Editor / Export UI          │              │                              │
└──────────────┬───────────────┘              └──────────────┬───────────────┘
               │ Tauri commands / events                     │
               └───────────────────────┬────────────────────┘
                                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                         Provider Layer                            │
│                                                                  │
│ DeckProvider Interface                                            │
│ - CodexProvider: text/research/planning/design/layout QA worker   │
│ - OpenAIImageProvider: image/full-slide raster generation fallback│
│ - MockProvider: deterministic dev/test path                       │
│ - LocalProvider: future local model extension point               │
└───────────────────────────────┬──────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                 Artifact / Context / Evidence Layer               │
│                                                                  │
│ InterviewBrief, ResearchPack, DeckPlan, DesignSystem,             │
│ LayoutPrototype, FrozenDeckContext, SlideContextBundle,           │
│ GeneratedSlide, EditableLayerModel, ApprovalLog,                  │
│ ProviderProvenance, GenerationReport, ExportPackage               │
└───────────────────────────────┬──────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                       Output / QA / Release Layer                 │
│                                                                  │
│ PNG/SVG/Hybrid SVG/PPTX/PDF/HTML, Generation Report,              │
│ live evidence bundle, package QA, clean-machine evidence, UAT     │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5. 기술 스택

| Layer | 현재 기술 |
|---|---|
| Desktop shell | Tauri v2 |
| Backend core | Rust |
| Frontend | React 19, TypeScript 5.8, Vite 7, TanStack Router/Start 계열 |
| UI/UX | Radix UI, Tailwind CSS, Lucide, Recharts |
| Runtime/package/test | Bun |
| Validation | `tsc`, `bun test`, ESLint, Vite build, Cargo fmt/test/clippy |
| Export/QA scripts | package dry-run, frontend screen QA, production UI E2E, release evidence validators |
| Local artifacts | filesystem project folders, release artifacts, evidence bundles |

현재 `package.json` 기준 주요 명령은 다음이다.

```bash
bun run typecheck
bun test
bun run build
bun run lint
bun run qa:frontend
bun run qa:production-ui
bun run qa:ui-contract
bun run qa:release-artifact
bun run qa:package
bun run qa:powerpoint-round-trip
bun run qa:clean-machine
bun run tauri:build
bun run rust:fmt
bun run rust:test
bun run rust:clippy
```

---

## 6. Frontend Layer

Frontend는 “AI 결과를 보여주는 화면”이 아니라, 사용자가 전체 제작 흐름을 통제하는 workflow console이다.

주요 책임:

1. 프로젝트 생성
   - 목적, 초기 프롬프트, 슬라이드 수, 화면비, 언어 입력
2. 단계 진행 표시
   - 현재 stage / step 표시
   - downstream invalidation 표시
3. 산출물 검토
   - Brief, Research Pack, Deck Plan, Design System, Layout, Slides preview
4. 승인 게이트
   - 사용자가 승인하지 않으면 다음 단계로 넘어가지 않음
5. Provider 상태 표시
   - Codex 로그인 필요, bridge detected, API key 필요, live test failed 등
6. 오류 복구
   - retry, manual input, blocked reason 표시
7. Review gallery
   - generated slide, compositor preview, regeneration candidate 확인
8. Editor / Export
   - editable layer 확인, export package 확인

현재 단계 모델은 `src/lib/deck-types.ts` 기준 다음과 같다.

```text
PROJECT_CREATED
→ INTERVIEWING
→ INTERVIEW_APPROVAL_PENDING
→ RESEARCHING
→ RESEARCH_APPROVAL_PENDING
→ PLANNING
→ PLAN_APPROVAL_PENDING
→ DESIGNING
→ DESIGN_APPROVAL_PENDING
→ PROTOTYPING_LAYOUT
→ LAYOUT_APPROVAL_PENDING
→ GENERATING_SLIDES
→ SLIDE_REVIEW_PENDING
→ VECTORIZE_PENDING
→ VECTORIZING
→ EDITABLE_REVIEW_PENDING
→ EDITOR
→ FINAL_REPORTING
→ EXPORT_READY
```

사용자에게 노출되는 StepKey는 다음이다.

```text
project → interview → research → plan → design → layout → generate → review → editor → export
```

---

## 7. Tauri / Rust Core Layer

Tauri Core는 renderer가 직접 하면 안 되는 일을 담당한다.

현재 `src-tauri/src/lib.rs` 기준 주요 command는 다음이다.

| Command | 역할 |
|---|---|
| `deckforge_app_info` | 앱 이름, 버전, desktop runtime 노출 |
| `deckforge_codex_app_server_smoke` | Codex App Server 연결 smoke evidence 생성 |
| `deckforge_codex_app_server_structured_turn` | schema-constrained structured turn 실행 |
| `deckforge_codex_login_status` | Codex CLI 로그인 상태 확인 |
| `deckforge_open_codex_login_terminal` | Codex 로그인용 터미널 열기 |
| `deckforge_prepare_project_folder` | 앱 데이터 디렉터리 아래 프로젝트 폴더 준비 |
| `deckforge_reveal_project_folder` | 프로젝트 폴더 열기 |

보안상 renderer에서 금지할 일:

- Codex auth 파일 직접 접근
- API key 평문 저장
- 임의 로컬 프로세스 실행
- 프로젝트 파일에 토큰 저장
- 로그에 민감정보 출력

Rust/Tauri Core가 맡아야 할 일:

- Codex CLI/App Server 호출
- 로그인 상태 확인
- app data dir / project folder 접근
- provider credential validation
- export file 저장
- 민감 작업 격리

---

## 8. Provider Adapter Layer

Provider Adapter는 Codex/OAuth/API/Image 권한의 불확실성을 숨기지 않고 구조화하기 위한 계층이다.

현재 `DeckProvider` interface는 다음 작업을 추상화한다.

```text
getStatus()
createInterviewBrief()
createResearchPack()
createDeckPlan()
createDesignSystem()
createLayoutPrototype()
createGeneratedSlides()
createEditableLayers()
```

Provider capability는 다음 단위로 나뉜다.

```text
interview
research
deckPlan
designSystem
layoutPrototype
imageGeneration
editableLayers
```

Provider 종류:

| Provider | 역할 | 사용 범위 |
|---|---|---|
| `CodexProvider` | Codex/ChatGPT 로그인 기반 text, research, plan, design, QA worker | production 우선 |
| `OpenAIImageProvider` | 이미지 API 직접 호출이 필요한 경우 | production image fallback |
| `MockProvider` | deterministic 응답 | development/test only |
| `LocalProvider` | 로컬 모델/온디바이스 확장 | future extension |

Provider 선택 원칙:

1. Codex가 기본 provider다.
2. API key provider는 fallback 또는 개발자 경로다.
3. Codex OAuth와 일반 OpenAI API 권한을 혼용하지 않는다.
4. production export에는 mock/fixture lineage가 섞이면 안 된다.
5. provider 결과는 provenance와 request metadata를 남긴다.

---

## 9. 핵심 도메인 모델

`DeckProject`는 하나의 PPT 제작 작업 전체를 담는 루트 엔티티다.

```text
DeckProject
├─ id / name / initialPrompt
├─ aspectRatio / language / slideCount
├─ stage
├─ InterviewBrief
├─ ResearchPack
├─ DeckPlan
├─ DesignSystem
├─ LayoutPrototype
├─ GeneratedSlide[]
├─ EditableLayerModel[]
├─ ProjectExportSummary
├─ LiveTextArtifactRecord[]
├─ ImagePathDecisionRecord
├─ invalidated
├─ workflowErrors
└─ ApprovalLogEntry[]
```

핵심 산출물:

| Artifact | 역할 |
|---|---|
| `InterviewBrief` | 목적, 청중, 성공 기준, 금지사항, 필수 포함사항 정의 |
| `ResearchPack` | 출처, 주장, 데이터셋, numeric evidence, fact-check 결과 |
| `DeckPlan` | 슬라이드 순서, 역할, 핵심 메시지, evidence 연결 |
| `DesignSystem` | 캔버스, safe margin, grid, color, typography, component rules, negative rules |
| `LayoutPrototype` | HTML layout, preview PNG, DOM layer, bounds, validation report |
| `FrozenDeckContext` | 승인된 산출물로 freeze된 deck-level context |
| `SlideContextBundle` | slide별 generation worker에게 전달되는 최소 컨텍스트 |
| `GeneratedSlide` | 생성된 슬라이드 버전과 상태 |
| `EditableLayerModel` | text/shape/image/chart 레이어의 편집 가능 구조 |
| `ApprovalLogEntry` | stage, artifact hash, version, approval audit trail |
| `ProjectExportSummary` | export artifact id/hash, PNG/SVG/PPTX/Report 경로 요약 |

---

## 10. Invalidation / Approval Architecture

CHATGPPT의 핵심은 “이전 단계가 바뀌면 이후 결과를 신뢰하지 않는다”는 것이다.

예시:

```text
InterviewBrief 변경
→ ResearchPack invalidated
→ DeckPlan invalidated
→ DesignSystem invalidated
→ LayoutPrototype invalidated
→ GeneratedSlide invalidated
→ Export invalidated

DesignSystem 변경
→ LayoutPrototype invalidated
→ GeneratedSlide invalidated
→ EditableLayerModel invalidated
→ Export invalidated
```

각 승인 산출물은 `approvedHash`를 가질 수 있고, 다음 단계는 이 hash를 기준으로 입력 신뢰성을 판단한다.

이 구조는 AI 결과를 단순 출력물로 보지 않고, 단계별 contract로 다루는 설계다.

---

## 11. Research / Evidence Architecture

Research layer의 목적은 “AI가 사실처럼 말하게 하는 것”이 아니라 “슬라이드 주장과 출처를 연결하는 것”이다.

주요 개념:

- Source metadata
- Source capture / recapture history
- Claim
- Numeric evidence
- Dataset
- Fact check report
- Source review decision
- Live evidence refs
- Provider provenance lineage

Production research 경로에서 필요한 조건:

1. live web search event log
2. source capture metadata
3. HTML/PDF source artifact
4. claim ↔ source ↔ dataset 연결
5. pending reinforcement request 없음
6. approved ResearchPack hash
7. mock/cached-only fallback 차단

이 구조는 출처 없는 통계나 가짜 chart 생성을 막기 위한 기반이다.

---

## 12. Slide Context Bundle Architecture

Slide generation worker는 전체 대화 기록을 받지 않는다. 승인된 context bundle만 받는다.

`SlideContextBundle` 주요 필드:

```text
bundleId
deckContextId
deckContextHash
designSystemId
globalSummary
  - goal
  - audience
  - tone
  - slideCount
  - language
designTokens
  - colors
  - typography
  - layoutRules
  - componentRules
  - visualLanguage
  - negativeRules
layoutPrototype
  - layoutPrototypeId
  - layoutScreenshot
  - domLayers
slideSpec
  - slideNumber
  - title
  - role
  - message
  - visualType
sourceMap
facts
```

목적:

- 병렬 생성 시 deck consistency 유지
- 승인된 요구사항 누락 방지
- source 없는 주장 생성 방지
- Design System 이탈 방지
- 부분 재생성 시 영향 범위 추적

---

## 13. 이미지 생성 아키텍처: Controlled Full-Slide Image Generation

2026-07-01 기준 최신 제품 방향은 단순 HTML render 또는 deterministic PPT assembly가 아니라 **controlled full-slide image generation**이다.

핵심 교정:

```text
목표가 아님:
AI background + deterministic text overlay
AI visual asset slicing + deterministic PPT assembly
HTML/PPT/PDF render preview를 image generation이라고 부르기

목표:
image model이 완성된 16:9 presentation slide raster 자체를 생성한다.
DeckForge가 contract, prompt package, reference/control image, visual gate, targeted repair loop로 이를 제어한다.
```

Target architecture:

```text
human topic/request
→ deck brief
→ slide role/spec
→ Slide Image Control Contract
→ provider-specific prompt package
→ full-slide provider request
→ raw generated full-slide raster
→ visual control gate
→ targeted regeneration/repair
→ human visual tester review
```

Slide Image Control Contract는 다음을 포함해야 한다.

- `output_kind=full_presentation_slide`
- `design_system_id`
- `design_consistency_contract_id`
- 16:9 canvas / safe area
- locked palette
- typography hierarchy
- card / node-line / icon component grammar
- allowed variation
- forbidden failures: cropped text, fake microcopy, mask leakage, overlap, poster-only composition

중요한 아키텍처 원칙:

1. generated image는 “배경”이 아니라 “완성 슬라이드 래스터”다.
2. deterministic rendering은 product answer가 아니라 oracle/reference/control input으로 사용한다.
3. visual gate는 사람이 보기 전에 axis별 실패를 찾아야 한다.
4. 실패 시 random reroll이 아니라 targeted repair request를 생성한다.
5. regeneration은 `slide_04.v2.png`처럼 버전이 남아야 한다.

---

## 14. Editable Output / Export Architecture

CHATGPPT는 PNG 한 장으로 끝나면 안 된다.

Export 목표:

- PNG preview
- SVG export
- Hybrid SVG / editable SVG
- PPTX
- PDF
- project JSON
- generation report
- source/provenance/audit bundle

Final export gate는 다음을 확인한다.

| Gate | 의미 |
|---|---|
| invalidated artifact 없음 | 상위 산출물 변경 후 재검증 없이 export 금지 |
| fatal workflow error 없음 | 오류 상태 export 차단 |
| export package 존재 | PNG/SVG/hybrid/project file/report 필요 |
| generation report 완성 | prompt version, export artifact reference 포함 |
| production lineage clean | mock/fixture contamination 차단 |
| live report lineage 존재 | production slide-level lineage 필요 |

현재 `evaluateFinalExportGate`는 production mode에서 mock/fixture lineage, missing live report lineage, invalidated artifact, missing export package 등을 blocked issue로 반환한다.

---

## 15. QA / Evidence / Release Architecture

QA는 마지막 체크리스트가 아니라 전체 아키텍처의 일부다.

### 15.1 Local quality gates

일반 코드/앱 검증:

```bash
bun run typecheck
bun test
bun run lint
bun run build
bun run rust:fmt
bun run rust:test
bun run rust:clippy
```

### 15.2 Product-surface QA

```bash
bun run qa:frontend
bun run qa:production-ui
bun run qa:ui-contract
bun run qa:package
bun run qa:release-artifact
bun run qa:powerpoint-round-trip
```

### 15.3 Release evidence gates

Public/internal release acceptance에는 다음이 필요하다.

- frozen release candidate artifact
- package hash / checksum manifest
- packaged app golden path
- signed/notarized DMG
- Gatekeeper validation
- clean-machine macOS account validation
- PowerPoint open/edit/save/reopen round-trip
- non-developer UAT
- final evidence bundle secret scan
- QA / Release Owner sign-off

현재 `docs/live-release-decision.md` 기준 release decision은 `Blocked`다. 로컬 테스트와 일부 package QA가 통과했더라도, live packaged Golden Path, clean-machine, notarization, non-developer UAT가 없으면 release ready라고 말하면 안 된다.

---

## 16. 저장소 / 파일 구조

주요 경로:

```text
/Users/jake/chatgppt
├─ docs/
│  ├─ gppt_project_direction.md
│  ├─ gppt_architecture.md
│  ├─ chatgppt_full_architecture.md
│  ├─ codex_ppt_prd.md
│  ├─ codex_ppt_ticket_breakdown.md
│  ├─ ai_worker_operating_contract.md
│  └─ project_status_briefing_2026-06-24.md
└─ deck-scribe-craft-07/
   ├─ src/
   │  ├─ components/deck/
   │  ├─ lib/
   │  │  ├─ deck-types.ts
   │  │  ├─ provider-types.ts
   │  │  ├─ provider-runtime-selection.ts
   │  │  ├─ slide-context-bundle.ts
   │  │  ├─ final-export-gate.ts
   │  │  ├─ generation-report.ts
   │  │  ├─ image-artifact-store.ts
   │  │  ├─ live-* modules
   │  │  └─ production-* modules
   │  └─ routes/
   ├─ src-tauri/
   │  └─ src/lib.rs
   ├─ scripts/
   │  ├─ frontend-screen-qa.mjs
   │  ├─ production-ui-e2e.mjs
   │  ├─ package-native-qa.mjs
   │  └─ release evidence validators
   ├─ docs/
   │  ├─ live-release-decision.md
   │  ├─ live-readiness-audit.md
   │  ├─ controlled-full-slide-image-generation-direction-2026-07-01.md
   │  └─ full-slide / live evidence docs
   └─ release-artifacts/
```

---

## 17. Runtime Flow

### 17.1 Development flow

```text
User creates project
→ development mode selected
→ MockProvider available
→ deterministic brief/research/plan/design/layout/slides
→ local preview/review/export
→ development lineage warning / MOCK MODE where relevant
```

용도:

- UI 개발
- deterministic tests
- fast local workflow verification

주의:

- development mock result는 production/live evidence가 아니다.

### 17.2 Production text flow

```text
User creates project
→ Codex login status checked
→ App Server bridge ready
→ interview questions live turn
→ user answers / follow-up if needed
→ Brief live turn
→ Research live path
→ Deck Plan live turn
→ Design System live turn
→ Layout IR live turn
→ accepted live text artifacts persisted
```

필수 evidence:

- thread id / turn id
- schema-valid output
- provider provenance
- accepted artifact ids
- input lineage
- no mock/fixture contamination

### 17.3 Production image flow

```text
approved Brief/Research/Plan/Design/Layout
→ image path decision locked
→ full-slide design consistency contract
→ prompt packages per slide
→ provider requests with output_kind=full_presentation_slide
→ stored PNG artifacts with request metadata and hashes
→ visual control gate
→ selected slide regeneration
→ generation report lineage
→ export package
```

### 17.4 Export flow

```text
approved project artifacts
→ build export package
→ generate report
→ evaluate final export gate
→ write PNG/SVG/Hybrid/PPTX/PDF/project/report
→ verify structure and hashes
→ release evidence bundle if release scoped
```

---

## 18. 보안 경계

| Risk | Architecture response |
|---|---|
| Codex auth/token leakage | renderer 접근 금지, Rust/Tauri command 경유 |
| API key 저장 | frontend/project/log 저장 금지, fallback/dev mode 분리 |
| prompt injection from web source | fetched source를 `untrusted_source_content`로 취급 |
| production mock contamination | provider provenance / final export gate에서 차단 |
| local developer path leakage | package scan / remap path / release QA 필요 |
| release evidence secret leakage | evidence secret scan 필요 |
| dirty worktree release claim | exact source/artifact/evidence identity 없으면 local candidate만 주장 |

---

## 19. 현재 상태와 known limits

### 현재 강한 점

- 제품 방향성은 선명하다: Brief-to-Deck, BYO Codex, approval gates, evidence/provenance, editable output.
- Tauri desktop 구조와 Rust command boundary가 있다.
- `DeckProject`, provider interface, stage model, slide context bundle, final export gate가 코드화되어 있다.
- production mock contamination을 막는 정책과 gate가 늘어났다.
- controlled full-slide image generation 방향이 문서화되었고, 관련 contract 구현 commit이 존재한다.
- 로컬 테스트/빌드/QA evidence는 누적되어 있다.

### 현재 한계

- release decision은 `Blocked`다.
- production packaged app에서 전체 live golden path가 아직 승인되지 않았다.
- clean-machine Codex login / image credential / live interview / live research / live image generation / export evidence가 부족하다.
- Developer ID signing, notarization, Gatekeeper validation evidence가 없다.
- PowerPoint round-trip과 non-developer UAT가 release acceptance 수준으로 완료되지 않았다.
- generated full-slide raster에서 작은 한국어/body text 왜곡 문제가 남아 있다.
- worktree에는 release artifacts와 docs, `.omx` evidence 등이 많이 섞여 있어 source/artifact identity 관리가 중요하다.

---

## 20. 아키텍처 판단 요약

CHATGPPT의 핵심 아키텍처는 다음 10가지로 정리된다.

1. **Local-first Tauri desktop app**으로 구현한다.
2. **Frontend는 workflow/approval/review/editor surface**를 담당한다.
3. **Rust/Tauri Core는 Codex bridge, local process, filesystem, sensitive boundary**를 담당한다.
4. **AI 연동은 Provider Adapter**로 추상화한다.
5. **Codex는 기본 worker/provider**이고, image/API provider는 분리한다.
6. **긴 대화가 아니라 승인된 산출물과 frozen context**가 source of truth다.
7. **SlideContextBundle**로 병렬 생성과 일관성을 관리한다.
8. **Controlled full-slide image generation**이 최신 이미지 생성 방향이다.
9. **EditableLayerModel과 export gate**가 “실제 PPT로 쓸 수 있음”의 핵심이다.
10. **Evidence-first release gate** 없이는 Done/Release Ready라고 주장하지 않는다.

---

## 21. 다음 아키텍처 작업 제안

문서 기준 다음 작업은 구현이 아니라 우선순위 정리다.

1. `gppt_architecture.md`와 이 문서 중 canonical architecture doc을 하나로 정리한다.
2. `CHATGPPT / GPPT / DeckForge` 네이밍 정책을 README와 package metadata에 반영한다.
3. production live vertical slice를 한 개만 닫는다.
   ```text
   project → Codex login → interview → research → plan → design → layout → 5 full-slide images → regeneration → edit → export → report
   ```
4. controlled full-slide image generation contract를 provider request, artifact store, visual control gate, repair loop까지 연결한다.
5. release artifact identity를 정리한다.
   - frozen artifact
   - checksum
   - source SHA
   - QA evidence bundle
   - clean-machine result
6. PowerPoint round-trip과 non-developer UAT를 release gate로 고정한다.

---

## 22. 최종 결론

CHATGPPT는 단순 PPT 생성기가 아니라, **AI가 만든 결과를 사용자가 믿고 제출할 수 있게 만드는 evidence-based deck production architecture**다.

아키텍처의 중심은 모델 호출이 아니다.

```text
승인된 산출물
+ Provider provenance
+ Context bundle
+ Controlled full-slide generation
+ Editable layer model
+ Deterministic QA gate
+ Export evidence
```

이 조합이 CHATGPPT/GPPT/DeckForge의 전체 구조다.

현재는 local candidate와 live-readiness 구현이 상당히 진행된 상태지만, release acceptance는 별도다. 따라서 이 문서의 결론은 다음이다.

> CHATGPPT의 아키텍처 방향은 명확하다.
> 다음 병목은 더 많은 문서가 아니라, packaged production live vertical slice와 clean evidence를 실제로 닫는 것이다.
