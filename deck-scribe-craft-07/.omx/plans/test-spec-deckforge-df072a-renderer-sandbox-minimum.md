# Test Spec: DF-072A Renderer Sandbox Minimum

## Unit Tests
- Given safe Layout IR renderer output, when the sandbox policy validates it, then it passes.
- Given HTML with external URL attributes or CSS URL references, when validated, then it fails.
- Given HTML with Tauri API references, when validated, then it fails.
- Given script tags or inline event handlers, when validated, then it fails.
- Given a renderer sandbox failure, when rendering is attempted, then rendering throws a sandbox error.

## Regression Checks
- `bun run lint`
- `bun run verify`
