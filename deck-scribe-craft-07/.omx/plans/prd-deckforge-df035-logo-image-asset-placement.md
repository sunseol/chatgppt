# PRD: DF-035 Logo/Image Asset Placement

## Problem

DeckForge should use user-provided logos and product images when available instead of inventing arbitrary brand imagery. Any placement into design or slide outputs must retain the source asset id and show whether external provider transfer requires user confirmation.

## Scope

- Model logo and product image placement requests from imported project assets.
- Preserve `sourceAssetId` on every placement suggestion.
- Prioritize user-provided image assets over generated placeholders.
- Attach external transfer review status for image-provider handoff.
- Produce placement hints consumable by design-system or slide-spec builders.

## Acceptance Criteria

- Logo and product image placements retain source asset id.
- A caller can inspect whether the asset may be sent to an image provider or needs confirmation.
- User-provided assets rank ahead of generated logo/image candidates.

## Non-Goals

- Drag-and-drop canvas UI.
- Binary image upload persistence; DF-034 owns import metadata.
- Actual image provider upload.
