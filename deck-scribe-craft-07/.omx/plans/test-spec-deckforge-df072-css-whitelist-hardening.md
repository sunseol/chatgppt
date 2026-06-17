# Test Spec: DF-072 CSS Whitelist & Malicious Sample Hardening

## Unit Tests
- Given deterministic Layout IR renderer output, sandbox validation still passes.
- Given blocked HTML elements such as `iframe`, `object`, or stylesheet `link`, validation fails.
- Given CSS `@import`, `behavior`, `filter`, `position: fixed`, or unknown style properties, validation fails with CSS whitelist issues.
- Existing external URL, Tauri API, script, and inline handler tests continue to pass.

## Regression Targets
- `layout-html-renderer` still renders valid artifacts.
- `LayoutRendererSandboxError` still carries typed issues.
