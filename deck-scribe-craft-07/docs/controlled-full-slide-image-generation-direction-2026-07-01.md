# Controlled Full-Slide Image Generation Direction — 2026-07-01

작성 시각: 2026-07-01 16:42 KST
작업 분류: specification / technical exploration record
Mirror source: `/Users/jake/ppt_samples/design_consistency/controlled_full_slide_image_generation_direction_2026-07-01.md`

---

## Executive correction

Recent human visual testing of the Seoul Marathon sample corrected the product direction:

> DeckForge/GPPT should not retreat to deterministic PPT assembly when image generation fails.
> The moat is not automatic slide assembly.
> The moat is precise control over full-slide image generation.

Product direction is therefore:

```text
controlled-full-slide-image-generation
= the image model generates the complete 16:9 presentation slide raster
+ DeckForge controls it through design contracts, prompt packages, reference/control images, visual gates, and targeted repair loops
```

---

## Lessons from the Seoul Marathon result-test loops

### Run 1 — code/render/export path

- Structure and alignment were more controllable.
- But rendered PNG/PPTX previews are not image generation.
- Slides felt repetitive and lacked role-specific personality.

### Run 2 — full-slide image generation

- Provider request/response/raw image artifacts allowed an image-generation claim.
- But typography, card grammar, block design, and UI details drifted by slide.
- Some outputs felt like posters/key visuals rather than presentation slides.

### Run 3 — generated visual assets + deterministic composition

- The output looked rule-based superficially, but design polish collapsed.
- Failures included node-line misalignment, crop/mask issues, area intrusion, and generated text residue.
- More importantly, this was a strategic retreat from the real moat.

---

## Non-goals

```text
AI background + deterministic text overlay as the core product path
AI visual assets sliced and assembled into deterministic PPT as the product answer
Calling HTML/PPT/PDF rendered PNGs “image generation”
Replacing failed full-slide generation with code composition unless explicitly requested as fallback/export
```

---

## Target architecture

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

### 1. Slide Image Control Contract

Each generated slide request must carry structured, machine-checkable control metadata:

```json
{
  "output_kind": "full_presentation_slide",
  "design_system_id": "seoul-marathon-dark-neon-v1",
  "design_consistency_contract_id": "stable hash",
  "canvas": { "ratio": "16:9", "safe_area_px": [96, 72, 96, 72] },
  "palette": "locked",
  "typography_hierarchy": "locked mood and scale, no fake microcopy",
  "component_grammar": {
    "cards": "same corner radius / stroke / shadow family",
    "nodes_lines": "line must pass through exact node centers",
    "icons": "same stroke family"
  },
  "allowed_variation": ["layout_archetype", "hero motif position", "accent emphasis"],
  "forbidden_failures": ["cropped text", "fake UI labels", "mask leakage", "overlap", "poster-only composition"]
}
```

### 2. Prompt Compiler

Prompt wording is not enough. The compiler must guarantee:

- every package has `output_kind=full_presentation_slide`;
- every package shares the same `design_consistency_contract_id`;
- slide-level `layout_archetype` and `slide_personality` can vary;
- locked rules for palette, card grammar, header/footer, motif, spacing, and text density remain stable;
- negative constraints are attached to every request.

### 3. Reference / Control Image Harness

Deterministic rendering is still useful, but only as control input or QA oracle.

Allowed use:

- wireframe reference image;
- safe-area oracle;
- node-line geometry oracle;
- failure annotation image;
- provider reference/control image.

Not allowed as the product answer unless explicitly scoped as fallback/export:

```text
deterministic final slide replacing generated full-slide raster
```

### 4. Visual Control Gate

Before human delivery, generated outputs should be checked along these axes:

| Axis | Question |
|---|---|
| design_system_consistency | Do slides look like the same deck? |
| slide_personality | Does each slide role have a distinct visual job? |
| typography_hierarchy | Are title/body/label hierarchy and readability stable? |
| card_block_rules | Do cards/components share the same grammar? |
| node_line_alignment | Do circles, route lines, and labels align precisely? |
| grid_margin_alignment | Are margins and safe areas respected? |
| crop_masking | Are images/text free from crop/mask failures? |
| overlap_intrusion | Does any region intrude into another? |
| ai_slop | Are fake UI labels, broken letters, or malformed details present? |
| presentation_slide_read | Does it read as a presentation slide, not a poster? |

### 5. Targeted regeneration / repair

Failures should produce repair requests, not random full rerolls.

Example:

```json
{
  "failed_axis": "node_line_alignment",
  "repair_instruction": [
    "Keep the same design consistency contract id and overall deck style.",
    "Regenerate slide 04 as a finished 16:9 presentation slide, not a poster.",
    "The route line must pass exactly through the center of each circular node.",
    "No line overshoot after the final node.",
    "Labels must be centered below nodes and remain inside the safe area.",
    "Do not introduce fake UI labels or cropped microcopy."
  ],
  "artifact_versioning": "slide_04.v2.png"
}
```

---

## v4 sample-run minimum requirements

A future Seoul Marathon v4 can be called `controlled full-slide image generation` only if it has:

```text
05_prompts/prompt_packages.jsonl
06_generation/provider_requests/*.json
06_generation/provider_responses/*.json
06_generation/raw_images/*
request metadata with output_kind=full_presentation_slide
request metadata with shared design_consistency_contract_id
raw images that are complete slide rasters, not backgrounds
09_qa visual control gate result
```

Report format:

```text
생성 방식: controlled full-slide image generation
이미지 생성 주장 가능 여부: 가능 — provider가 완성 슬라이드 래스터를 생성했고 raw/provider 로그가 있음
provider request 수: N
raw generated image 수: N + regeneration versions
rendered preview 수: N
visual control gate: pass/fail by axis
로그 폴더: /Users/jake/ppt_samples/runs/{timestamp}__seoul-marathon__controlled-full-slide-image-generation
```

---

## Status

This document is specification only. It does not claim implementation, runtime verification, or product readiness.

The next implementation work should build the pipeline:

```text
contract → control input → generation → gate → targeted repair → human golden set
```
