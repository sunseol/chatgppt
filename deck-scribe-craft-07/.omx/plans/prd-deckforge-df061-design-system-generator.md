# DF-061 PRD: Design System Generator

## Goal

Generate one validated deck-wide design system from an approved deck plan.

## Acceptance Criteria

- Every slide references the same generated `design_system_id`.
- HTML Layout Prototype generation is unavailable until the design system is approved.
- The generated design system includes negative rules for invented chart values, tiny unreadable text, and random gradients.

## Implementation Status

- `generateDesignSystemFromPlan` already enforces approved plan input.
- `slideRefs` already maps all slides to one generated design system id.
- `canGenerateLayoutPrototype` and `buildLayoutIrPrompt` already require approved design.
- `design-system-generator.test.ts` and `workflow-engine.test.ts` cover the acceptance criteria.

## Non-Goals

- Design editor UI.
- Alternative visual themes.
- Provider-backed design generation.
