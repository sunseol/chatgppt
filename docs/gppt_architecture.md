# GPPT 아키텍처 문서

- 문서 버전: v0.1
- 작성일: 2026-06-19
- 기준 문서: `docs/gppt_project_direction.md`, `docs/codex_ppt_prd.md`
- 현재 코드 기준: `/Users/jake/chatgppt/deck-scribe-craft-07`
- 표기 원칙: 프로젝트 문서에서는 창업자/첫 사용자를 `JAKE`로 표기한다.

---

## 1. 아키텍처 한 줄 정의

**GPPT는 사용자가 가진 Codex를 로컬 데스크탑 앱에 연결하고, 승인된 산출물과 품질 게이트를 따라 PPT를 생성·검증·편집·export하는 로컬 우선 오픈소스 PPT 제작 시스템이다.**

이 아키텍처는 “한 번에 PPT를 생성하는 앱”이 아니라, `Brief → 승인된 컨텍스트 → 슬라이드 생성 → QA → 편집 가능한 산출물`로 이어지는 작업 파이프라인을 제품의 중심 구조로 둔다.

---

## 2. 설계 원칙

### 2.1 정확한 작업 흐름이 속도를 만든다

GPPT의 제품 철학은 “정확하게 작업하는 게 가장 빠르다”이다. 따라서 아키텍처도 빠른 단일 생성보다 다음을 우선한다.

- 중간 산출물 분리
- 사용자 승인 게이트
- 컨텍스트 버전 고정
- 출처와 생성 이력 보존
- 부분 수정 가능성
- 최종 export 전 QA

### 2.2 Codex는 모델이 아니라 작업자다

Codex는 단순히 텍스트를 생성하는 모델이 아니다. GPPT 안에서는 다음 일을 수행하는 작업자/검토자 역할을 한다.

- brief 분석
- 질문 생성
- 리서치/근거 정리
- 슬라이드 구조화
- 디자인 시스템 제안
- 레이아웃 초안 생성
- 슬라이드 생성 지시
- QA와 수정 반영

최종 판단자는 Codex가 아니라 `승인된 산출물 + 사용자 승인 + QA 게이트`다.

### 2.3 추가 AI 구독제를 전제로 하지 않는다

GPPT는 사용자가 이미 가진 Codex/ChatGPT 권한을 활용하는 `Bring Your Own Codex` 구조를 우선한다.

단, 이미지 생성이나 특정 API 권한이 Codex 경유로 불가능할 수 있으므로 Provider Adapter를 둔다. 이 구조는 제품 철학을 지키면서도 기술 불확실성을 숨기지 않기 위한 장치다.

### 2.4 AI slop 방지는 기능이 아니라 구조다

AI slop을 줄이기 위해 단순히 “좋은 프롬프트”에 의존하지 않는다. GPPT는 다음 구조로 slop을 줄인다.

- 목적/청중/성공 기준을 brief에서 고정
- 조사와 출처를 별도 산출물로 분리
- 덱 플랜과 디자인 시스템을 승인 후 고정
- 슬라이드별 Context Bundle을 생성
- 슬라이드 생성 후 QA와 수정 루프 실행
- 최종 산출물은 편집 가능한 객체로 유지

---

## 3. 전체 시스템 구조

```text
┌─────────────────────────────────────────────────────────────┐
│                       GPPT Desktop App                       │
│                     Tauri v2 + WebView UI                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Frontend Layer                          │
│  React / TanStack Router / Project Workflow UI               │
│                                                             │
│  - 프로젝트 생성                                             │
│  - 단계별 승인 UI                                            │
│  - 리서치 검토                                               │
│  - 디자인 시스템 검토                                        │
│  - 레이아웃/슬라이드 리뷰                                    │
│  - 편집기 / export UI                                        │
└─────────────────────────────────────────────────────────────┘
                              │ Tauri command / event
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Tauri Core Layer                         │
│                         Rust Backend                         │
│                                                             │
│  - 로컬 파일 접근                                            │
│  - Codex App Server / CLI 실행                               │
│  - 인증 상태 확인                                            │
│  - 민감 작업 격리                                            │
│  - 아티팩트 저장                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Provider Adapter Layer                    │
│                                                             │
│  DeckProvider Interface                                      │
│   ├─ CodexProvider                                           │
│   ├─ OpenAIImageProvider                                     │
│   ├─ MockProvider                                            │
│   └─ LocalProvider                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Artifact & Context Layer                  │
│                                                             │
│  - InterviewBrief                                            │
│  - ResearchPack                                              │
│  - DeckPlan                                                  │
│  - DesignSystem                                              │
│  - LayoutPrototype                                           │
│  - SlideContextBundle                                        │
│  - GeneratedSlide                                            │
│  - EditableLayerModel                                        │
│  - ApprovalLog                                               │
│  - FinalExportPackage                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. 런타임 아키텍처

### 4.1 데스크탑 앱

MVP 런타임은 Tauri v2 기반 데스크탑 앱이다.

현재 코드 기준:

- 앱 루트: `deck-scribe-craft-07`
- 프론트엔드: TypeScript + React
- 라우팅/앱 구조: TanStack 계열
- 데스크탑 백엔드: Rust 기반 Tauri Core
- 현재 Tauri 앱 정보 노출: `src-tauri/src/lib.rs`
- 현재 앱 이름 코드상 표기: `DeckForge`

GPPT는 제품/프로젝트 방향성 이름이고, 현재 코드베이스 내부 구현명은 `DeckForge` 계열이 섞여 있다. 문서에서는 GPPT를 제품 방향명으로 쓰고, 코드 구현명은 필요 시 DeckForge로 병기한다.

### 4.2 Frontend Layer

Frontend Layer의 책임은 사용자에게 작업 흐름을 보여주고, 승인/검토/수정 입력을 받는 것이다.

주요 책임:

- 프로젝트 생성
- 현재 단계 표시
- 산출물 preview
- 사용자 승인 버튼 제공
- invalidated 상태 표시
- provider 상태 표시
- 에러 복구 UI
- export 결과 확인

현재 단계 모델은 `src/lib/deck-types.ts`의 `Stage`, `StepKey`, `STEPS`에 이미 반영되어 있다.

```text
project
→ interview
→ research
→ plan
→ design
→ layout
→ generate
→ review
→ vectorize/editor
→ export
```

### 4.3 Tauri Core Layer

Tauri Core Layer는 민감 작업을 프론트엔드에서 분리한다.

주요 책임:

- Codex App Server smoke test
- Codex structured turn 실행
- 로컬 프로세스 호출
- 파일 시스템 접근
- 인증 상태 확인
- 향후 SQLite/아티팩트 저장소 접근
- Tauri permission/capability 기반 권한 제한

현재 `src-tauri/src/lib.rs`에서 노출되는 주요 command는 다음과 같다.

```text
deckforge_app_info
deckforge_codex_app_server_smoke
deckforge_codex_app_server_structured_turn
```

이 구조는 renderer가 Codex 인증 파일이나 로컬 프로세스에 직접 접근하지 않도록 막는 방향과 맞다.

---

## 5. 핵심 도메인 모델

현재 도메인 모델은 `src/lib/deck-types.ts`와 `src/lib/provider-types.ts`를 중심으로 잡혀 있다.

### 5.1 DeckProject

`DeckProject`는 하나의 PPT 제작 작업 전체를 담는 루트 엔티티다.

핵심 필드:

```text
id
name
initialPrompt
aspectRatio
language
slideCount
stage
brief
research
plan
design
layout
slides
layers
exportPackage
liveTextArtifacts
imagePathDecision
invalidated
workflowErrors
approvalLog
```

### 5.2 승인 산출물

GPPT는 대화 기록이 아니라 승인된 산출물을 기준으로 다음 단계를 진행한다.

핵심 산출물:

| 산출물 | 역할 |
|---|---|
| `InterviewBrief` | 목적, 청중, 결과물 기준, 금지사항, 성공 기준 정의 |
| `ResearchPack` | 출처, 주장, 데이터셋, 차트, fact check 결과 보관 |
| `DeckPlan` | 슬라이드 순서, 각 장의 역할, 핵심 메시지, 근거 연결 |
| `DesignSystem` | 캔버스, 그리드, 색상, 타이포, 레이아웃 규칙, negative rules 정의 |
| `LayoutPrototype` | HTML 기반 배치 초안, DOM layer, 레이아웃 검증 결과 |
| `GeneratedSlide` | 생성된 슬라이드 이미지/버전/상태 |
| `EditableLayerModel` | 최종 편집 가능한 텍스트/도형/이미지/차트 레이어 모델 |
| `ApprovalLogEntry` | 승인 단계, 승인 시각, hash, artifact 버전 기록 |

### 5.3 invalidation 모델

상위 산출물이 바뀌면 이후 단계 산출물은 무효화되어야 한다.

예시:

```text
InterviewBrief 변경
→ ResearchPack, DeckPlan, DesignSystem, LayoutPrototype, GeneratedSlide, Export 무효화

DesignSystem 변경
→ LayoutPrototype, GeneratedSlide, EditableLayerModel, Export 무효화
```

이 원칙은 GPPT가 “왔던 길을 반복하지 않기 위해 정확하게 작업한다”는 철학을 코드 수준에서 보장한다.

---

## 6. Provider Adapter 아키텍처

### 6.1 DeckProvider Interface

현재 provider 추상화는 `src/lib/provider-types.ts`에 정의되어 있다.

```text
DeckProvider
  - getStatus()
  - createInterviewBrief()
  - createResearchPack()
  - createDeckPlan()
  - createDesignSystem()
  - createLayoutPrototype()
  - createGeneratedSlides()
  - createEditableLayers()
```

Provider capability는 다음 작업 단위를 기준으로 나뉜다.

```text
interview
research
deckPlan
designSystem
layoutPrototype
imageGeneration
editableLayers
```

### 6.2 Provider 종류

```text
mock
codex
openaiImage
local
```

각 provider의 책임은 다음과 같다.

| Provider | 역할 |
|---|---|
| `CodexProvider` | 사용자 Codex/ChatGPT 로그인 기반으로 텍스트 작업, 구조화 작업, QA 작업 수행 |
| `OpenAIImageProvider` | Codex 경유가 불가능한 이미지 생성 API 호출을 별도 처리 |
| `MockProvider` | 테스트/CI/오프라인 데모용 deterministic 응답 제공 |
| `LocalProvider` | 향후 로컬 모델 또는 온디바이스 실행을 위한 확장 지점 |

### 6.3 Provider 선택 원칙

1. Codex를 우선 provider로 사용한다.
2. API Key 기반 provider는 fallback 또는 개발자 모드로 둔다.
3. 이미지 생성 권한은 Codex OAuth와 분리될 수 있음을 전제로 한다.
4. 사용자의 인증 토큰은 프로젝트 파일, 프론트엔드 상태, 로그에 저장하지 않는다.
5. provider 결과에는 provenance를 남겨야 한다.

---

## 7. 작업 파이프라인

GPPT의 핵심 파이프라인은 다음과 같다.

```text
1. Project Setup
   - initialPrompt, slideCount, aspectRatio, language 설정

2. Interview
   - 목적, 청중, 결과물 기준, 금지사항, 성공 기준 도출
   - InterviewBrief 생성
   - 사용자 승인

3. Research
   - 필요한 근거/출처/데이터 수집 또는 정리
   - ResearchPack 생성
   - 사용자 승인

4. Planning
   - DeckPlan Markdown 생성
   - SlideSpec 단위로 역할/메시지/근거 연결
   - 사용자 승인

5. Design System
   - 캔버스, 컬러, 타이포, 레이아웃 규칙, negative rules 생성
   - 사용자 승인

6. Layout Prototype
   - HTML 기반 슬라이드 배치 초안 생성
   - DOM layer와 bounds 추출
   - LayoutValidationReport 생성
   - 사용자 승인

7. Slide Generation
   - Slide Context Bundle 생성
   - 필요 시 병렬 생성
   - GeneratedSlide 버전 관리

8. Review / QA
   - 내용 QA
   - 디자인 QA
   - 출처 QA
   - AI slop QA
   - 부분 재생성 또는 수정

9. Editable Layer Conversion
   - 텍스트, 도형, 이미지, 차트 레이어 분리
   - EditableLayerModel 생성

10. Export
   - PPTX/PDF/HTML/SVG 등 최종 export
   - Final Report와 audit trail 포함
```

---

## 8. Context Bundle 구조

GPPT는 긴 대화 기록에 의존하지 않는다. 각 생성 작업자는 승인된 산출물로 구성된 Context Bundle만 받는다.

```json
{
  "deck_context_version": "deckctx_0007",
  "project_brief": "approved_brief_v3",
  "research_pack": "research_pack_v2",
  "deck_plan": "deck_plan_v5",
  "design_system": "design_system_v4",
  "slide_spec": "slide_04_v2",
  "source_map": ["claim_001", "dataset_003"],
  "global_constraints": [
    "16:9 canvas",
    "use approved palette only",
    "keep title area consistent",
    "no unsourced statistics",
    "keep text editable later",
    "avoid AI PPT slop patterns"
  ]
}
```

Context Bundle의 목적은 다음이다.

- 병렬 생성 시 슬라이드 간 일관성 유지
- 승인된 요구사항 누락 방지
- 출처 없는 수치 생성 방지
- 디자인 시스템 이탈 방지
- 수정 요청 시 영향 범위 추적

---

## 9. 저장소와 아티팩트 구조

MVP 저장소는 다음 두 축으로 분리한다.

### 9.1 구조화 데이터

구조화 데이터는 SQLite 또는 JSON 기반 project store에 저장한다.

저장 대상:

- Project metadata
- Stage 상태
- ApprovalLog
- ResearchPack metadata
- DeckPlan
- DesignSystem
- LayoutPrototype metadata
- Workflow errors
- Provider provenance

### 9.2 파일 아티팩트

큰 파일이나 binary 성격의 산출물은 파일 시스템에 저장한다.

저장 대상:

- layout preview PNG
- generated slide images
- SVG/HTML prototype
- exported PPTX/PDF
- final report
- source capture bundle
- audit bundle

권장 구조:

```text
~/Library/Application Support/GPPT/projects/{projectId}/
  project.json
  approvals/
  research/
  layouts/
  slides/
  layers/
  exports/
  audit/
```

현재 코드베이스에는 image artifact, research source capture, generation report lineage, live text artifact 관련 모듈이 이미 존재하므로 이 구조와 맞춰 확장한다.

---

## 10. QA 게이트

GPPT의 QA는 export 직전 체크리스트가 아니라 각 단계 사이의 게이트다.

### 10.1 내용 QA

- 목적/청중/성공 기준과 슬라이드 메시지가 맞는가?
- 출처가 필요한 주장은 source map이 있는가?
- 숫자/그래프/표가 근거 없이 생성되지 않았는가?
- 발표자가 설명 가능한 문장인가?

### 10.2 디자인 QA

- 디자인 시스템을 벗어난 색상/타이포/여백이 있는가?
- 슬라이드별 정보 밀도가 과하거나 빈약하지 않은가?
- 의미 없는 아이콘/장식이 들어갔는가?
- 레이아웃 리듬이 덱 전체에서 유지되는가?

### 10.3 AI slop QA

- 과한 그라데이션이나 뻔한 AI PPT 스타일이 보이는가?
- 제목이 추상적이고 빈약한가?
- 이미지나 아이콘이 메시지와 무관한 filler인가?
- 문장이 AI 요약문처럼 뭉개졌는가?
- 실제 사용자가 수정해야 할 부분이 과도한가?

### 10.4 Export QA

- 최종 파일이 열리는가?
- 주요 텍스트가 편집 가능한가?
- 이미지/차트/도형 위치가 깨지지 않았는가?
- 승인 이력과 생성 이력이 final report에 남는가?

---

## 11. 보안과 권한 경계

### 11.1 Renderer에서 금지할 것

- Codex auth 파일 직접 접근
- API Key 평문 저장
- 로컬 프로세스 임의 실행
- 프로젝트 파일에 토큰 저장
- 로그에 민감정보 출력

### 11.2 Rust/Tauri Core에서 처리할 것

- Codex 로그인 상태 확인
- Codex App Server / CLI 호출
- 파일 시스템 접근
- 민감정보 저장소 접근
- provider credential validation
- export 파일 저장

### 11.3 인증 원칙

- Codex 공식 로그인 흐름을 앱이 대체하지 않는다.
- 앱은 로그인 상태를 확인하고 provider 작업을 요청한다.
- API Key는 fallback/개발자 모드로 제한한다.
- provider별 권한 범위와 과금 가능성을 UI에서 명확히 보여준다.

---

## 12. 현재 코드와 연결되는 파일

현재 코드베이스에서 아키텍처와 직접 연결되는 파일은 다음이다.

| 영역 | 파일 |
|---|---|
| 도메인 모델 | `src/lib/deck-types.ts` |
| Provider 인터페이스 | `src/lib/provider-types.ts` |
| Codex provider | `src/lib/codex-provider.ts` |
| Codex App Server event runner | `src/lib/codex-app-server-event-runner.ts` |
| Production Codex job | `src/lib/codex-app-server-production-job.ts` |
| Tauri command | `src-tauri/src/lib.rs` |
| Research model | `src/lib/research-types.ts` |
| Slide context bundle | `src/lib/slide-context-bundle.ts` |
| Final export gate | `src/lib/final-export-gate.ts` |
| Generation report | `src/lib/generation-report.ts` |
| Image artifact store | `src/lib/image-artifact-store.ts` |
| Live workflow modules | `src/lib/live-*` 계열 |

---

## 13. MVP 구현 우선순위

### Phase 1. JAKE가 직접 쓸 수 있는 최소 완성 흐름

- Project Setup
- InterviewBrief
- DeckPlan
- DesignSystem
- LayoutPrototype
- 기본 slide generation
- review/QA
- export 또는 export-ready package

### Phase 2. Codex 연결 안정화

- Codex App Server smoke test
- structured turn 안정화
- provider status UI
- job progress/audit
- 실패 복구

### Phase 3. Slop 방지 품질 게이트

- 디자인 시스템 이탈 검사
- 출처 없는 수치 검사
- slide density 검사
- 제목/메시지 품질 검사
- final report lineage

### Phase 4. 편집 가능한 산출물 고도화

- EditableLayerModel 개선
- PPTX export fidelity 개선
- 부분 재생성
- 레이어 단위 수정

---

## 14. 아키텍처상 하지 않을 것

초기 아키텍처에서는 다음을 하지 않는다.

- 범용 웹 기반 디자인 툴 전체를 만들지 않는다.
- PowerPoint 전체 기능을 복제하지 않는다.
- 모든 모델 호출을 하나의 OpenAI API Key에 묶지 않는다.
- Codex OAuth와 일반 OpenAI API 권한을 같은 것으로 취급하지 않는다.
- 생성된 PNG 한 장을 최종 산출물로 취급하지 않는다.
- 대화 기록만으로 긴 작업 컨텍스트를 유지하지 않는다.
- 출처 없는 수치를 이미지 모델에게 그리게 하지 않는다.

---

## 15. 현재 결론

GPPT의 아키텍처는 다음 방향으로 확정한다.

1. 로컬 우선 Tauri 데스크탑 앱으로 만든다.
2. 프론트엔드는 단계형 워크플로우와 승인 UI를 담당한다.
3. Rust/Tauri Core는 Codex 실행, 로컬 파일, 민감 작업을 담당한다.
4. AI 연동은 Provider Adapter로 추상화한다.
5. Codex는 기본 provider이고, API Key 기반 provider는 fallback이다.
6. 모든 작업은 승인된 산출물과 Context Bundle을 기준으로 실행한다.
7. QA와 approval log는 제품의 부가 기능이 아니라 핵심 아키텍처다.
8. 최종 결과물은 편집 가능해야 하며, PNG 한 장으로 끝나면 안 된다.
9. MVP는 JAKE가 실제로 쓸 수 있는 한 가지 PPT 유형을 완성하는 데 집중한다.
