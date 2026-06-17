# DF-093 Generated Image Basic QA Context

- Ticket: DF-093. 생성 이미지 기본 검증
- PRD: §8.9, §14.2
- Depends on: DF-096
- Scope: validate final composed slides for aspect ratio, text readability, source-less numbers, and layout structure mismatch.

## Implementation Notes

- Validate the compositor output, not the raw generated background alone.
- Source-less number detection is based on editable overlay text and source map lineage.
- Layout structure mismatch uses editable layer bounds/source layer references as the MVP proxy.

## Risks

- OCR-based raw background inspection is not implemented here.
