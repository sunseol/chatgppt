# DF-092 Image Provider Call Context

- Ticket: DF-092. 이미지 생성 Provider 호출 구현
- PRD: §6.3, §8.9
- Depends on: DF-023A, DF-091
- Scope: call a GPT Image/fallback-style provider with a slide prompt package and layout composition reference.

## Implementation Notes

- Keep provider invocation behind a testable `SlideImageProvider` interface.
- Mock provider returns deterministic local PNG data URLs for CI.
- OpenAI-style provider accepts an injected client so SDK/API details can evolve without changing the orchestration contract.
- Provider failures should return retryable failure descriptors instead of throwing through UI/queue layers.

## Risks

- Real API credentials and SDK transport are intentionally out of scope for this ticket.
