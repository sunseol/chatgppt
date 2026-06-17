# DF-061 Design System Generator Context

## Task Statement
Implement DF-061 from the current Git issue ticket list: generate a deck-wide design system from an approved Deck Plan and keep HTML layout generation locked until the design system is approved.

## Desired Outcome
- A deterministic generator creates one structured `DesignSystem` for the whole approved deck plan.
- Every slide receives or can report the same `design_system_id`.
- The design artifact carries explicit negative rules against invented chart values, tiny unreadable text, and random gradients.
- Layout prototype generation remains gated until design approval.

## Known Facts / Evidence
- DF-060 added `DesignSystemSchema`, structured typography/grid/canvas/colors, and immutable approved artifacts.
- `DesignStage` currently calls `mockDesign(project.brief)` and lives inside the oversized `stages.tsx`.
- `LayoutStage` already requires `project.plan` and `project.design` before generating, while route reachability is based on stage.
- `Provider DesignInput` currently includes only `brief`, so it cannot express DF-061's approved-plan dependency yet.

## Constraints
- Keep changes scoped and reversible.
- Follow strict TypeScript: no `any`, no type assertions except `as const`, readonly data shapes.
- Add regression tests before implementation.
- Avoid adding logic to oversized `stages.tsx`; extract design UI/model code.
- No new dependencies.

## Unknowns / Open Questions
- The eventual external provider contract may add richer design prompts, but this ticket can expose the required approved plan through the existing mock provider first.

## Likely Codebase Touchpoints
- `src/lib/design-system-generator.ts`
- `src/lib/design-system-generator.test.ts`
- `src/lib/provider-types.ts`
- `src/lib/mock-provider.ts`
- `src/lib/mock-provider.test.ts`
- `src/lib/mock-ai.ts`
- `src/lib/workflow-engine.ts`
- `src/lib/workflow-engine.test.ts`
- `src/components/deck/DesignStage.tsx`
- `src/components/deck/stages.tsx`
