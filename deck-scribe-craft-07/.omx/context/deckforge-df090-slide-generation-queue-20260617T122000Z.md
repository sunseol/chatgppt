# DF-090 Slide Generation Queue Context

- Ticket: DF-090. 슬라이드 생성 큐 구현
- PRD: §8.9
- Depends on: DF-081
- Scope: run slide image generation tasks in a bounded parallel queue with progress and partial failure reporting.

## Implementation Notes

- Queue workers must receive frozen slide context bundles, not the original project conversation.
- Every task must share the same Deck Context id/hash, design token hash, and HTML layout prototype id.
- Use provider job manager lifecycle for queued/running/succeeded/failed state.
- Return retryable failure descriptors for UI and later provider retry integration.

## Risks

- Real image provider invocation is DF-092, so this ticket uses an injected worker function.
