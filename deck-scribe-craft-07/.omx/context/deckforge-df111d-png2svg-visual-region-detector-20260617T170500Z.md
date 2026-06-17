# DF-111D PNG2SVG Visual Region Detector Port Context

Implement DF-111D from `/Users/jake/chatgppt/docs/codex_ppt_ticket_breakdown.md`.

Existing state:
- DF-111A produces DOM-driven text/chart/source overlay layers.
- DF-111C defines a safe PNG2SVG adapter manifest and metadata conversion boundary.
- DF-156 blocks bundling PNG2SVG source or Figma plugin code.

Implementation direction:
- Add a DeckForge-native detector that consumes PNG2SVG-like visual/raster region metadata.
- Convert panel/icon/photo-like regions into movable `visual_region` or `image_region` layers.
- Reject or warn on regions colliding with existing editable overlays.
- Track original PNG path/hash, region bounds, confidence, and source id.
- Produce benchmark metrics for oversegmentation, missing regions, blur risk, and text intrusion.

Verification:
- Unit tests for accepted movable regions, overlay collision rejection, and benchmark issue reporting.
- Run target tests, lint, and full verify.
