# Test Spec: DF-069 Layout IR Schema And Renderer Contract

## Unit Tests
- Given an approved plan and design system, when Layout IR is created, then it validates and has one slide IR per slide spec.
- Given unknown component type, unknown keys, or arbitrary style fields, then schema parsing fails.
- Given rendered Layout IR, then every output DOM layer id matches exactly one IR layer id.
- Given renderer output, then it contains deterministic component metadata and no script/style/free external URL surfaces.

## Integration Tests
- Given mock layout generation, when called with plan and design, then it uses Layout IR rendering and all component types/layer roles stay catalog-approved.

## Regression Checks
- `bun run lint`
- `bun run verify`
