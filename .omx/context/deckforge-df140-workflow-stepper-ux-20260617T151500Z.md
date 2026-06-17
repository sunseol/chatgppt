# DF-140 Workflow Stepper UX Context

Ticket: DF-140 전체 Workflow Stepper UX 구현
Date: 2026-06-17

## Ticket Source

- Priority: P0
- Scope: 0 Project부터 Export까지 현재 단계, 잠긴 단계, invalidated 단계, 완료 단계를 표시한다.
- Acceptance:
  - 사용자는 현재 단계와 다음 가능한 액션을 이해할 수 있다.
  - 잠긴 단계는 왜 잠겼는지 설명한다.
  - invalidated 단계는 재생성 필요성을 표시한다.
- Verification: stepper UI test

## Existing State

- `Stepper.tsx` already renders workflow rows and icons.
- Reachability and invalidation are modeled by `workflow-engine.ts` and `DeckProject.invalidated`.
- Current UI has icon-only current/complete/locked states and only a short invalidated subtitle.

## Implementation Notes

- Keep routing behavior intact: reachable rows remain links, locked rows stay inert.
- Add a small pure model to derive status labels, next-action text, lock reasons, and invalidation recovery text.
- Render these labels in the existing stepper row layout without changing workflow transitions.
