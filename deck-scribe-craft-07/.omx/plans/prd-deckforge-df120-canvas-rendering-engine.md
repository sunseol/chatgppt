# PRD: DF-120 Canvas Rendering Engine

## Problem

The editor currently previews slides through the static slide preview, not a reusable editable canvas rendering contract. The app needs a canvas model that can render editable layers directly and preserve lock state.

## Requirements

- Convert an editable layer model into deterministic canvas render nodes.
- Render text, shape, image, and chart nodes with canvas-space bounds.
- Reflect locked/non-editable state.
- Include a 10-slide local project open performance smoke check against a 5 second target.

## Acceptance

- Text, shape, image, and chart layer types are visible in the render model/UI.
- Locked layers are marked non-interactive.
- 10-slide deck render estimate stays below 5 seconds.
