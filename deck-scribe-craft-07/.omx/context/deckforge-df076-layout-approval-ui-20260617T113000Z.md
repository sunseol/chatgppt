# DF-076 Layout Approval UI Context

## Task Statement
Implement DF-076: provide a layout approval UI with PNG thumbnails, validation status, revision affordances, upstream navigation, and exact approval copy.

## Desired Outcome
- Layout stage displays layout PNG thumbnails from local render artifacts.
- Layout validation status is visible before approval.
- Approval is disabled until validation passes.
- Approval CTA text is exactly `레이아웃 초안을 승인하고 슬라이드 생성 시작`.
- User can request per-slide revisions locally, regenerate the whole layout direction, or go back to the design stage.
- The UI reiterates that the layout is a draft, not final design.

## Known Facts / Evidence
- DF-073 local renderer can create PNG data URLs.
- DF-075 validation produces a pass/fail report.
- Existing `GateBar` supports disabled approval and back/regenerate actions.

## Constraints
- No real provider revision loop in this ticket.
- No new dependencies.
- Keep `LayoutStage.tsx` below 250 lines.

## Unknowns / Open Questions
- Later real AI pipeline tickets will persist revision requests and feed them back into layout generation.

## Likely Codebase Touchpoints
- `src/components/deck/LayoutStage.tsx`
- `src/components/deck/LayoutValidationPanel.tsx`
- `src/components/deck/layout-approval-model.ts`
- `src/lib/mock-ai.ts`
- `src/lib/deck-types.ts`
