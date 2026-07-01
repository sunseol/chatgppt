# DeckForge Result Testing Handoff Context

작성일: 2026-07-01 10:50:06 KST

이 문서는 세션/환경이 바뀌어도 `결과 테스트`, `시각 결과 테스트`, `DeckForge 결과물 테스트`, `PPT 결과 테스트` 같은 요청이 들어왔을 때 같은 맥락을 이어가기 위한 프로젝트 고정 컨텍스트다.

## 1. 기본 운영 원칙

사용자는 **Human Visual Tester**다.

- 사용자는 contact sheet, slide PNG, PDF/PPTX 렌더링 결과처럼 **시각 결과물만 보고 피드백**한다.
- 사용자는 manifest, prompt package, provider request/response, raw image log, source code, DeckForge project JSON을 직접 보지 않아도 된다.
- 사용자의 피드백은 구현 지시가 아니라 **시각 증상(visual symptom)** 으로 기록한다.

Assistant/Hermes는 **Artifact-log Diagnostician / Builder**다.

- 사용자 피드백을 raw feedback으로 저장한다.
- 해당 run folder의 생성물과 산출물 로그를 확인한다.
- visual symptom을 평가 축에 매핑한다.
- `facts / hypotheses / unknowns`를 분리한다.
- 최소 변경 가설을 세운 뒤 재생성한다.
- 다시 사용자에게는 시각 결과물만 보여준다.

## 2. 사용자가 “결과 테스트”를 지시하면 즉시 할 일

1. 현재 대상 run folder를 찾는다.
   - 사용자가 특정 run을 말하면 그 run을 사용한다.
   - 특정하지 않으면 `/Users/jake/ppt_samples/runs/**`에서 가장 최근 관련 run을 확인하되, 애매하면 대상 산출물만 짧게 확인한다.
2. 사용자에게 보여줄 visual-only artifact를 고른다.
   - 우선순위: `10_delivery/contact_sheet_final.png`
   - 없으면: `08_rendered/contact_sheet/*.png`
   - 없으면: `08_rendered/slide_png/*.png`로 contact sheet 생성
   - 필요 시 PDF/PPTX도 함께 첨부
3. 사용자에게 내부 로그를 설명하지 말고, 먼저 시각 결과물을 제시한다.
4. 사용자가 피드백을 주면 아래 파일을 생성한다.

```text
09_qa/human_visual_feedback_{NN}.json
09_qa/assistant_feedback_analysis_{NN}.md
09_qa/change_hypothesis_{NN}.json
09_qa/regeneration_result_{NN}.md
```

5. assistant는 내부적으로 다음을 확인한다.

```text
manifest/run_manifest.json
manifest/artifact_index.csv
manifest/hashes.sha256
04_design/*
05_prompts/*
06_generation/provider_requests/*
06_generation/provider_responses/*
06_generation/raw_images/*
07_assembly/source/*
08_rendered/*
09_qa/*
```

6. 수정/재생성은 기존 산출물을 덮어쓰기보다 iteration 파일 또는 새 run으로 남긴다.

## 3. 디자인 판정 목표

기본 목표는 `system_consistent_varied`다.

```text
system_consistent_varied
= shared invariants are locked
+ controlled variations are intentional
+ slide personality matches slide role
+ template repetition is not excessive
```

나쁜 목표:

```text
모든 슬라이드가 완전히 똑같은가?
```

좋은 목표:

```text
모든 슬라이드가 같은 디자인 시스템 안에 있으면서,
각 슬라이드의 역할에 맞는 고유한 구성을 갖는가?
```

## 4. 분류 라벨

| Label | 의미 | 상태 |
|---|---|---|
| `identical_template` | 같은 레이아웃/구성 반복. 내용만 바뀜 | 통일성은 높지만 개성 부족 |
| `system_consistent_varied` | 같은 디자인 시스템 + 통제된 변주 + 역할별 개성 | 목표 |
| `theme_consistent_loose` | 분위기는 비슷하지만 규칙/컴포넌트 일관성 약함 | 보완 필요 |
| `inconsistent` | 색/폰트/컴포넌트/여백/모티프가 제각각 | 실패 |

## 5. 평가 축

| Axis | 질문 | 목표 |
|---|---|---|
| `system_consistency` | 같은 디자인 시스템처럼 보이는가? | 높음 |
| `controlled_variation` | 변주가 규칙 안에서 일어나는가? | 높음 |
| `slide_personality` | 각 슬라이드 역할이 시각적으로 드러나는가? | 높음 |
| `template_repetition` | 복붙처럼 반복되는가? | 낮음~중간 |
| `polish` | 가독성, 여백, 정렬, 완성도가 충분한가? | 높음 |

## 6. 피드백 → 진단 매핑

| 사용자 피드백 | 우선 의심 축 | 확인할 산출물/로그 |
|---|---|---|
| “너무 똑같아” | `template_repetition` 과다 | layout_archetype, card count, slide composition |
| “한 장만 튀어” | `system_consistency` 약화 | palette, component tokens, header/footer, icon style |
| “개성이 없어” | `slide_personality` 부족 | slide role, key message, visual metaphor |
| “산만해” | `controlled_variation` 과다 | accent 수, motif 위치, 정보 밀도 |
| “주제랑 안 맞아” | role/content mismatch | slide role, core message, prompt/package |
| “좋은데 디테일이 부족해” | `polish` 부족 | spacing, hierarchy, contrast, card internals |
| “일관성은 있는데 지루해” | repetition 높음 + personality 낮음 | repeated layout archetypes |
| “각 장은 다른데 한 덱 같지 않아” | `system_consistency` 낮음 | invariants 누락 여부 |

## 7. 이미지 생성 여부 표기 규칙

결과 테스트를 할 때도 생성 방식은 반드시 정확히 표기한다.

- PPTX → PDF → PNG는 **렌더링/미리보기**이지 이미지 생성이 아니다.
- HTML/CSS → PNG는 **렌더링 산출물**이지 이미지 생성이 아니다.
- DeckForge/chatgppt export engine 산출물도 provider request/response/raw generated image가 없으면 이미지 생성이라고 주장하지 않는다.
- 이미지 생성이라고 말하려면 최소한 아래가 있어야 한다.

```text
05_prompts/prompt_packages.jsonl
06_generation/provider_requests/*.json
06_generation/provider_responses/*.json
06_generation/raw_images/*
output_kind=full_presentation_slide equivalent metadata
```

최종 보고 메타는 항상 유지한다.

```text
생성 방식:
이미지 생성 주장 가능 여부:
provider request 수:
raw generated image 수:
rendered preview 수:
로그 폴더:
```

## 8. Canonical Reference Files

```text
/Users/jake/ppt_samples/ARTIFACT_LOGGING_RULES.md
/Users/jake/ppt_samples/DECK_DESIGN_CONSISTENCY_TDD_ROADMAP.md
/Users/jake/ppt_samples/design_consistency/tester_visual_feedback_protocol_v1.md
/Users/jake/ppt_samples/design_consistency/human_visual_feedback.template.json
/Users/jake/ppt_samples/design_consistency/assistant_feedback_analysis.template.md
/Users/jake/ppt_samples/design_consistency/controlled_full_slide_image_generation_direction_2026-07-01.md
/Users/jake/ppt_samples/design_consistency/controlled_full_slide_image_generation_roadmap_2026-07-01.md
```

핵심 기술 방향:

```text
controlled-full-slide-image-generation
= 이미지 생성 실패 시 deterministic overlay로 회피하지 않고,
  완성 슬라이드 래스터 생성을 design contract / prompt package / control image / visual gate / targeted repair loop로 제어한다.
```

DeckForge/chatgppt repo mirror:

```text
/Users/jake/chatgppt/deck-scribe-craft-07/docs/result-testing-handoff.md
/Users/jake/chatgppt/deck-scribe-craft-07/AGENTS.md
```

## 8.1 Typography Repair Rejection Rule — 2026-07-02

사용자가 v5 typography-repaired preview에 대해 “덧붙인 것처럼 이상한 위치”, “볼드로 생성한 뒤 가릴 거면 왜 생성하나”, “이전처럼 이미지를 미세하게 컨트롤”이라고 피드백했다.

따라서 다음 결과 테스트에서는 후처리 텍스트를 최종 제품 답으로 사용하지 않는다. Deterministic/vector/PIL text는 control/reference image, QA oracle, 또는 명시적 export fallback으로만 둔다. 기본 방향은 `controlled-native-typography-image-generation-v6`: provider-native full-slide raster에서 typography zone/weight/position을 제어하고, 실패 시 같은 design contract로 targeted regeneration/inpainting한다.

Canonical reference:

```text
/Users/jake/ppt_samples/design_consistency/controlled_native_typography_image_generation_v6_2026-07-02.md
/Users/jake/chatgppt/deck-scribe-craft-07/docs/plans/2026-07-02-controlled-native-typography-image-generation-v6.md
```

## 9. Fresh-session Prompt Contract

새 세션에서 사용자가 아래처럼 말하면 이 문서를 기준으로 이어간다.

```text
결과 테스트 해줘
시각 결과 테스트 이어서 해줘
지난 DeckForge 결과물 테스트해줘
서울시 마라톤 샘플 결과 테스트해줘
```

Assistant는 먼저 이 문서와 canonical reference files를 읽고, 사용자가 볼 시각 결과물만 찾아서 제시해야 한다. 내부 로그는 사용자에게 판단 부담으로 넘기지 않는다.
