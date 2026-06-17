# DF-153 MVP Scoring Harness Context

Ticket: DF-153 MVP 점수 산정 하네스
Date: 2026-06-17

## Ticket Source

- Priority: P0
- Scope: Technical MVP 점수표 기준으로 seed benchmark와 vertical slice 결과의 워크플로우, 인터뷰, 조사, 기획, 디자인, Layout IR/HTML preview, 이미지, editable overlay, 에디터, 보고 점수를 산정한다.
- Acceptance:
  - 총점 80점 이상 여부를 자동 산출한다.
  - 치명 결함은 점수와 무관하게 출시 불가로 표시한다.
  - benchmark별 점수와 실패 이유가 남는다.
- Verification: scoring harness test

## Existing State

- Layout, generated slide QA, editability, final gate, report, export, and workflow status already expose typed artifacts and pass/fail data.
- No single scoring harness aggregates benchmark outcomes into a Technical MVP readiness result.

## Implementation Notes

- Score ten categories at 10 points each.
- Keep the harness pure and input-driven so tests can run without launching the app.
- Use project artifacts and supplied QA reports/scores for category pass/fail decisions.
- Mark `releaseReady` false whenever fatal issues or final-approval-blocking workflow errors exist, even if score is high.
