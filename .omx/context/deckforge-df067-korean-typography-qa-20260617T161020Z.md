# DF-067 Korean Typography QA Context

## Task Statement
Implement DF-067 Korean Typography QA from `docs/codex_ppt_ticket_breakdown.md`.

## Desired Outcome
- Provide a deterministic benchmark report for Korean typography quality.
- Fail when Korean replacement characters appear.
- Validate minimum readable font size and line-height for title, body, caption/source, and mixed number text.
- Confirm mixed Korean/English/number strings and source captions remain readable.

## Known Facts / Evidence
- DF-066 is verified by `bun run verify`: typecheck, 277 tests, and production build passed.
- `src/lib/font-policy.ts` defines Korean-safe fallback families, line-height, zero letter spacing, and no bundled font files.
- `src/lib/font-manager.ts` maps font policy across preview/editor/SVG/PPTX surfaces.
- `src/lib/text-layer-reconstruction.ts` produces role-aware reconstructed text layers and already detects replacement characters.

## Constraints
- Keep the benchmark pure and deterministic.
- Do not introduce dependencies.
- Keep source files under the 250 pure LOC ceiling.
- Preserve existing font policy behavior unless the benchmark exposes a concrete bug.

## Unknowns / Open Questions
- No browser-level pixel OCR is available in the current acceptance criteria; use structural/text/font metrics and a mobile visual smoke test if UI surfaces are touched.

## Likely Codebase Touchpoints
- `src/lib/korean-typography-qa.ts`
- `src/lib/korean-typography-qa.test.ts`
- `src/lib/text-layer-reconstruction.ts` only if the benchmark requires shared primitives.
