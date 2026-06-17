# DF-061 Design System Generator Context

## Ticket

- DF-061. Design System 생성기 구현

## Existing Surface

- `src/lib/design-system-generator.ts` generates one deck-wide `DesignSystem` from an approved plan.
- `generateDesignSystemFromPlan` returns `slideRefs` where every slide points to the generated `designSystemId`.
- `src/lib/workflow-engine.ts` and `src/lib/layout-ir-prompt.ts` block layout generation until the design system is approved.
- Mandatory negative rules for chart values, tiny text, and random gradients are already emitted.

## Decision

No source change is required for DF-061. Existing implementation and tests satisfy the ticket. DF-060 added downstream negative-rule propagation, which strengthens DF-061's generated output path.

## Verification

- `bun test src/lib/design-system-generator.test.ts src/lib/workflow-engine.test.ts src/lib/layout-ir-prompt.test.ts src/lib/design-system.test.ts`
- `bun run lint`
- `bun run verify`
