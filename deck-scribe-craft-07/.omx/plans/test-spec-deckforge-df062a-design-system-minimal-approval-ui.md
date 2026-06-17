# DF-062A Test Spec

## UI Tests

- Renders Design System ID, JSON, negative rules, preview, and exact approval CTA.

## Schema/Generator Tests

- Design System schema accepts generated design output.
- Generator returns one deck-wide design id.

## Commands

- `bun test src/components/deck/DesignStage.integration.test.tsx src/lib/design-system.test.ts src/lib/design-system-generator.test.ts`
- `bun run lint`
- `bun run verify`
