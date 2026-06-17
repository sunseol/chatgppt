# PRD: DF-073 Local HTML Renderer

## Problem
The current layout prototype has component metadata and simple HTML fragments, but it does not yet expose deterministic local render artifacts that can be treated like the future `/layout_prototypes/{id}` output package.

## Scope
- Render validated Layout IR into deterministic local HTML/CSS documents.
- Produce a per-slide PNG preview data URL with the requested canvas aspect ratio.
- Preserve DOM layer metadata alongside HTML/CSS.
- Validate renderer output through the sandbox policy.
- Provide a recoverable render result for failure handling.
- Show layout rendering failures in the Layout stage.

## Acceptance Criteria
- Every slide renders with the Layout IR canvas aspect ratio.
- Renderer output cannot expose Tauri API access surfaces.
- Render failures can be represented as stage errors instead of silent busy states.
- Rendering the same Layout IR twice produces identical HTML/CSS and DOM layer metadata.

## Non-Goals
- High-fidelity browser rasterization.
- Bounding box extraction from live DOM.
- Full CSS whitelist hardening.
- Artifact-store file writes.
