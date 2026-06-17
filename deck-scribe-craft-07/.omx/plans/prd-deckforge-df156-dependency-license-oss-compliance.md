# PRD: DF-156 Dependency License / OSS Compliance

## Problem
DeckForge needs an explicit license and distribution risk record before packaging. The current MVP uses TypeScript dependencies, local rendering/export code, system font fallbacks, and a referenced PNG2SVG adapter candidate whose ownership and license must not be assumed.

## Scope
- Inventory current top-level TypeScript runtime and dev/build dependencies.
- Summarize transitive installed package license buckets from `node_modules`.
- Record the current Rust/Tauri dependency state.
- Confirm font bundling policy and identify external font/network risks.
- Review Layout renderer/export toolchain ownership.
- Review `sunseol/PNG2SVG` license, dependency, Windows OCR, and Figma plugin risks.

## Acceptance Criteria
- MVP dependency license list exists.
- Commercial/restrictive license risks are called out.
- Font bundle policy aligns with the existing font policy.
- PNG2SVG ownership, mergeability, Python dependencies, Windows OCR conditions, and Figma plugin exclusion are documented.
- Report includes reproducible evidence commands.

## Non-Goals
- Installing license scanner dependencies.
- Importing or vendoring PNG2SVG code.
- Solving future Tauri packaging requirements.

