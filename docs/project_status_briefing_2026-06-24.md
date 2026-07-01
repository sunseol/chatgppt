# GPPT / DeckForge 프로젝트 상태 브리핑

- 작성일: 2026-06-24
- 대상: 외부/동료 컨설팅용 현황 공유 문서
- 기준 저장소: `/Users/jake/chatgppt`
- 기준 앱: `deck-scribe-craft-07`
- 핵심 판단: **내부 mock 기반 MVP 검증은 상당히 진척됐지만, Live Initial Version 또는 공개 배포 상태는 아니다.**

---

## 1. 한 줄 요약

GPPT/DeckForge는 "사용자가 가진 Codex를 로컬 데스크탑 앱에 연결해, 인터뷰-조사-기획-디자인-레이아웃-생성-검토-편집-export를 승인 기반으로 진행하는 PPT 제작 도구"로 방향은 선명하다.

현재 코드베이스는 mock 기반 전체 워크플로우와 다수의 품질 게이트를 갖췄고, 로컬 자동 검증도 통과한다. 그러나 실제 Codex/App Server, live research, live image generation, clean-machine package, 비개발자 QA까지 이어지는 **현실 사용 증거**가 부족해 아직 제품 검증 단계라고 봐야 한다.

---

## 2. 현재 제품 정의

제품 문서 기준 GPPT의 핵심은 다음이다.

- "빠른 한 번 생성"보다 "재작업 없이 최종본까지 가는 정확한 작업 흐름"을 지향한다.
- 사용자가 이미 가진 Codex/ChatGPT 권한을 활용하는 Bring Your Own Codex 모델을 지향한다.
- 초기 프롬프트를 바로 슬라이드로 바꾸지 않고, 중간 산출물과 승인 게이트를 강제한다.
- AI PPT 특유의 slop, 출처 없는 수치, 디자인 일관성 붕괴, 편집 불가능한 PNG 결과물을 주요 적으로 본다.

현재 구현명은 DeckForge이고, 상위 제품/방향 문서에서는 GPPT 이름을 사용한다. `package.json`의 패키지명은 아직 `tanstack_start_ts`로 남아 있어 제품명 정리가 필요하다.

참조 문서:

- `docs/gppt_project_direction.md`
- `docs/gppt_architecture.md`
- `docs/codex_ppt_prd.md`
- `docs/codex_ppt_ticket_breakdown.md`
- `deck-scribe-craft-07/docs/live-readiness-audit.md`
- `deck-scribe-craft-07/docs/live-release-decision.md`

---

## 3. 구현 현황

### 3.1 기술 스택

- Desktop: Tauri v2, Rust backend
- Frontend: React 19, TypeScript, Vite, TanStack Router/Start 계열
- Package/runtime: Bun
- 검증: `tsc`, `bun test`, ESLint, Vite build, Cargo fmt/test/clippy
- 산출물: macOS DMG 내부 테스트 빌드, dry-run package, release evidence 문서

### 3.2 워크플로우 모델

현재 단계 모델은 다음 흐름을 갖는다.

```text
project
-> interview
-> research
-> plan
-> design
-> layout
-> generate
-> review
-> vectorize/editor
-> export
```

핵심 도메인 산출물은 `InterviewBrief`, `ResearchPack`, `DeckPlan`, `DesignSystem`, `LayoutPrototype`, `GeneratedSlide`, `EditableLayerModel`, `ApprovalLogEntry`, `ProjectExportSummary`로 정리되어 있다.

### 3.3 현재까지 잘 된 점

- 제품 철학과 PRD가 비교적 일관된다. "Brief to Deck", 승인 기반 진행, 출처/품질 게이트, 편집 가능 산출물이라는 축이 반복해서 유지된다.
- mock 기반 end-to-end 경로가 있다. `bun test` 기준 mock happy path, export, report, approval gate 테스트가 존재한다.
- Live 전환을 위한 gate 코드가 상당히 많이 들어갔다. production mock 차단, provenance, source capture, live evidence, image artifact, release gate가 코드화되어 있다.
- Tauri shell과 Codex App Server bridge가 들어갔다. Rust command와 frontend bridge 테스트도 존재한다.
- 릴리스 판단 문서가 솔직하다. `live-release-decision.md`는 현재 결정을 `Blocked`로 둔다.

---

## 4. 최신 로컬 검증 결과

2026-06-24 현재 로컬에서 직접 확인한 결과다.

| 항목 | 결과 |
|---|---|
| `bun run typecheck` | 통과 |
| `bun test` | 통과, 197 files / 654 tests / 0 fail |
| `bun run lint` | 통과, 오류 0개 / React Fast Refresh 경고 6개 |
| `bun run build` | 통과 |
| `bun run rust:fmt` | 통과 |
| `bun run rust:test` | 통과, 14 passed / 2 ignored live tests |
| `bun run rust:clippy` | 통과 |

이번 브리핑 작성 중 실행하지 않은 항목:

- `bun run qa:frontend`
- `bun run qa:package`
- `bun run tauri:build`
- 실제 packaged app에서의 live Codex golden path
- clean-machine macOS 계정 검증
- 비개발자 manual QA

따라서 "코드 품질 게이트는 초록"이라고 말할 수 있지만, "제품이 실제 사용자 환경에서 검증됐다"라고 말하면 안 된다.

---

## 5. 현재 가장 큰 문제

### 5.1 제품 리스크: Live 증거가 아직 없다

현재 가장 큰 공백은 기능 코드가 아니라 **실제 live surface 증거**다.

`deck-scribe-craft-07/docs/live-release-decision.md`와 `deck-scribe-craft-07/docs/live-readiness-audit.md` 기준으로 다음이 아직 막혀 있다.

- packaged app에서 인증된 Codex live interview, follow-up, brief 산출물 기록
- live research web search 3-domain event log
- source capture/recapture history가 실제 앱 surface에서 생성된 증거
- live Deck Plan, Design System, Layout IR 산출물
- 실제 image request id, billing/permission evidence, 저장된 PNG binary artifact
- 5장 live background batch
- full-slide regeneration live artifact
- live golden path E2E bundle
- 5개 live benchmark 중 4개 이상 통과 증거
- clean-machine package validation
- 비개발자 manual QA

즉, 현재 상태는 "검증 게이트를 많이 만들었다"에 가깝고, 아직 "그 게이트를 실제 제품 사용으로 통과했다"는 상태가 아니다.

### 5.2 실행 모드 리스크: development와 production이 둘로 갈라져 있다

코드상 development workflow는 여전히 `mockResearch`, `mockPlan`, `mockDesign`, `mockSlides`, `createBriefDraft`를 사용한다.

Production path는 별도 `ProductionWorkflowStage`로 분리되어 있고, `selectClientWorkflowStageRuntime`은 production build 또는 App Server bridge availability에 따라 production UI를 고른다.

이 구조 자체는 mock contamination을 줄이는 데 유리하지만, 위험도 있다.

- 실제 사용자가 경험할 production path가 mock path만큼 풍부하게 관통되었는지 불확실하다.
- 두 UI/상태 흐름이 장기간 공존하면 기능 parity가 깨질 수 있다.
- "테스트는 초록인데 실제 live 제품은 안 된다"는 상태가 생기기 쉽다.

### 5.3 프로젝트 관리 리스크: 워크트리가 너무 크고 지저분하다

현재 git 상태는 다음과 같다.

- 수정/삭제 추적 파일: 80개
- 신규 untracked 파일: 280개
- 총 변경 항목: 360개
- 추적 diff: 80 files, 3,254 insertions, 465 deletions

릴리스 산출물, 스크린샷, `.omx` 상태, live evidence 문서, 신규 소스가 한 워크트리에 섞여 있다. 이 상태에서는 코드 리뷰, 책임 분리, 회귀 원인 추적, 릴리스 후보 식별이 어렵다.

### 5.4 아키텍처 리스크: 파일이 커지고 있다

단순 줄 수 기준으로 250라인 이상 파일이 다수 있다. 예시는 다음과 같다.

- `src/components/ui/sidebar.tsx`: 744 lines
- `src/lib/live-text-pipeline-cutover.ts`: 455 lines
- `scripts/live-interview-real-invoke-qa.mjs`: 408 lines
- `src/components/ui/chart.tsx`: 331 lines
- `src/lib/deck-types.ts`: 267 lines
- `src/routes/project.$projectId.$step.tsx`: 252 lines
- `src/lib/research-pack.ts`: 253 lines
- `src/components/deck/HomeScreen.tsx`: 253 lines

현재는 테스트가 받쳐주고 있지만, live path가 더 붙으면 유지보수성이 빠르게 악화될 수 있다.

### 5.5 보안/배포 리스크

- `src-tauri/tauri.conf.json`의 CSP가 `null`이다. 로컬 앱이라도 장기적으로는 명시 정책이 필요하다.
- 현재 DMG는 내부 테스트용 ad-hoc signed 상태이며 notarization/Gatekeeper evidence가 없다.
- `release-artifacts/`에 여러 DMG 버전과 checksum이 쌓여 있어 저장소 관리 정책이 필요하다.
- public macOS 배포는 Developer ID, hardened runtime, notarization, clean-machine validation 없이는 승인하면 안 된다.

### 5.6 품질 설정 리스크

TypeScript는 `strict: true`지만 다음은 아직 느슨하다.

- `noUncheckedIndexedAccess` 없음
- `exactOptionalPropertyTypes` 없음
- `noUnusedLocals`, `noUnusedParameters`가 false
- ESLint에서 `@typescript-eslint/no-unused-vars` off
- 생성 파일 `src/routeTree.gen.ts`에 `as any`가 있다. 생성 파일이면 허용 가능하지만, 수동 코드에서는 금지 원칙을 유지해야 한다.

---

## 6. 컨설팅 관점의 핵심 진단

### 진단 1. 방향은 맞지만 현재 KPI가 "코드 생산량"으로 흐를 위험이 있다

현재 문서와 테스트는 매우 많다. 그러나 제품 성공 여부는 "게이트가 몇 개 있는가"보다 "JAKE 또는 첫 사용자가 실제로 제출 가능한 PPT를 만들었는가"로 판단해야 한다.

권장 KPI:

- 첫 live deck 완성까지 걸린 시간
- 승인 단계별 사용자 재작업 횟수
- 출처 없는 주장 0개 여부
- 최종 export를 열었을 때 수정 가능한 객체 비율
- 비개발자 사용자가 10분 안에 첫 프로젝트를 시작할 수 있는지

### 진단 2. 지금 필요한 것은 기능 확장이 아니라 live vertical slice 완성이다

새 기능을 더 붙이기 전에 하나의 live golden path를 닫아야 한다.

권장 범위:

```text
새 프로젝트
-> Codex 로그인 확인
-> live interview questions
-> live brief
-> live research web search + source capture
-> live deck plan
-> live design system
-> live layout IR
-> live image 5장
-> review에서 1장 재생성
-> 제목 1개 편집
-> export
-> report
```

이 한 경로가 packaged app에서 증거와 함께 끝나기 전에는, 벤치마크/협업/템플릿/고급 편집 확장은 우선순위를 낮춰야 한다.

### 진단 3. mock 기반 internal MVP와 live release를 분리해서 관리해야 한다

현재 문서에는 internal mock MVP와 live release 기준이 섞여 있다. 둘 다 필요하지만, 컨설팅/투자/외부 리뷰에서는 혼동을 만든다.

권장 구분:

- Track A: Internal mock MVP - UI/상태머신/편집/export 검증
- Track B: Live initial version - 실제 provider/provenance/package/manual QA 검증

각 Track은 별도 체크리스트, 별도 release decision, 별도 demo script를 가져야 한다.

### 진단 4. 워크트리 위생을 먼저 회복해야 한다

현재처럼 360개 변경 항목이 열린 상태에서는 "무엇이 제품 상태이고 무엇이 실험 산출물인지"가 흐려진다.

권장:

- code, docs, screenshots, release artifacts를 커밋/보관 단위로 분리
- DMG와 대형 이미지 산출물은 Git LFS 또는 외부 artifact store 정책 결정
- `.omx`, `.playwright-mcp`, visual QA 스크린샷은 저장소 포함 기준을 명시
- live evidence 문서는 ticket별로 유지하되, 최상위 dashboard 문서 하나에서 상태를 요약

### 진단 5. 제품명과 배포 표면을 정리해야 한다

현재 이름이 섞여 있다.

- 제품 방향 문서: GPPT
- 앱/코드/DMG: DeckForge
- package name: `tanstack_start_ts`
- PRD 코드명: DeckForge 또는 Codex Deck Studio

외부 컨설팅을 받기 전에는 다음 결정을 해야 한다.

- 외부 제품명은 GPPT인가 DeckForge인가
- repository/package/app bundle/display title에서 어떤 이름을 쓸 것인가
- "Bring your own Codex"가 브랜드의 중심 문장인지, 보조 문장인지

---

## 7. 권장 우선순위

### P0 - 지금 바로

1. Live Golden Path를 하나로 고정한다.
2. production path에서 실제 Codex/App Server 산출물을 packaged app으로 생성한다.
3. live research 3-domain event log와 source capture bundle을 실제 앱 surface에서 만든다.
4. image provider로 실제 PNG artifact 5개를 저장하고 request/billing/provenance를 남긴다.
5. export/report까지 도달한 `live_e2e_report.md`를 생성한다.
6. 워크트리를 정리해 리뷰 가능한 단위로 나눈다.

### P1 - Live path가 한 번 닫힌 직후

1. clean-machine macOS 검증을 실행한다.
2. 비개발자 1명 manual QA를 실행한다.
3. React Fast Refresh 경고 6개를 shared UI 분리로 제거한다.
4. CSP `null`을 없애고 Tauri capability/permission 정책을 배포 기준으로 정리한다.
5. 제품명과 package metadata를 통일한다.

### P2 - 베타 전

1. 250라인 이상 파일을 책임 단위로 분리한다.
2. TypeScript strictness를 강화한다.
3. release artifacts 보관 정책을 정한다.
4. live benchmark 5개 중 4개 이상 통과를 자동 수집한다.
5. 사용자에게 노출되는 "왜 막혔는지/무엇을 해야 하는지" copy를 QA한다.

---

## 8. 컨설턴트에게 물어볼 질문

1. 이 제품의 첫 wedge는 "오픈소스 BYO Codex PPT 도구"인가, "AI 티 안 나는 고품질 PPT 제작 workflow"인가?
2. 첫 번째 유료/활성 사용자 가설은 누구인가: 창업자, 컨설턴트, PM, 리서처, 교육자인가?
3. MVP 성공 기준을 "첫 제출 가능한 덱 1개"로 잡는다면, 어떤 덱 유형을 고정해야 하는가?
4. Live evidence gate가 너무 무거워 제품 속도를 늦추고 있지는 않은가? 줄일 수 없는 최소 gate는 무엇인가?
5. mock internal MVP와 live initial version을 어떤 방식으로 외부에 설명해야 신뢰를 잃지 않는가?
6. 편집 가능한 산출물의 목표는 PowerPoint 호환인가, SVG/layer package인가, Canva/Figma import인가?
7. 공개 배포 전에 반드시 해결해야 할 보안/인증/과금 리스크는 무엇인가?

---

## 9. 결론

이 프로젝트는 방향성 자체는 강하다. "AI PPT 생성기"를 하나 더 만드는 것이 아니라, 승인된 산출물과 provenance를 기반으로 실제 제출 가능한 PPT를 만들겠다는 관점은 차별화된다.

하지만 현재 병목은 아이디어나 테스트 부족이 아니다. 병목은 **실제 live 사용 증거, 워크트리 위생, 제품명/배포 표면 정리**다.

다음 단계는 기능을 더 늘리는 것이 아니라, 한 개의 live golden path를 packaged app에서 끝까지 통과시키고 그 증거를 남기는 것이다. 그 다음에야 컨설팅을 통해 시장 포지셔닝, UX 단순화, 배포 전략을 논의하는 것이 효과적이다.
