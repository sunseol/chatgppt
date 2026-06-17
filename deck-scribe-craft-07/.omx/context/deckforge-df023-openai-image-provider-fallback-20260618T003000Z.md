# DF-023 OpenAIImageProvider Fallback Context

## Ticket

- Source: `/Users/jake/chatgppt/docs/codex_ppt_ticket_breakdown.md`
- Priority: P1
- Depends on: DF-023A
- Scope: Provide an API-key fallback when Codex session image generation is unavailable.

## Current-State Evidence

- DF-023A feasibility model selects `openaiImage` + `openaiApiKey` when Codex image capability is not confirmed.
- `src/lib/slide-image-provider.ts` already defines `OpenAIImageClient` and `createOpenAIImageProvider`.

## Implementation

- Added `src/lib/image-provider-fallback.ts`.
- API key is wrapped as an ephemeral session credential with a function-only authorization accessor.
- Public fallback state is serializable and excludes the raw key.
- Fallback transport receives authorization only at the provider boundary.
- Product copy exposes connection, billing, and permission differences.

## Verification

- `bun test src/lib/image-provider-fallback.test.ts src/lib/slide-image-provider.test.ts src/lib/image-provider-feasibility.test.ts`
