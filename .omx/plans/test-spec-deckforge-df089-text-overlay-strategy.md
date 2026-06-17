# Test Spec: DF-089 Text Overlay Strategy

## Automated Tests

- Strategy classification test:
  - title/body/source roles become editable text overlays
  - visual/image roles remain generated background
  - chart/table roles become chart overlays
- Lineage test:
  - chart/source overlays preserve source map ids and dataset ids
- Prompt package snapshot test:
  - prompt addendum includes negative text-rendering constraints
  - prompt addendum says composition reference, not final web UI
  - prompt addendum does not include exact slide title or message text
- Review test:
  - missing source map ids on source-backed overlays fail review

## Manual Verification

- Run `bun run verify` after implementation.
