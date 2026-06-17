# DF-141 Long-Running Job Progress UI Context

Ticket: DF-141 장시간 AI 작업 진행 상태 UI
Date: 2026-06-17

## Ticket Source

- Priority: P0
- Scope: 현재 단계, provider job progress, cancellation, retry, 생성된 중간 산출물, 실패/재시도 요약을 표시하는 최소 UI를 구현한다.
- Acceptance:
  - 내부 로그를 그대로 노출하지 않고 신뢰 가능한 요약을 제공한다.
  - 작업 취소 또는 재시도 경로가 명확하다.
  - job_id 기준으로 앱 재시작 후 상태를 복구한다.
- Verification: long-running mock task manual QA

## Existing State

- `ProviderJobManager` already tracks queued/running/succeeded/failed/cancelled jobs, progress, cancellation, retry, partial result, usage, and snapshot restore.
- `GenerateStage` has a local progress bar but no job id, recovery, retry/cancel summary, or intermediate artifact summary.
- `stages.tsx` is at the 250 pure LOC threshold, so GenerateStage should be split before adding this UI.

## Implementation Notes

- Add a pure progress view model that converts `ProviderJob` into user-facing labels.
- Redact and summarize failures; do not render stack traces or raw provider logs.
- Add a localStorage recovery codec keyed by project id + step + job id.
- Add a reusable `ProviderJobProgressPanel` and mount it in GenerateStage.
