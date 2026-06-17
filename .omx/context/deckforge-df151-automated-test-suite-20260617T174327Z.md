# DF-151 Automated Test Suite Context

Ticket: DF-151 Automated Test Suite
Date: 2026-06-17T17:43:27Z

## Relevant Surfaces

- `package.json` has `test` and `verify`, but no named MVP regression suite command.
- Core regression tests already exist across workflow, context, prompts, source maps, design tokens, Layout IR, sandboxing, rendering, DOM metadata, SVG editability, and export.
- Provider behavior has mock-provider coverage, so the suite can run without CI credentials.

## Product Decision

DF-151 should add a manifest-driven suite runner over existing regression tests. It should not duplicate all tests; it should group the critical files, expose a single command, and format failures with stage and artifact id.

## Required Behavior

- Define suite targets for all required regression areas.
- Each target has stage, artifact id, command, and test files.
- Failure formatting includes stage and artifact id.
- Add a single package command for the suite.
- Runner executes with Bun and requires no external provider credentials.

