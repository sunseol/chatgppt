# Test Spec: DF-091 Slide Prompt Package

## Automated Tests

- Prompt package snapshot test:
  - package includes `slide_generation@v1` version/hash
  - package references Deck Context id/hash and layout screenshot
  - package lists DOM layer ids, roles, bounds, source ids, and dataset ids
  - package includes source map ids and facts
- Negative constraint test:
  - prompt states composition reference, not final style
  - prompt bans literal web UI reproduction
  - prompt bans generic SaaS dashboard aesthetics
  - prompt bans new numbers, sentences, logos, and source additions
- Context hygiene test:
  - prompt package does not include the original project conversation prompt

## Manual Verification

- Run `bun run verify`.
