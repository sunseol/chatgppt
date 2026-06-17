# DF-072 CSS Whitelist Hardening Context

## Task Statement
Implement DF-072 CSS Whitelist & malicious sample hardening from `docs/codex_ppt_ticket_breakdown.md`.

## Desired Outcome
- Extend deterministic layout renderer sandbox validation with CSS whitelist checks.
- Reject malicious HTML/CSS samples beyond the DF-072A minimum.
- Keep validated Layout IR renderer output passing.

## Known Facts / Evidence
- DF-072A already blocks external URLs, Tauri access, script tags, inline event handlers, sensitive auth file paths, and sandbox enforcement failures.
- `buildCss` in `layout-html-renderer.ts` emits deterministic CSS with a narrow set of selectors/properties.
- `layout-ir-prompt.ts` already forbids arbitrary CSS/style/font/color/JS/URLs in provider output.

## Constraints
- No dependencies.
- Keep sandbox validation deterministic and string-based.
- Do not block the current deterministic renderer output.
- Keep files under the pure LOC ceiling.

## Unknowns / Open Questions
- This is not a full browser CSS parser; first-pass whitelist should reject dangerous CSS surfaces and unknown high-risk properties while preserving current renderer CSS.

## Likely Codebase Touchpoints
- `src/lib/layout-renderer-sandbox.ts`
- `src/lib/layout-renderer-sandbox.test.ts`
