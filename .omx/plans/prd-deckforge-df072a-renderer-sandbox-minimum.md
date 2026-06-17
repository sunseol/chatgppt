# PRD: DF-072A Renderer Sandbox Minimum

## Problem
Layout rendering must fail closed if unsafe HTML reaches the renderer boundary. Even though Layout IR is constrained, the renderer should still enforce a final sandbox minimum before any layout output is surfaced downstream.

## Scope
- Add a reusable renderer sandbox policy validator.
- Block external URL request surfaces.
- Block Tauri API access surfaces.
- Block script execution and inline event handlers.
- Wire sandbox validation into `renderLayoutIrToPrototype`.
- Surface sandbox failures as rendering errors.

## Acceptance Criteria
- External URL request surfaces are blocked.
- Tauri API access surfaces are blocked.
- Script tags and inline event handlers are blocked.
- Sandbox failure prevents layout rendering from returning output.

## Non-Goals
- Full CSS whitelist implementation.
- Real browser iframe/WebView sandbox orchestration.
- Image rasterization or local HTML renderer UI.
