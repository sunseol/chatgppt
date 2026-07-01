# Controlled Full-Slide Image Generation Technical Roadmap

> **For Hermes:** This is a specification/roadmap document. Do not claim implementation done from this file alone. For implementation, use `subagent-driven-development` task-by-task and require executable evidence.

**Goal:** Build a DeckForge image-generation control loop that makes the image model generate complete presentation slide rasters under a shared design system, then detects and repairs visual-control failures.

**Architecture:** Use a structured Slide Image Control Contract as the invariant source of truth. Compile it into provider prompt packages and optional reference/control images, generate full-slide rasters, run a visual control gate, then regenerate failed slides with axis-specific repair instructions. Deterministic rendering is allowed only for control images, measurement or fallback export, not as the main product answer.

**Tech Stack:** TypeScript/Bun in `/Users/jake/chatgppt/deck-scribe-craft-07`, existing full-slide image flow modules, provider adapters, image artifact store, Playwright/Pillow or equivalent for previews, OCR/vision/geometry heuristics for QA candidates.

---

## Current classification

- Work type: `specification`
- Runtime behavior changed: no
- Implementation status: proposed only
- Primary follow-up artifact should be: source/test diff + generated run evidence, not another report

---

## Milestone 1 — Contract hardening

### Task 1: Define `SlideImageControlContract` schema

**Objective:** Make the control contract explicit enough to represent canvas, safe area, design invariants, allowed variation, and forbidden failures.

**Files:**
- Modify/Create: `src/lib/full-slide-design-consistency.ts`
- Test: `src/lib/full-slide-design-consistency.test.ts`

**Acceptance:**
- Contract includes `outputKind: 'full_presentation_slide'`.
- Contract includes `designSystemId`, `designConsistencyContractId`, canvas/safe area, palette, typography, component grammar, layout/motif rules, forbidden failures.
- Contract id is stable for the same approved design system and changes when the design system changes.

### Task 2: Add negative-control rules for known failures

**Objective:** Encode v2/v3 failures as first-class constraints.

**Files:**
- Modify: `src/lib/full-slide-design-consistency.ts`
- Test: `src/lib/full-slide-design-consistency.test.ts`

**Acceptance:**
- Contract can express: cropped text, fake microcopy, mask leakage, region intrusion, node-line misalignment, poster-only composition.
- Tests assert these failure constraints are present for presentation-slide generation.

---

## Milestone 2 — Prompt compiler

### Task 3: Compile contract + slide spec into prompt packages

**Objective:** Ensure every provider package is generated from structured contract data, not hand-written style hints.

**Files:**
- Modify: `src/lib/slide-prompt-package.ts`
- Test: `src/lib/slide-prompt-package.test.ts`

**Acceptance:**
- Every prompt package includes `outputKind=full_presentation_slide`.
- Every package carries the same `designConsistencyContractId` within a deck.
- Every package includes slide role, key message, layout archetype, visual hierarchy, must-preserve rules, must-avoid rules.

### Task 4: Add provider request metadata checks

**Objective:** Block calls that are missing full-slide provenance metadata.

**Files:**
- Modify: `src/lib/production-image-generation-flow.ts`
- Modify: `src/lib/slide-image-provider.ts`
- Test: `src/lib/production-image-generation-flow.test.ts`
- Test: `src/lib/slide-image-provider.test.ts`

**Acceptance:**
- Flow fails before provider call if any package is not `full_presentation_slide`.
- Flow fails before provider call if contract ids diverge.
- Stored request metadata includes `outputKind`, `designSystemId`, `designConsistencyContractId`, `layoutArchetype`.

---

## Milestone 3 — Reference/control image harness

### Task 5: Create deterministic wireframe/control image generator

**Objective:** Produce reference images that communicate layout and safe area to the image model without becoming the final product output.

**Files:**
- Create: `src/lib/full-slide-control-image.ts`
- Test: `src/lib/full-slide-control-image.test.ts`

**Acceptance:**
- Given a slide spec, generator emits a 16:9 control image or data descriptor with safe areas and major regions.
- Control image is stored as `control_reference`, not `raw_generated_image`.
- Manifest/provenance labels prevent counting control images as generated slides.

### Task 6: Attach control image reference to provider package

**Objective:** Let provider adapters receive optional control/reference input while preserving provenance.

**Files:**
- Modify: `src/lib/slide-image-provider.ts`
- Modify: `src/lib/production-image-generation-flow.ts`
- Test: `src/lib/live-image-provider-adapter.test.ts`

**Acceptance:**
- Provider request can include optional reference/control image path/id.
- Request log distinguishes `control_image` from `raw_generated_slide`.

---

## Milestone 4 — Visual control gate

### Task 7: Define visual control gate result schema

**Objective:** Standardize QA output for generated full-slide rasters.

**Files:**
- Create: `src/lib/full-slide-visual-control-gate.ts`
- Test: `src/lib/full-slide-visual-control-gate.test.ts`

**Acceptance:**
- Gate result contains axis-level status for: design consistency, slide personality, typography hierarchy, card/block rules, node-line alignment, grid/margins, crop/masking, overlap intrusion, AI slop, presentation-slide read.
- Gate returns defect candidates, not final aesthetic approval.

### Task 8: Add geometry/crop defect heuristics

**Objective:** Catch v3-style failures before human review.

**Files:**
- Modify: `src/lib/full-slide-visual-control-gate.ts`
- Test: `src/lib/full-slide-visual-control-gate.test.ts`

**Acceptance:**
- Heuristics can flag likely overflow/crop/region intrusion from image metadata or control-region comparison.
- Node-line checks can be based on expected oracle regions when available.
- Low-confidence results are labeled as `needs_human_review`, not pass.

---

## Milestone 5 — Targeted regeneration

### Task 9: Convert gate failures into repair requests

**Objective:** Turn failure axes into explicit repair instructions for one slide.

**Files:**
- Create: `src/lib/full-slide-repair-request.ts`
- Test: `src/lib/full-slide-repair-request.test.ts`

**Acceptance:**
- `node_line_alignment` failure produces line/node-specific repair language.
- `crop_masking` failure produces safe-area/crop repair language.
- `ai_slop` failure produces fake microcopy/malformed UI cleanup language.
- Repair request preserves existing contract id unless design system changed.

### Task 10: Version regenerated full-slide artifacts

**Objective:** Regenerate only failed slides and preserve v1/v2 lineage.

**Files:**
- Modify: `src/lib/production-image-generation-flow.ts`
- Modify: `src/lib/image-artifact-store.ts` or equivalent artifact storage module
- Test: `src/lib/production-image-generation-flow.test.ts`

**Acceptance:**
- Regenerated slide stores as `slide_XX.v2.png` or equivalent new artifact id.
- v1 remains immutable.
- Summary records original hash, repaired hash, failed axis, repair request id.

---

## Milestone 6 — Seoul Marathon v4 fixture

### Task 11: Generate a controlled full-slide sample run

**Objective:** Produce a concrete sample under the required artifact folder structure.

**Files/Output:**
- Create run folder: `/Users/jake/ppt_samples/runs/{timestamp}__seoul-marathon__controlled-full-slide-image-generation/`
- Required logs: `05_prompts`, `06_generation/provider_requests`, `06_generation/provider_responses`, `06_generation/raw_images`, `09_qa`, `manifest`

**Acceptance:**
- At least 6 full-slide raw generated images exist.
- Request count equals generated raw-image count plus repair versions.
- All requests have `output_kind=full_presentation_slide`.
- All requests share the same design contract id.
- Contact sheet is delivered for human visual testing.

### Task 12: Register accepted/rejected samples as golden set

**Objective:** Use human visual feedback as durable regression data.

**Files:**
- Create/Modify: `/Users/jake/ppt_samples/design_consistency/golden_samples_index.json`
- Create/Modify: `docs/result-testing-context.json`

**Acceptance:**
- v2 and v3 rejected samples are recorded with failure axes.
- Future accepted v4+ samples can be registered with artifact hashes and contract id.
- Golden set distinguishes human acceptance from AI/heuristic defect candidates.

---

## Verification gates for implementation phase

Focused tests before broad tests:

```bash
bun test src/lib/full-slide-design-consistency.test.ts \
  src/lib/slide-prompt-package.test.ts \
  src/lib/production-image-generation-flow.test.ts \
  src/lib/slide-image-provider.test.ts
```

Then:

```bash
bun run typecheck
bun test
bun run build
```

For sample-run proof:

```text
- run_manifest.json confirms mode=controlled-full-slide-image-generation
- prompt_packages.jsonl row count equals slide request count
- provider_requests contain output_kind=full_presentation_slide
- raw_images contain complete slide rasters
- visual_control_gate result exists
- contact sheet exists and is shown to human visual tester
```

---

## Key risk notes

1. A better prompt alone is not the moat; the moat is the closed loop.
2. Deterministic rendering is still useful, but only as control/reference/oracle/fallback.
3. AI visual review is not final pass authority.
4. Provider models may still fail geometry; the system must record, repair, and learn from failures.
5. Do not claim image generation unless provider logs + raw generated slide rasters exist.
