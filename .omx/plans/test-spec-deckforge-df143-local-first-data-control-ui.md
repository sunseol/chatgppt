# Test Spec: DF-143 Local-first Data Control UI

## Regression Coverage

- `src/lib/local-data-control.test.ts`
  - Describes local storage provider, storage key, virtual folder path, and no-cloud-sync status.
  - Builds a redacted project folder export payload.

- `src/components/deck/LocalProjectDataControls.integration.test.tsx`
  - Renders storage location, storage key, virtual folder path, no-cloud-sync copy, and open/export/delete controls.

## Verification Commands

- `bun test src/lib/local-data-control.test.ts src/components/deck/LocalProjectDataControls.integration.test.tsx`
- `bun run lint`
- `bun run verify`

