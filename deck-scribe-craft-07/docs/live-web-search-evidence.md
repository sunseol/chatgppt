# Live Web Search Evidence

Date: 2026-06-19

Scope: DF-221 Codex Live Web Search Connection.

Status: verified live worker evidence

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
- Live App Server `web_search` Research turn `019edc32-6efe-7280-a2c1-47fb1d6b0ebf` completed with six live candidates across six domains and zero `validateLiveWebSearchEvidence` blockers.

## Live App Server Recheck

Using the current `codex app-server --stdio` binary through the same temporary runtime-adapter boundary on 2026-06-19:

- The first `runDesktopLiveWebSearchResearchWorkflow` attempt reached App Server validation and failed before generation with `invalid_json_schema`.
- The rejected schema path was `properties.candidates.items.properties.url.format`; App Server reported that `uri` is not a valid response-format `format`.
- `src/lib/desktop-live-web-search-workflow.test.ts` now locks this with `uses an App Server supported response schema for live web search`.
- After removing the unsupported `format` keyword, the same workflow advanced past schema validation and started live turn `019edc05-daa6-7a52-abed-358f8c7912aa` on thread `019edc05-d881-7da3-8dd7-caaa6e33f24a`.
- That live turn did not emit `turn/completed` before the 360 second local adapter timeout, so no candidate evidence from this recheck is counted as DF-221 completion evidence.
- A later rerun with a 720 second adapter timeout completed live App Server thread `019edc32-6c92-7371-b34d-e6e7858253db` and turn `019edc32-6efe-7280-a2c1-47fb1d6b0ebf` in 315,804 ms.
- The workflow patch stored artifact provenance for `p_df221_live_web_search_20260619_live_web_search`, prompt version `research_web_search_desktop@v1`, input artifact `brief_df221_live_web_search`, execution mode `production`, provider kind `codex`, auth mode `codex_session`, fixture `false`, and the durable thread/turn ids.
- The accepted evidence recorded six live queries, six live candidates, six distinct source domains, and a live latestness benchmark for `oracle_fy2026_official`.
- Candidate URLs included `investor.oracle.com`, `investor.atmeta.com`, `ir.aboutamazon.com`, `www.microsoft.com`, `abc.xyz`, and `hai.stanford.edu`.
- `validateLiveWebSearchEvidence` returned no blocking issue codes, and the resulting `ResearchPack.webSearchEvidence` plus `ResearchPack.provenanceLineage` were present in the workflow patch.

## Remaining Live work

DF-221's worker-level acceptance criteria are satisfied by the completed live App Server `web_search` Research turn and three-domain evidence. Packaged Golden Path research execution, source capture/recapture, claim evidence extraction, Research approval, and final release validation remain tracked by DF-222, DF-223, DF-224, DF-241, and DF-247 rather than this ticket.
