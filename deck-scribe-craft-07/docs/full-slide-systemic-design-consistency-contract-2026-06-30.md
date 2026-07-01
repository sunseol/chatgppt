# Full-slide systemic design consistency contract — 2026-06-30

## Scope

User correction: prompt wording alone is too weak for DeckForge full-slide image generation. The harness should systemically force slide-to-slide design consistency instead of relying only on natural-language style hints.

This change adds a structured design consistency contract to the full-slide image-generation path.

## Implemented behavior

1. **Structured design consistency contract**
   - New module: `src/lib/full-slide-design-consistency.ts`
   - Builds a deterministic `FullSlideDesignConsistencyContract` from the approved design system and slide context bundle.
   - Contract includes:
     - `outputKind = full_presentation_slide`
     - `designSystemId`
     - palette fingerprint
     - typography fingerprint
     - locked header/footer rule
     - locked card/component rule
     - locked icon-family rule
     - locked motif rule
     - locked grid/spacing rule
     - locked text-density rule

2. **Prompt package carries the contract as data**
   - Updated: `src/lib/slide-prompt-package.ts`
   - `SlidePromptPackage` now includes:
     - `outputKind`
     - `designConsistency`
   - The generated prompt still includes the exact contract block, but the contract also exists as structured package metadata.

3. **Flow-level consistency gate before provider calls**
   - Updated: `src/lib/production-image-generation-flow.ts`
   - `runProductionImageGenerationFlow` now validates all prompt packages before calling the image provider.
   - Blocks when:
     - a package is missing
     - output kind is not `full_presentation_slide`
     - slides do not share the same contract id
     - the exact contract block is missing from any prompt
     - required locked rules are absent
   - Ready result returns `designConsistencyValidation` evidence.

4. **Provider request metadata now carries contract identity**
   - Updated: `src/lib/slide-image-provider.ts`
   - OpenAI-style image requests now include:
     - `outputKind`
     - `designSystemId`
     - `designConsistencyContractId`
   - Stored request metadata preserves those fields when generated through the OpenAI-style provider path.

5. **Slide context includes stronger design tokens**
   - Updated: `src/lib/slide-context-bundle.ts`
   - Bundles now carry component rules and visual language in addition to colors, typography, layout rules, and negative rules.

## Why this is stronger than prompt-only

Previously, every slide could receive similar language but still drift because each provider call interpreted the style independently.

Now the image-generation harness has a machine-checkable invariant:

```text
All slide prompt packages in one deck must share the same full-slide design consistency contract id before the provider is called.
```

That means inconsistent prompt package construction is blocked before generation, and generated artifacts retain contract/request lineage for downstream review.

## Verification

Commands run:

```bash
bun test src/lib/slide-image-provider.test.ts
bun test src/lib/live-image-provider-adapter.test.ts src/lib/slide-image-provider.test.ts src/lib/image-provider-fallback.test.ts
bun test src/lib/slide-prompt-package.test.ts src/lib/slide-context-bundle.test.ts src/lib/slide-image-provider.test.ts src/lib/production-image-generation-flow.test.ts src/lib/live-image-provider-adapter.test.ts src/lib/live-background-batch.test.ts src/lib/live-slide-regeneration.test.ts src/lib/project-export.test.ts src/lib/pptx-project-export.test.ts
bun run typecheck
bun test
bun run build
```

Results:

```text
focused image/export regression: 29 pass / 0 fail
provider/request focused regression: 10 pass / 0 fail
bun run typecheck: exit 0
bun test: 723 pass / 0 fail
bun run build: exit 0
```

## Remaining product-quality limits

This does not magically guarantee that an external image model will visually obey every rule. It guarantees that DeckForge sends consistent, versioned, machine-checkable design contracts and blocks inconsistent request construction before generation.

Remaining acceptance work:

- packaged-app real-provider run must show five full-slide rasters with the same `designConsistencyContractId`;
- one regeneration must preserve the same contract id unless the user explicitly changes the approved design system;
- vision/OCR QA should still score rendered output for actual visual drift, small Korean text distortion, icon drift, header/footer drift, and information density;
- PowerPoint round-trip, clean-machine, notarization/Gatekeeper, non-developer UAT, and final sign-off remain separate release gates.
