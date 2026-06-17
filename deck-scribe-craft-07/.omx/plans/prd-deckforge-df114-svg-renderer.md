# PRD: DF-114 SVG Renderer

## Problem

The app needs a native SVG renderer for editable layer models before export can produce stable files. The renderer must not depend on PNG2SVG/Figma plugin packages for the MVP path.

## Requirements

- Render editable text, chart, shape, and image layers into SVG.
- Preserve locked generated background as a separate base image.
- Preserve layer lineage attributes.
- Apply reconstructed text/font candidates.
- Support optional vector/image region extension layers without making them required.
- Provide a deterministic visual similarity check against the 10% target.

## Acceptance

- SVG keeps main objects editable and separated.
- Text, chart, shape, image, and background layers are distinct.
- Extension `vector_region` and `image_region` layers render when supplied.
- Figma plugin metadata is not required by the runtime path.
