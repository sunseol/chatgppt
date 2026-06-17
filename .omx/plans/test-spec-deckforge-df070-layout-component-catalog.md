# Test Spec: DF-070 Restricted Layout Component Catalog

## Unit Tests
- Given the catalog, then it includes exactly the approved component types.
- Given each component, then schema parsing succeeds and required slots/editable roles are non-empty.
- Given `FreeHtml`, then component type validation fails.
- Given each component, then token references use only approved token namespaces.

## Integration Tests
- Given a mock plan and approved design system, when mock layout is generated, then all emitted component types exist in the catalog and DOM layer roles come from the selected component definition.

## Regression Checks
- `bun run lint`
- `bun run verify`
