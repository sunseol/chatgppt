# DF-114 SVG Renderer Context

- Ticket: DF-114. SVG 렌더러 구현
- Priority: P0
- Depends on: DF-110, DF-111A, DF-112

Implement a native DeckForge SVG renderer over MVP editable layer models. Keep it independent from Figma/plugin runtime and reusable by future export tickets.

## Scope

- Render locked generated backgrounds plus editable text/chart/shape/image layers.
- Preserve source layer ids and source map ids.
- Apply DF-112 reconstructed font candidates to text layers.
- Accept optional `vector_region` and `image_region` extension layers.
- Expose a deterministic visual similarity estimate capped by the 10% P0 threshold.
