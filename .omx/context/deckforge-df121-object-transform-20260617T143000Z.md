# DF-121 Object Selection Move Resize Context

- Ticket: DF-121. 객체 선택/이동/리사이즈 구현
- Priority: P0
- Depends on: DF-120

Add deterministic object transform operations for editor canvas layers and connect move/resize interactions to the canvas panel.

## Scope

- Select editable canvas objects.
- Move layers by canvas-space deltas, snapping to safe margins.
- Resize layers with minimum size and canvas boundary clamps.
- Estimate drag response cost for local editor interactions.
