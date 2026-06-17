# Test Spec: DF-073 Local HTML Renderer

## Unit Tests
- Given valid Layout IR, when local render artifacts are created, then every slide has the expected aspect ratio, HTML, CSS, DOM layer metadata, and a PNG data URL.
- Given the same Layout IR twice, when rendered, then HTML/CSS and DOM metadata are identical.
- Given unsafe renderer output or invalid Layout IR, when safe rendering is attempted, then it returns a failed result.
- Given a failed render followed by valid Layout IR, when safe rendering is retried, then it returns ready output.

## UI Tests
- Given a layout rendering error, the Layout stage can display a visible stage error and clear it on retry.

## Regression Checks
- `bun run lint`
- `bun run verify`
