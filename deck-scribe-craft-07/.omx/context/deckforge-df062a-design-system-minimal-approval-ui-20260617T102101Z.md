# DF-062A Design System Minimal Approval UI Context

## Task Statement
Implement DF-062A: a minimal UI for reviewing, regenerating, and approving a generated design system.

## Desired Outcome
- The design step shows a readable summary, a JSON view, and a preview for the generated design system.
- The approval CTA uses the exact ticket wording: `디자인 시스템을 승인하고 레이아웃 초안 생성 시작`.
- The UI makes the approved `design_system_id` visible so future DF-080 references have a stable identifier.

## Known Facts / Evidence
- DF-061 added `generateDesignSystemFromPlan`, deck-wide `DesignSystem.id`, and layout approval gate logic.
- `DesignStage` already supports generation, regeneration, approval, and sample preview.
- The current approval CTA is missing the final `시작`.
- The current design UI does not expose a JSON panel.

## Constraints
- No full token editor in DF-062A.
- Keep touched TypeScript files under 250 pure LOC.
- Add regression tests before implementation.
- No new dependencies.

## Unknowns / Open Questions
- The later DF-062 editor will own token editing and downstream invalidation on edits; this ticket should avoid that broader scope.

## Likely Codebase Touchpoints
- `src/components/deck/DesignPanels.tsx`
- `src/components/deck/DesignStage.tsx`
- `src/components/deck/DesignStage.integration.test.tsx`
