# vectorization_guidance v1

## Purpose
Guide conversion from slide images into editable vector and layer models.

## Inputs
- approved slide image
- DOM layer metadata
- layout bounds
- editable element list

## Output Format
- editable layers
- layer roles
- bounds
- text content
- non-editable raster areas

## Rules
- Keep title, body, chart, image, and background separable.
- Preserve source captions as editable text.
- Do not merge important text into images.
- Keep layer bounds close to layout metadata.

## Failure Mode
Return blocked status when text or chart regions cannot be separated safely.
