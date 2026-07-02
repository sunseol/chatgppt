<p align="center">
  <img src="docs/assets/chat-gppt-logo.png" alt="CHAT GPPT 로고" width="180" />
</p>

<h1 align="center">CHAT GPPT / DeckForge</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.ko.md"><strong>한국어</strong></a>
</p>

<p align="center">
  <strong>내 Codex로 만드는, 로컬 우선·증거 기반·AI 티 덜 나는 오픈소스 지향 디자인 PPT 제작 도구</strong>
</p>

<p align="center">
  <a href="#quick-start"><img alt="Quick Start" src="https://img.shields.io/badge/Quick%20Start-Bun%20%2B%20Tauri-black?style=for-the-badge&logo=bun" /></a>
  <a href="#제품-철학"><img alt="Brief to Deck" src="https://img.shields.io/badge/Brief--to--Deck-not%20Prompt--to--PPT-111827?style=for-the-badge" /></a>
  <a href="#bring-your-own-codex"><img alt="Bring Your Own Codex" src="https://img.shields.io/badge/BYO-Codex-10a37f?style=for-the-badge&logo=openai&logoColor=white" /></a>
  <a href="#증거-우선-qa"><img alt="Evidence First" src="https://img.shields.io/badge/Evidence--First-QA-7c3aed?style=for-the-badge" /></a>
</p>

<p align="center">
  <img alt="Tauri" src="https://img.shields.io/badge/Tauri-v2-24C8DB?style=flat-square&logo=tauri&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=111111" />
  <img alt="TanStack" src="https://img.shields.io/badge/TanStack-Router%20%2B%20Start-FF4154?style=flat-square" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img alt="Rust" src="https://img.shields.io/badge/Rust-Tauri%20Core-000000?style=flat-square&logo=rust&logoColor=white" />
  <img alt="Bun" src="https://img.shields.io/badge/Bun-runtime-000000?style=flat-square&logo=bun&logoColor=white" />
  <img alt="Status" src="https://img.shields.io/badge/Release%20Decision-Blocked-orange?style=flat-square" />
  <img alt="License" src="https://img.shields.io/badge/License-not%20specified-lightgrey?style=flat-square" />
</p>

---

## CHAT GPPT는 무엇인가요?

**CHAT GPPT**는 로컬 우선 프레젠테이션 생성 시스템을 만들기 위한 저장소이자 제품 맥락입니다. 현재 데스크톱 구현체의 이름은 **DeckForge**입니다.

이 프로젝트는 또 하나의 “한 줄 프롬프트로 PPT를 만들어주는 AI 도구”가 되려는 것이 아닙니다. 핵심 전제는 다릅니다.

> **정확하게 작업하는 게 가장 빠르다.**<br>
> 진짜 빠른 덱 제작은 처음부터 재작업을 줄이는 구조와 증거 기반 워크플로우에서 나온다.

CHAT GPPT는 막연한 프롬프트 하나로 전체 덱을 바로 만들기보다, 승인 가능한 중간 산출물을 따라 최종 덱까지 가는 흐름을 설계합니다.

```text
Brief
→ 라이브 인터뷰
→ 리서치 팩
→ 덱 플랜
→ 디자인 시스템
→ 레이아웃 프로토타입
→ controlled full-slide generation
→ 리뷰 / 수리
→ export
```

---

## 제품 철학

### 1. Prompt-to-PPT가 아니라 Brief-to-Deck

대부분의 AI PPT 도구는 프롬프트에서 바로 슬라이드를 생성합니다. 시작은 빨라 보이지만, 뒤로 갈수록 비용이 커집니다. 메시지가 흐릿하고, 근거가 약하고, 디자인이 들쭉날쭉하고, 가짜 차트나 평범한 레이아웃이 섞이면 결국 사람이 다시 고쳐야 합니다.

CHAT GPPT는 **brief**에서 시작하고, 중요한 단계마다 검토 가능한 산출물을 만듭니다.

### 2. AI slop은 프롬프트가 아니라 구조로 막는다

이 프로젝트는 품질을 “좋은 프롬프트” 문제가 아니라 시스템 문제로 봅니다.

- 한 슬라이드에는 하나의 메시지를 둡니다.
- 주장과 숫자는 출처/근거 맥락을 가져야 합니다.
- 디자인 시스템은 슬라이드 생성 전에 승인됩니다.
- 레이아웃과 생성 결과는 provenance를 보존합니다.
- 증거나 lineage가 오염되면 최종 export를 막습니다.

### 3. 로컬 우선 데스크톱 워크플로우

DeckForge는 Tauri 기반 데스크톱 앱입니다. 사용자의 작업 산출물, 프로젝트 맥락, 실행 흐름을 가능한 한 로컬 머신 가까이에 두는 것을 목표로 합니다.

### 4. Controlled full-slide image generation

시각적 moat는 “AI 배경 위에 HTML 텍스트를 얹는 방식”이 아닙니다. 현재 방향은 다음입니다.

```text
이미지 모델이 완성된 16:9 프레젠테이션 슬라이드 래스터를 생성한다
+ DeckForge가 design contract, reference/control image,
  prompt package, visual gate, targeted repair loop로 이를 제어한다
```

읽기 좋다는 것은 모든 텍스트를 볼드로 만드는 뜻이 아닙니다. 타이포그래피나 레이아웃이 실패하면 깨진 부분을 덮어 숨기는 대신, 더 강한 control contract 아래에서 재생성하거나 수리해야 합니다.

---

## Bring Your Own Codex

CHAT GPPT는 **BYO Codex** 구조를 전제로 합니다.

> 이미 보유한 Codex 접근 권한을 활용해, 또 다른 AI PPT 구독비를 만들지 않는다.

Codex는 덱 제작 파이프라인 안에서 실제 작업자처럼 사용됩니다.

- 인터뷰 질문 생성;
- brief 생성;
- 리서치와 출처 reasoning;
- 덱 플랜 초안 작성;
- 디자인 시스템 초안 작성;
- Layout IR 생성;
- QA / repair turn 수행.

앱은 실제 라이브 액션에 Codex가 필요한 순간에 Codex 연결 상태를 확인합니다. 따라서 사용자는 Codex를 연결하지 않아도 프로젝트 생성과 사전 준비는 할 수 있습니다.

---

## 핵심 기능

| 영역 | DeckForge가 하려는 일 |
|---|---|
| 프로젝트 워크플로우 | brief부터 export까지 단계 기반 덱 제작 |
| 라이브 인터뷰 | 질문지를 만들고 답변을 승인 가능한 brief로 변환 |
| 리서치 | 익명 요약이 아니라 출처/근거 맥락을 보존 |
| 플래닝 | 승인된 brief와 research를 덱 구조로 변환 |
| 디자인 시스템 | 슬라이드 생성 전에 시각 방향을 고정 |
| 레이아웃 | 최종 시각화 전에 검토 가능한 슬라이드 구조 생성 |
| Full-slide generation | control contract 아래 완성형 16:9 슬라이드 래스터 생성 |
| Repair loop | 무작위 재생성이 아니라 실패 축을 기준으로 targeted repair |
| 로컬 데스크톱 브리지 | Tauri/Rust command로 Codex 상태, 로그인, structured turn, 로컬 프로젝트 폴더 처리 |
| Evidence gate | 사람이 쓴 보고서보다 machine-verifiable evidence를 우선 |

---

## 아키텍처

```text
┌──────────────────────────────────────────────────────────────┐
│                       DeckForge Desktop                       │
│                    Tauri v2 + WebView UI                      │
└───────────────────────────────┬──────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────┐
│                         Frontend UI                           │
│ React 19 / TanStack Router / Tailwind / Radix UI              │
│                                                              │
│ - project cockpit                                             │
│ - staged approval workflow                                    │
│ - live interview and text pipeline actions                    │
│ - research / design / layout / review surfaces                │
└───────────────────────────────┬──────────────────────────────┘
                                │ Tauri command / event bridge
                                ▼
┌──────────────────────────────────────────────────────────────┐
│                         Tauri Core                            │
│ Rust backend                                                  │
│                                                              │
│ - Codex login status                                          │
│ - Codex login terminal launch                                 │
│ - Codex App Server smoke / structured turn                    │
│ - local project folder creation / reveal                      │
└───────────────────────────────┬──────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────┐
│                    Production Artifact Layer                  │
│                                                              │
│ InterviewBrief → ResearchPack → DeckPlan → DesignSystem       │
│ → LayoutIR → SlideContextBundle → GeneratedSlide → Export     │
└──────────────────────────────────────────────────────────────┘
```

---

## 저장소 구조

```text
.
├── README.md
├── README.ko.md
├── docs/
│   ├── assets/
│   │   └── chat-gppt-logo.png
│   └── ... 제품 방향 / 아키텍처 / 릴리즈 문서
└── deck-scribe-craft-07/
    ├── package.json
    ├── src/
    │   ├── components/deck/       # production workflow UI
    │   ├── lib/                   # deck domain, gates, providers, evidence logic
    │   └── routes/                # TanStack routes
    ├── src-tauri/
    │   ├── tauri.conf.json        # DeckForge desktop app config
    │   └── src/                   # Rust command bridge
    └── docs/                      # live-readiness and release evidence docs
```

> 현재 앱 소스 경로: `deck-scribe-craft-07/`<br>
> 현재 데스크톱 제품명: `DeckForge`<br>
> 현재 Tauri config 버전: `0.0.15`

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/)
- Rust toolchain
- OS별 Tauri v2 prerequisites
- 라이브 production action을 위한 Codex CLI / Codex 로그인

### 데스크톱 앱 실행

```bash
git clone https://github.com/sunseol/chatgppt.git
cd chatgppt/deck-scribe-craft-07
bun install
bun run tauri:dev
```

### Web-only 개발 preview

```bash
cd deck-scribe-craft-07
bun install
bun run dev
```

### Frontend asset build

```bash
bun run build
```

### Tauri desktop build

```bash
bun run tauri:build
```

---

## 개발 명령어

아래 명령은 `deck-scribe-craft-07/`에서 실행합니다.

| Command | Purpose |
|---|---|
| `bun run dev` | Vite web dev server 실행 |
| `bun run tauri:dev` | Tauri desktop app 개발 실행 |
| `bun run typecheck` | TypeScript type check |
| `bun test` | Bun test suite 실행 |
| `bun run build` | frontend와 Tauri client assets build |
| `bun run verify` | typecheck + tests + build |
| `bun run rust:fmt` | Rust formatting check |
| `bun run rust:clippy` | Rust lint check |
| `bun run rust:test` | Rust tests |
| `bun run quality` | TypeScript/Rust quality gates |
| `bun run qa:frontend` | frontend screenshot / UI QA harness |
| `bun run qa:package` | native package QA helper |

---

## 증거 우선 QA

이 프로젝트는 다음 operating contract를 따릅니다.

```text
Documentation does not imply Done.
AI says passed does not imply Done.
Done implies machine-verifiable evidence exists.
```

구현과 릴리즈 작업에서 보고서만으로는 충분하지 않습니다. 프로젝트는 다음과 같은 실행 가능한 증거를 요구합니다.

- test output;
- typecheck/build logs;
- generated evidence bundles;
- provenance metadata;
- artifact hashes;
- package QA records;
- release readiness를 주장할 때의 clean-machine validation.

---

## 현재 상태

이 저장소는 활발히 개발 중입니다. 현재 release 문서는 live release decision을 다음처럼 표시합니다.

```text
Release decision: Blocked
```

이는 앱에 작동하는 부분이 없다는 뜻이 아닙니다. 최종 live release acceptance를 위해 packaged-app live Codex run, clean-machine validation, live source/evidence capture, benchmark run, final gate verification 같은 더 강한 end-to-end evidence가 필요하다는 뜻입니다.

이 README는 프로젝트 개요이며, 릴리즈 인증 문서가 아닙니다.

---

## 보안과 로컬 데이터

- API key, token, cookie, certificate, private key, signing password를 커밋하지 않습니다.
- Codex credentials와 signing material은 repository 밖에 둡니다.
- local runtime output, build product, screenshot, Lovable metadata는 필요한 곳에서 ignore합니다.
- release artifact는 provenance와 hash를 갖기 전까지 candidate로 취급하지 않습니다.

---

## Roadmap

- [ ] 인증된 packaged-app live interview → brief → plan → design → layout 흐름 완성.
- [ ] persisted source capture metadata를 가진 live Research Pack 생성.
- [ ] controlled full-slide image generation contract와 repair loop 강화.
- [ ] Golden Path E2E evidence bundle 기록.
- [ ] clean-machine setup / UAT validation 실행.
- [ ] signed release pipeline과 플랫폼별 배포 흐름 추가.
- [ ] repository license 결정 및 문서화.

---

## Contributing

이 프로젝트는 빠르게 변하고 있습니다. 좋은 기여는 아래 제약을 보존해야 합니다.

1. one-shot generation보다 structured workflow를 우선한다;
2. provenance와 evidence를 보존한다;
3. local-first desktop behavior를 유지한다;
4. production path에 fake/mock contamination을 만들지 않는다;
5. 실패를 overlay로 숨기지 말고 full-slide generation의 제어력을 높인다.

큰 변경을 열기 전에는 어떤 artifact를 바꾸는지, 어떤 gate에 영향을 주는지, 어떤 command로 검증하는지 먼저 정리해 주세요.

---

## 이름 맵

| Name | Meaning |
|---|---|
| `CHAT GPPT` / `chatgppt` | 저장소와 프로젝트 맥락 |
| `GPPT` | AI-assisted design PPT workflow라는 제품 방향 |
| `DeckForge` | 현재 Tauri desktop app 구현체 |
| `deck-scribe-craft-07` | 현재 app source directory |

---

<p align="center">
  <strong>CHAT GPPT는 5초간 그럴듯한 스크린샷이 아니라, 실제로 제출 가능한 덱을 만들기 위한 프로젝트입니다.</strong>
</p>
