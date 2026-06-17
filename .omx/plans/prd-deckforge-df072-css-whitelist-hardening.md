# PRD: DF-072 CSS Whitelist & Malicious Sample Hardening

## Problem
The renderer sandbox blocks major execution and URL surfaces, but DF-072 requires explicit CSS whitelist hardening and malicious sample regressions so deterministic renderer output cannot drift into unsafe CSS or HTML surfaces.

## Scope
- Add issue codes for blocked HTML elements and disallowed CSS properties.
- Reject `iframe`, `object`, `embed`, `link`, `meta refresh`, CSS imports, CSS URL references, and unknown/high-risk style properties.
- Preserve the current deterministic layout renderer output.

## Acceptance Criteria
- `script`, `iframe`, and inline event handlers are blocked.
- External URL requests remain blocked.
- Tauri API access remains blocked.
- CSS whitelist malicious samples fail with typed issue codes.

## Non-Goals
- Full CSS parsing engine.
- Real WebView sandbox orchestration.

## Verification
- `bun test src/lib/layout-renderer-sandbox.test.ts src/lib/layout-html-renderer.test.ts`
- `bun run lint`
- `bun run verify`
