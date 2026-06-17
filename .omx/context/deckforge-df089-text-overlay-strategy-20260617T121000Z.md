# DF-089 Text Overlay Strategy Context

- Ticket: DF-089. Text Overlay Strategy 정의
- PRD: §6.3, §8.9, §8.11
- Depends on: DF-069, DF-074
- Scope: split generated visual background responsibilities from editable text, number, source, and chart overlays.

## Implementation Notes

- Use slide context bundles and DOM layer metadata as the source of truth.
- Image generation prompts should describe composition and visual background only.
- Title, body, numbers, source captions, and charts must be reserved for later editable overlays.
- Chart/source overlays must keep source map ids for lineage.

## Risks

- The final compositor is not implemented in this ticket, so the strategy must expose enough metadata for DF-096.
