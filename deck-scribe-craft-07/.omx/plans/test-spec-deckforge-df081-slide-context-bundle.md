# Test Spec: DF-081 Slide Context Bundle

## Unit Tests
- Given an approved project and frozen context, when slide bundles are built, then one bundle is created per slide and all share the same deck context id/hash.
- Given a slide with evidence, bundle includes source map ids and facts for that slide.
- Given a bundle payload, it does not include the original initial prompt or conversation history.
- Given a stable fixture, the first bundle matches a snapshot of required fields.

## Regression Checks
- `bun run lint`
- `bun run verify`
