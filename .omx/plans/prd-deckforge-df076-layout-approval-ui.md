# PRD: DF-076 Layout Approval UI

## Problem
The layout stage can generate layout prototypes, but the approval UI does not yet show validation status, PNG layout thumbnails, per-slide revision controls, or the exact approval copy required before entering image generation.

## Scope
- Display layout PNG thumbnails.
- Display validation status and key metrics.
- Disable approval unless validation passes.
- Add exact approval CTA text.
- Add local per-slide revision request affordances.
- Add upstream navigation back to design.

## Acceptance Criteria
- User cannot proceed to image generation before approval.
- User is told the artifact is a layout draft, not final design.
- Approval button text is exactly `레이아웃 초안을 승인하고 슬라이드 생성 시작`.
- Validation failure blocks approval.

## Non-Goals
- Real persisted revision workflow.
- Image generation stage changes.
- Provider-backed layout regeneration instructions.
