# DF-156 Dependency License / OSS Compliance Report

Date: 2026-06-18

## Verdict

Current TypeScript dependencies are acceptable for MVP internal testing and packaging with attribution tracking. No commercial-only dependency is present in the current top-level TypeScript manifest.

PNG2SVG is not cleared for direct merge, vendoring, or MVP bundle inclusion. The referenced repository is public but has no detected license file, so default copyright restrictions apply until the owner adds a compatible license or grants explicit permission.

## Evidence

- Current app manifest: `package.json`
- Current lockfile: `bun.lock`
- Current installed package tree: `node_modules`
- Font policy: `src/lib/font-policy.ts`
- App-shell font links: `src/routes/__root.tsx`
- PNG2SVG repo: `https://github.com/sunseol/PNG2SVG`
- PNG2SVG HEAD checked by `git ls-remote`: `21c8633a7cc318061f5f6b4875a7cdc51f325bd2`
- PNG2SVG GitHub API metadata checked on 2026-06-18: `license: null`
- PNG2SVG `LICENSE` raw URL checked on 2026-06-18: HTTP 404

## Current Rust/Tauri Inventory

The worktree now includes the Tauri v2 desktop scaffold:

- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`
- `src-tauri/capabilities/default.json`

Declared Rust crates:

| Crate         | Scope            | Version requirement | Expected license disposition |
| ------------- | ---------------- | ------------------: | ---------------------------- |
| `tauri`       | runtime          |                 `2` | Apache-2.0 OR MIT            |
| `serde`       | runtime          |                 `1` | Apache-2.0 OR MIT            |
| `serde_json`  | runtime          |                 `1` | Apache-2.0 OR MIT            |
| `tauri-build` | build dependency |                 `2` | Apache-2.0 OR MIT            |

The default Tauri capability is intentionally empty and grants no native permissions. Rerun this report against `src-tauri/Cargo.lock` whenever Tauri plugins, native permissions, or Rust crates are added.

## Top-Level Runtime Dependencies

| Package                           | Installed version | License    |
| --------------------------------- | ----------------: | ---------- |
| `@hookform/resolvers`             |             5.2.2 | MIT        |
| `@radix-ui/react-accordion`       |            1.2.12 | MIT        |
| `@radix-ui/react-alert-dialog`    |            1.1.15 | MIT        |
| `@radix-ui/react-aspect-ratio`    |             1.1.8 | MIT        |
| `@radix-ui/react-avatar`          |            1.1.11 | MIT        |
| `@radix-ui/react-checkbox`        |             1.3.3 | MIT        |
| `@radix-ui/react-collapsible`     |            1.1.12 | MIT        |
| `@radix-ui/react-context-menu`    |            2.2.16 | MIT        |
| `@radix-ui/react-dialog`          |            1.1.15 | MIT        |
| `@radix-ui/react-dropdown-menu`   |            2.1.16 | MIT        |
| `@radix-ui/react-hover-card`      |            1.1.15 | MIT        |
| `@radix-ui/react-label`           |             2.1.8 | MIT        |
| `@radix-ui/react-menubar`         |            1.1.16 | MIT        |
| `@radix-ui/react-navigation-menu` |            1.2.14 | MIT        |
| `@radix-ui/react-popover`         |            1.1.15 | MIT        |
| `@radix-ui/react-progress`        |             1.1.8 | MIT        |
| `@radix-ui/react-radio-group`     |             1.3.8 | MIT        |
| `@radix-ui/react-scroll-area`     |            1.2.10 | MIT        |
| `@radix-ui/react-select`          |             2.2.6 | MIT        |
| `@radix-ui/react-separator`       |             1.1.8 | MIT        |
| `@radix-ui/react-slider`          |             1.3.6 | MIT        |
| `@radix-ui/react-slot`            |             1.2.4 | MIT        |
| `@radix-ui/react-switch`          |             1.2.6 | MIT        |
| `@radix-ui/react-tabs`            |            1.1.13 | MIT        |
| `@radix-ui/react-toggle`          |            1.1.10 | MIT        |
| `@radix-ui/react-toggle-group`    |            1.1.11 | MIT        |
| `@radix-ui/react-tooltip`         |             1.2.8 | MIT        |
| `@tailwindcss/vite`               |             4.2.4 | MIT        |
| `@tanstack/react-query`           |           5.100.1 | MIT        |
| `@tanstack/react-router`          |          1.168.25 | MIT        |
| `@tanstack/react-start`           |          1.167.50 | MIT        |
| `@tanstack/router-plugin`         |          1.167.28 | MIT        |
| `class-variance-authority`        |             0.7.1 | Apache-2.0 |
| `clsx`                            |             2.1.1 | MIT        |
| `cmdk`                            |             1.1.1 | MIT        |
| `date-fns`                        |             4.1.0 | MIT        |
| `embla-carousel-react`            |             8.6.0 | MIT        |
| `input-otp`                       |             1.4.2 | MIT        |
| `lucide-react`                    |           0.575.0 | ISC        |
| `react`                           |            19.2.5 | MIT        |
| `react-day-picker`                |            9.14.0 | MIT        |
| `react-dom`                       |            19.2.5 | MIT        |
| `react-hook-form`                 |            7.73.1 | MIT        |
| `react-resizable-panels`          |            4.10.0 | MIT        |
| `recharts`                        |            2.15.4 | MIT        |
| `sonner`                          |             2.0.7 | MIT        |
| `tailwind-merge`                  |             3.5.0 | MIT        |
| `tailwindcss`                     |             4.2.4 | MIT        |
| `tw-animate-css`                  |             1.4.0 | MIT        |
| `vaul`                            |             1.1.2 | MIT        |
| `vite-tsconfig-paths`             |             6.1.1 | MIT        |
| `zod`                             |           3.25.76 | MIT        |

## Top-Level Dev And Build Dependencies

| Package                             | Installed version | License    |
| ----------------------------------- | ----------------: | ---------- |
| `@eslint/js`                        |            9.39.4 | MIT        |
| `@lovable.dev/vite-tanstack-config` |             2.3.2 | MIT        |
| `@types/node`                       |          22.19.17 | MIT        |
| `@types/react`                      |           19.2.14 | MIT        |
| `@types/react-dom`                  |            19.2.3 | MIT        |
| `@vitejs/plugin-react`              |             5.2.0 | MIT        |
| `eslint`                            |            9.39.4 | MIT        |
| `eslint-config-prettier`            |            10.1.8 | MIT        |
| `eslint-plugin-prettier`            |             5.5.5 | MIT        |
| `eslint-plugin-react-hooks`         |             5.2.0 | MIT        |
| `eslint-plugin-react-refresh`       |            0.4.26 | MIT        |
| `globals`                           |           15.15.0 | MIT        |
| `nitro`                             |   3.0.260603-beta | MIT        |
| `prettier`                          |             3.8.3 | MIT        |
| `typescript`                        |             5.9.3 | Apache-2.0 |
| `typescript-eslint`                 |            8.59.0 | MIT        |
| `vite`                              |             7.3.2 | MIT        |

## Transitive License Summary

Installed package metadata from `node_modules` produced 459 package entries:

| License      | Count |
| ------------ | ----: |
| MIT          |   387 |
| ISC          |    27 |
| Apache-2.0   |    18 |
| BSD-2-Clause |    14 |
| BSD-3-Clause |     6 |
| MPL-2.0      |     2 |
| Python-2.0   |     1 |
| CC-BY-4.0    |     1 |
| Unlicense    |     1 |
| 0BSD         |     1 |
| MIT AND ISC  |     1 |

No installed package metadata had a missing license field.

Attribution-sensitive or policy-review entries:

| Package                     | License   | Disposition                                                                                                               |
| --------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------- |
| `lightningcss`              | MPL-2.0   | File-level copyleft. Keep notice/source-offer workflow if bundled; currently build dependency through Tailwind/Vite.      |
| `lightningcss-darwin-arm64` | MPL-2.0   | Same as `lightningcss`; native build package.                                                                             |
| `caniuse-lite`              | CC-BY-4.0 | Data package requiring attribution. Include in third-party notices if shipped with tooling or generated package metadata. |

## Font Policy

`FONT_POLICY.bundledFontFiles` is `[]`. No font files are currently bundled with DeckForge.

The export/preview font policy uses system and Korean-safe fallback stacks:

- Sans: includes `Apple SD Gothic Neo`, `Malgun Gothic`, `Noto Sans KR`
- Serif: includes `AppleMyungjo`, `Noto Serif KR`
- Mono: uses system monospace fallbacks
- Letter spacing: `0em`

Risk: `src/routes/__root.tsx` still links Google Fonts for the app shell (`Fraunces`, `Inter`, `JetBrains Mono`). This does not add bundled font files, but it is an external network dependency and should not be used for generated slides, exports, or offline packaging. If DF-157 requires fully offline app-shell rendering, remove those links and rely on `src/styles.css` system stacks only.

## Rendering And Export Toolchain

Current MVP rendering/export code is first-party TypeScript in this worktree:

- Layout renderer: `src/lib/layout-html-renderer.ts`
- Layout sandbox: `src/lib/layout-renderer-sandbox.ts`
- PNG encoder/export: `src/lib/png-encoder.ts`, `src/lib/project-export.ts`
- SVG editable renderer: `src/lib/editable-svg-renderer.ts`
- Final compositor: `src/lib/final-slide-compositor.ts`

No external renderer binary, headless browser package, image conversion binary, or PPTX writer dependency is currently declared in `package.json`.

## PNG2SVG Candidate Review

Repository checked: `https://github.com/sunseol/PNG2SVG`

Observed repository structure:

- `vectorize_ppt_svg.py`
- `figma-plugin/slide-refine-importer/code.js`
- `figma-plugin/slide-refine-importer/ui.html`
- `figma-plugin/slide-refine-importer/manifest.json`
- `README.md`
- `PRODUCT.md`
- No `LICENSE`
- No `requirements.txt`

Observed implementation dependencies from `vectorize_ppt_svg.py`:

- Python stdlib: `argparse`, `base64`, `io`, `json`, `posixpath`, `re`, `subprocess`, `sys`, `tempfile`, `zipfile`, `datetime`, `pathlib`, XML modules
- External Python packages: `cv2` / OpenCV, `numpy`, `PIL` / Pillow
- Windows OCR path: PowerShell script using Windows Runtime OCR APIs, including `Windows.Media.Ocr.OcrEngine`

Risk disposition:

- Ownership: repository owner is GitHub user `sunseol`; no contributor/license grant file was found.
- Mergeability: not mergeable into DeckForge until a compatible license is added or explicit permission is recorded.
- Python dependency policy: OpenCV, numpy, and Pillow are not in the current MVP dependency set; any adapter spike must pin versions and run a separate Python license review.
- Windows OCR: Windows-only OCR must remain optional. It cannot be required for macOS MVP packaging.
- Figma plugin: excluded from MVP bundle. Any Figma import/export reuse belongs to Post-MVP scope after license and format ownership are resolved.

## Release Gate

DF-156 is passable for the current MVP branch with these conditions:

1. Keep the PNG2SVG repository as reference-only until license provenance is resolved.
2. Do not bundle the PNG2SVG Figma plugin in MVP builds.
3. Include MPL-2.0 and CC-BY-4.0 entries in third-party notices if packaging includes the related transitive packages.
4. Rerun this report whenever `src-tauri/Cargo.lock` or Tauri permissions change.
5. Keep generated slide/export font paths on local system fallback fonts; do not depend on Google Fonts for export output.

## Reproducible Commands

```sh
node -e 'const fs=require("fs"); const pkg=JSON.parse(fs.readFileSync("package.json","utf8")); const names=[...Object.keys(pkg.dependencies||{}),...Object.keys(pkg.devDependencies||{})].sort(); for (const name of names){const p=`node_modules/${name}/package.json`; if(fs.existsSync(p)){const meta=JSON.parse(fs.readFileSync(p,"utf8")); console.log(`${name}\t${pkg.dependencies?.[name]||pkg.devDependencies?.[name]}\t${meta.version||""}\t${typeof meta.license==="string"?meta.license:JSON.stringify(meta.license)||"MISSING"}`)} else {console.log(`${name}\t${pkg.dependencies?.[name]||pkg.devDependencies?.[name]}\tMISSING\tMISSING`)}}'
node - <<'NODE'
const fs=require('fs');
const path=require('path');
const root='node_modules';
const rows=[];
function visit(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(entry.name.startsWith('.')) continue;
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()){
      if(entry.name.startsWith('@')){
        visit(full);
      } else {
        const pkg=path.join(full,'package.json');
        if(fs.existsSync(pkg)){
          const data=JSON.parse(fs.readFileSync(pkg,'utf8'));
          const license=typeof data.license==='string'?data.license:(data.license?JSON.stringify(data.license):'MISSING');
          rows.push({name:data.name||entry.name,version:data.version||'',license});
        }
      }
    }
  }
}
visit(root);
const byLicense=new Map();
for(const row of rows) byLicense.set(row.license,(byLicense.get(row.license)||0)+1);
console.log(rows.length, [...byLicense.entries()]);
NODE
git ls-remote https://github.com/sunseol/PNG2SVG.git HEAD
curl -fsSL https://api.github.com/repos/sunseol/PNG2SVG
curl -fsSL 'https://api.github.com/repos/sunseol/PNG2SVG/git/trees/main?recursive=1'
curl -fsSL https://raw.githubusercontent.com/sunseol/PNG2SVG/main/README.md
curl -fsSL https://raw.githubusercontent.com/sunseol/PNG2SVG/main/LICENSE
curl -fsSL https://raw.githubusercontent.com/sunseol/PNG2SVG/main/vectorize_ppt_svg.py
```
