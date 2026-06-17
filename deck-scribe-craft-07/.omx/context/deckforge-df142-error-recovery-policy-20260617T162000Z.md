# DF-142 Error Recovery Policy Context

Ticket: DF-142 오류 처리와 복구 정책 구현
Date: 2026-06-17

## Ticket Source

- Priority: P0
- Scope: provider 오류, 렌더 오류, 저장 오류, 변환 오류를 사용자 액션 가능한 형태로 표시한다.
- Acceptance:
  - 오류는 단계, 원인, 재시도 가능 여부를 포함한다.
  - 저장 실패는 작업물 유실을 방지한다.
  - 치명 결함은 최종 승인으로 넘어가지 못한다.
- Verification: failure injection tests

## Existing State

- `StageErrorBanner` shows a title and message but lacks stage/retryability/recovery metadata.
- `LayoutStage` catches render failures as plain strings.
- `final-export-gate` blocks invalidated/missing final artifacts but not fatal workflow errors.
- Provider job UI already summarizes provider failures without raw logs.

## Implementation Notes

- Add a typed workflow error policy for provider/render/save/transform failures.
- Redact and summarize causes before rendering.
- Save failures carry a draft recovery snapshot so work can be restored manually.
- Final export gate blocks workflow errors marked `blocksFinalApproval`.
