# Live Web Search Evidence

Date: 2026-06-18

Scope: DF-221 Codex Live Web Search Connection.

Status: partial local contract

## Contract added

`src/lib/live-web-search-evidence.ts` validates the evidence that must be produced before a Research search run can count as DF-221 Live evidence.

- `webSearchMode` must be `live` and a `researchTurnId` must be present.
- Every candidate must preserve URL, title, `discoveredAt`, query, source candidate type, and live/cached/mock mode.
- Cached or mock candidates block with `non_live_search_candidate`.
- Candidate and latestness benchmark queries must be present in the event log, otherwise `candidate_query_not_recorded` or `latestness_query_not_recorded` blocks the evidence.
- Live candidates must cover at least three distinct domains, otherwise `insufficient_live_domains` blocks the evidence.
- Latestness benchmark evidence must be live, not cached-only, otherwise `cached_latestness_benchmark` blocks the evidence.
- Latestness candidate references must point at known search candidates, otherwise `unknown_latestness_candidate` blocks the evidence.
- `ResearchPack.webSearchEvidence` preserves the live web search event log through Research Pack schema parsing and approved Research Pack artifact creation.
- `src/lib/desktop-live-web-search-jobs.ts` builds a network-enabled desktop App Server `web_search` Research turn with `networkAccess: true` and validates the returned candidates through the same DF-221 evidence gate.
- `src/lib/desktop-live-web-search-jobs.ts` now uses an App Server-supported response schema for candidate URLs. A live repro showed the current App Server rejects `format: "uri"` inside response-format schemas, so URL syntax remains enforced at the Zod boundary while the App Server schema uses a non-empty string.
- `src/lib/desktop-live-web-search-workflow.ts` replaces the model-provided placeholder `researchTurnId` with the durable App Server turn id from production Codex provenance, then stores candidates as Research Pack sources with `ResearchPack.webSearchEvidence` and `ResearchPack.provenanceLineage`.
- `src/components/deck/ProductionResearchWebSearchLauncher.tsx` wires the production Research step to the desktop launcher and blocks launch until an approved live brief and desktop App Server bridge are present.

`summarizeLiveWebSearchEvidence` reports query count, candidate count, live candidate count, domain count, latestness mode, and blocking issue codes for release notes and issue comments.

## Verification

- `bun test src/lib/live-web-search-evidence.test.ts src/lib/research-pack-web-search.test.ts src/lib/desktop-live-web-search-workflow.test.ts src/components/deck/ProductionResearchWebSearchLauncher.integration.test.tsx` passes.
- `bun run typecheck` passes.

## Live App Server Recheck

Using the current `codex app-server --stdio` binary through the same temporary runtime-adapter boundary on 2026-06-19:

- The first `runDesktopLiveWebSearchResearchWorkflow` attempt reached App Server validation and failed before generation with `invalid_json_schema`.
- The rejected schema path was `properties.candidates.items.properties.url.format`; App Server reported that `uri` is not a valid response-format `format`.
- `src/lib/desktop-live-web-search-workflow.test.ts` now locks this with `uses an App Server supported response schema for live web search`.
- After removing the unsupported `format` keyword, the same workflow advanced past schema validation and started live turn `019edc05-daa6-7a52-abed-358f8c7912aa` on thread `019edc05-d881-7da3-8dd7-caaa6e33f24a`.
- That live turn did not emit `turn/completed` before the 360 second local adapter timeout, so no candidate evidence from this recheck is counted as DF-221 completion evidence.

## Remaining Live work

DF-221 is not ready to close. The local evidence gate prevents cached/mock search output from being counted as Live evidence, and the production Research step now has an app-level desktop launcher for a live `web_search` turn. The current App Server schema blocker is fixed, but it still needs a recorded authenticated packaged-app run that completes and produces at least three live source candidates from distinct domains.
