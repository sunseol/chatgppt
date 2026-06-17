# DF-100 Slide Revision Request Model Context

- Ticket: DF-100. 슬라이드 수정 요청 모델 구현
- PRD: §8.10
- Depends on: DF-095
- Scope: structure natural-language slide edit requests into edit instruction, must-keep, must-change, design system id, slide plan id, and revision artifact metadata.

## Implementation Notes

- Preserve major elements not targeted by the user request.
- Keep artifact metadata deterministic for tests.
- This does not perform revision image generation; DF-101 owns that.
