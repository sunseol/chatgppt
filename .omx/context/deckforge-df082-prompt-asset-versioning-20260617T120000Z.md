# DF-082 Prompt Asset Versioning Context

- Ticket: DF-082. 프롬프트 자산 버전 관리
- PRD: §11.1
- Dependency: DF-020
- Scope: version-managed core prompts for interview, research, deck plan, design system, HTML layout, slide generation, edit, QA, vectorization, and final report.

## Implementation Notes

- Prompt assets must exist as files under `/prompts`.
- A client-safe manifest should expose prompt id, stage, version, file path, and content hash.
- Provider audit events should be able to carry the prompt version/hash used for a run.
- Generation reports should include the prompt versions used by the deck package.

## Risks

- The app does not yet execute all real prompt-driven provider calls, so report output will record the active core prompt package by default.
- Do not import filesystem APIs from client-facing prompt manifest code.
