# Controlled Native Typography Image Generation v6

작성일: 2026-07-02 06:56 KST
분류: specification only — 아직 구현/재생성 완료 아님

## Trigger feedback

> 지금은 너무 덧붙여서 이상한위치에 있다는게 대충봐도 보여. 그리고 이런식으로 처리할꺼면 볼드로 왜 생성해 가릴껀데? 이런 방식말고 이전처럼 이미지를 미세하게 컨트롤하는법으로 발전해

## Problem

v5의 `visual base + typography repair` 방식은 얇은/regular 텍스트 hierarchy를 복구하는 실험으로는 의미가 있었지만, 최종 시각 결과에서는 텍스트가 후처리로 덧붙은 것처럼 보이고 위치가 어색했다. 또한 base raster가 이미 bold/text-like 결과를 만든 뒤 이를 가리는 구조는 제품 방향과 모순된다.

## Corrected direction

DeckForge/GPPT의 방향은 다시 아래로 고정한다.

```text
controlled-native-typography-image-generation-v6
= 후처리로 가리는 방식이 아니라,
  이미지 생성 단계에서 typography zone, weight hierarchy, card grammar, safe area를 미세하게 제어한다.
```

## Non-goals

- AI가 만든 bold 텍스트를 나중에 덮어씌우기
- 어색한 위치에 텍스트를 붙여 final처럼 보이게 만들기
- rendered/repaired preview를 순수 image generation이라고 부르기
- text repair를 제품 핵심 경로로 삼기

## Allowed supporting tools

Deterministic/vector/PIL rendering은 다음 용도로만 허용한다.

1. **control/reference image**: provider가 따라야 할 typography zone / grid / weight ladder 예시
2. **QA oracle**: expected geometry, safe area, text role budget 비교 기준
3. **fallback export**: 사용자가 명시적으로 editable/export 정확성을 요구할 때만 별도 표기

최종 product answer는 provider-native full-slide raster control을 우선한다.

## v6 Control Contract additions

```json
{
  "contractId": "controlled-native-typography-image-generation-v6",
  "outputKind": "full_presentation_slide",
  "forbiddenFailures": [
    "visible_pasted_text_overlay",
    "bold_text_generated_then_covered",
    "awkward_repair_text_position",
    "posthoc_coverup_as_product_answer",
    "all_bold_typography",
    "thin_text_blur",
    "fake_microcopy",
    "colored_vertical_accent_bar",
    "AI_template_stripe"
  ],
  "mustPreserve": [
    "backend pipeline provenance",
    "one design consistency contract",
    "title-lock / no internal slide numbers / no accent bars",
    "bright editorial IR design layer",
    "system_consistent_varied target"
  ],
  "typographyControl": {
    "title": "bold but not oversized",
    "subtitle": "regular/light, high contrast, one line",
    "hero": "medium, max two lines",
    "cardHeading": "semibold",
    "cardSupport": "regular, one short phrase",
    "bodyParagraph": "forbidden in provider raster"
  }
}
```

## Next experiment protocol

1. Keep `project → interview → research → plan → design → layout → generate` provenance.
2. Build a typography reference/control image with clean title/subtitle/card text zones and explicit weight ladder.
3. Provider request asks for a finished presentation slide raster, not a background and not a blank base for later text.
4. Generate raw full-slide rasters with provider-native typography control.
5. Gate failures before showing the user:
   - no visible pasted overlay;
   - no bold text generated then covered;
   - subtitle/support are readable without becoming bold;
   - same design system retained;
   - text count/density remains bounded.
6. If a slide fails, regenerate/inpaint the failed region under the same contract rather than covering it with a new text layer.

## Verification language

This document records a corrected direction after v5 rejection. It does not claim implementation, visual regeneration, or product readiness.
