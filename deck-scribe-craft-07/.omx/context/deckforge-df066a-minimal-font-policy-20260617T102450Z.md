# DF-066A Minimal Font Policy Context

## Task Statement
Implement DF-066A: define a minimal Korean-safe fallback font policy for HTML preview, editor surfaces, SVG export/preview text, and avoid bundling unclear-license font files.

## Desired Outcome
- A typed font policy defines sans/serif/mono fallback stacks with Korean system fonts.
- SVG slide preview text uses the same policy rather than hard-coded `Inter`, `Fraunces`, or generic UI-only families.
- Global CSS variables align with the same fallback stacks.
- Korean text uses stable line-height and zero letter spacing.

## Known Facts / Evidence
- `src/styles.css` currently defines `--font-*` variables with Inter/Fraunces/JetBrains Mono and negative heading letter spacing.
- `SlidePreview.tsx` hard-codes SVG font families and is over 250 pure LOC.
- `__root.tsx` links Google Fonts, but no font files are bundled in the repo.

## Constraints
- No new dependencies.
- No bundled font files.
- Do not implement full Font Manager; that is DF-066.
- Split oversized `SlidePreview.tsx` before adding font changes.

## Unknowns / Open Questions
- Exact user-installed fonts vary by OS; policy should use broad system stacks and local Korean fallbacks.

## Likely Codebase Touchpoints
- `src/lib/font-policy.ts`
- `src/lib/font-policy.test.ts`
- `src/components/deck/SlidePreview.tsx`
- `src/components/deck/SlidePreviewVisuals.tsx`
- `src/components/deck/SlidePreviewFontPolicy.test.tsx`
- `src/styles.css`
