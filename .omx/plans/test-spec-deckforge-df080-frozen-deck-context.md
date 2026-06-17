# Test Spec: DF-080 Frozen Deck Context

## Unit Tests
- Given a fully approved project, when a frozen deck context is created, then it is locked and contains approved artifact ids, hashes, layout prototype id, and DOM layer metadata.
- Given the same approved project twice, when context is created, then context id and hash are stable.
- Given an upstream approved hash change, when context is recreated, then context id changes.
- Given a missing or unapproved artifact, context creation returns blocked issues.

## Integration Tests
- Prompt package integration can reference the same `deckContextId` and layout prototype id for all slide jobs.

## Regression Checks
- `bun run lint`
- `bun run verify`
