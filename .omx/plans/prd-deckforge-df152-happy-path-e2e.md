# PRD: DF-152 Happy Path E2E

## Goal

DeckForge has a deterministic happy-path E2E test that proves the mock-provider MVP workflow can run from project creation through final report and export.

## Acceptance Criteria

- The full approval-based workflow runs in one test harness.
- Each major stage creates or approves an artifact record.
- Final export package exists with PNG, SVG, hybrid SVG, PPTX-compatible package, manifest, and redacted project file.
- Final generation report exists and references the export package.
- The test runs locally without provider credentials or browser automation.

## Non-goals

- Do not add live OpenAI/Codex provider E2E.
- Do not add Playwright browser UI coverage in this ticket.
- Do not change user-facing workflow UI.
