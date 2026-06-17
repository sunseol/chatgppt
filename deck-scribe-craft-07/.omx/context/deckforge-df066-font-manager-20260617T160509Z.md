# DF-066 Font Manager Context

## Ticket

- DF-066. Font Manager 구현

## Existing Surface

- `FONT_POLICY` defines the fallback families and spacing rules.
- `SlidePreview`, `text-layer-reconstruction`, and `editable-svg-renderer` already consume the policy.
- There is no explicit manager for local available fonts or PPTX export mapping.

## Implementation Direction

- Add `font-manager.ts` as a policy manager over `FONT_POLICY`.
- Keep detection deterministic and dependency-injected: callers pass local available font names.
- Produce surface mappings for `html_preview`, `editor`, `svg_export`, and `pptx_export`.
- Keep bundled font files empty.
- Add consistency validation for Korean role mappings.

## Verification

- Unit tests for local font detection, surface mappings, and consistency validation.
- Existing preview/SVG/text reconstruction tests.
- Korean sample browser QA using current app surfaces.
