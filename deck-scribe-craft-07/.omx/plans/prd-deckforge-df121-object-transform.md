# PRD: DF-121 Object Selection Move Resize

## Problem

The editor can render and edit text, but objects also need to be selected, moved, and resized without corrupting layer bounds.

## Requirements

- Select editable layers on the canvas.
- Move selected layers using canvas-space deltas.
- Resize selected layers with handles or equivalent controls.
- Snap near safe margins.
- Keep drag response cost deterministic and below an interactive threshold.

## Acceptance

- Click selection exposes the target layer.
- Move and resize update layer bounds immutably.
- Safe margin snapping works.
- Locked layers cannot be transformed.
