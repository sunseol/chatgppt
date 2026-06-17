# Test Spec: DF-156 Dependency License / OSS Compliance

## Report Review Checks
- Given the current `package.json`, the report lists every top-level runtime dependency with version and license.
- Given the installed `node_modules`, the report records transitive license bucket counts and highlights non-permissive/attribution-sensitive licenses.
- Given the current worktree has no Rust manifest, the report states that Rust/Tauri dependency inventory is currently empty and must be rerun when `Cargo.lock` exists.
- Given `FONT_POLICY.bundledFontFiles` is empty, the report states no font files are bundled and records app-shell Google Fonts links as a runtime/network risk.
- Given `sunseol/PNG2SVG` has no detected license file, the report blocks direct MVP merge/bundling of that code and excludes its Figma plugin from the MVP bundle.

## Verification Commands
- `node` package metadata inventory command
- `git ls-remote https://github.com/sunseol/PNG2SVG.git HEAD`
- `curl` checks for PNG2SVG README, repo API metadata, tree, and missing LICENSE
- `bun run lint`
- `bun run verify`

