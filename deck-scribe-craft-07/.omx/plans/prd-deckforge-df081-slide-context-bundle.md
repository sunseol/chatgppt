# PRD: DF-081 Slide Context Bundle

## Problem
Parallel slide generation needs small per-slide packets, not the whole project object or original conversation history. These packets must inherit the same frozen deck-level context while including only the data a slide worker needs.

## Scope
- Build one slide context bundle per slide.
- Include global summary, design tokens, layout screenshot reference, DOM layers, slide spec, facts, and source map.
- Exclude original conversation history and unapproved prompt text.
- Ensure all bundles share the same `deckContextId` and `deckContextHash`.

## Acceptance Criteria
- Bundle includes global summary, design tokens, layout screenshot, DOM layers, slide spec, facts, and slide source map.
- Bundle does not depend on original conversation history.
- Source map is included per slide.

## Non-Goals
- Prompt versioning.
- Image generation execution.
- Worker queue integration.
