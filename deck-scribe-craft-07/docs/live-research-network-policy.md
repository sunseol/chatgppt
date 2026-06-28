# Live Research Network Policy

Date: 2026-06-18

Scope: DF-220 Research live network and prompt-injection policy contract.

## Local Contract

`src/lib/research-live-network-policy.ts` and `src/lib/research-source-fetcher.ts` enforce the local research network boundary:

- live web search is allowed only inside the Research step
- fetched web/PDF/API content is quarantined as `untrusted_source_content`
- fetched content is never promoted to user or developer instructions
- shell command requests are detected as `shell_command_request` and are not executable
- credential or secret requests are detected as `credential_request` and are not executable
- external POST/upload requests are detected as `external_post_request` and are not executable
- Source Fetcher allows only GET/HEAD for URL-backed sources
- production research failures cannot fall back to `mock_source`
- the production Research screen renders this policy contract before any approval review

## Verified Locally

- `src/lib/research-live-network-policy.test.ts` covers live-search scope, untrusted source quarantine, shell/credential/POST injection detection, and mock fallback blocking.
- `src/lib/research-source-fetcher.test.ts` covers GET/HEAD-only method blocking before network execution and preserves live URL metadata/hash when fetch succeeds.
- `src/components/deck/ProductionWorkflowStage.integration.test.tsx` covers the production Research surface policy panel, including Research-step live scope, `untrusted_source_content`, GET/HEAD-only copy, and `mock_research_fallback_forbidden`.

## Current Status

DF-220 is complete for the policy scope. Live web-search execution evidence is tracked by DF-221 and source capture evidence is tracked by DF-222; this ticket owns the Research network boundary and prompt-injection contract.
