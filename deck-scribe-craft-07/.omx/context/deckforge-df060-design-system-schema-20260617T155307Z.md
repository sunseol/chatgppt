# DF-060 Design System Schema Context

## Ticket

- DF-060. Design System 스키마 정의

## Existing Surface

- `src/lib/design-system.ts` already validates canvas, grid, colors, typography min/max, layout rules, component rules, visual language, and negative rules.
- `src/lib/design-system-generator.ts` already emits mandatory negative rules.
- `src/lib/layout-ir-prompt.ts` does not currently include design `negativeRules` in the layout-generation prompt.
- `src/lib/slide-context-bundle.ts` currently passes colors, typography, and layout rules to slide generation, but not design `negativeRules`.

## Implementation Direction

- Preserve the existing schema shape.
- Add negative-rule propagation to slide context bundles and slide prompt packages.
- Add negative-rule propagation to layout IR prompt packages.
- Add regression tests so future schema edits cannot silently drop negative rules from downstream generation.

## Verification

- `bun test src/lib/design-system.test.ts src/lib/layout-ir-prompt.test.ts src/lib/slide-context-bundle.test.ts src/lib/slide-prompt-package.test.ts`
- `bun run lint`
- `bun run verify`
