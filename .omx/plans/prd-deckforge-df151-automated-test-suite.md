# PRD: DF-151 Automated Test Suite

## Goal

DeckForge has a one-command automated regression suite for the MVP-critical workflow surfaces, runnable locally with the mock provider and actionable failure output.

## Acceptance Criteria

- A single package script runs the automated MVP suite.
- The suite covers state machine, context hash, prompt package, source map, design token, Layout IR, HTML hardening, layout render, DOM layer metadata, SVG editability, and export regression targets.
- Each target maps to concrete test files.
- Failure output includes the failing stage and artifact id.
- The suite is explicitly mock-provider/local runnable.

## Non-goals

- Do not add external CI infrastructure.
- Do not require live provider credentials.
- Do not replace `bun run verify`; this suite is the named MVP regression subset.

