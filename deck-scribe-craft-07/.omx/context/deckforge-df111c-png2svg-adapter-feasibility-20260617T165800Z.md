# DF-111C PNG2SVG Adapter Feasibility Context

Implement DF-111C from `/Users/jake/chatgppt/docs/codex_ppt_ticket_breakdown.md`.

Existing state:
- DF-111A provides DOM-driven Level 2 editable layer models.
- DF-114 already allows optional `vector_region` and `image_region` extension layers in SVG rendering.
- DF-156 records PNG2SVG as an unlicensed external candidate: spike/reference only, not bundled MVP code.

Implementation direction:
- Do not import, vendor, or depend on `sunseol/PNG2SVG` code.
- Model an adapter contract for expected PNG2SVG outputs: manifest, SVG paths, text candidates, vector/raster/visual regions.
- Convert those outputs into DeckForge Level 3 editable draft layers and SVG extension region layers with `png2svg.*` source ids.
- Allow `ocrEngine: "none"` so macOS/no-OCR runs do not fail.
- Block Figma importer/package inputs from this MVP adapter path.
- Produce a spike report with fixture diff coverage, limitations, and DF-156 license handoff.

Verification:
- Unit tests for 10 fixture adapter run, source metadata mapping, no-OCR behavior, Figma import block, and report handoff.
- Run target tests, lint, and full verify.
