# DF-120 Canvas Rendering Engine Context

- Ticket: DF-120. 캔버스 렌더링 엔진 구현
- Priority: P0
- Depends on: DF-111A

Implement a deterministic editor canvas model and React rendering surface for editable layer models.

## Scope

- Render text, shape, image, and chart layers from editable layer models.
- Preserve locked state from non-editable layers.
- Expose a deterministic performance smoke estimate for opening a 10-slide deck under the 5 second target.
- Keep the existing oversized stage module from growing by extracting EditorStage into its own file.
