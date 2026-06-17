# DF-143 Local-first Data Control UI Context

Ticket: DF-143 Local-first data control UI
Date: 2026-06-17T17:36:48Z

## Relevant Surfaces

- `src/lib/deck-store.ts` persists projects in browser `localStorage` under `deckforge.projects.v1`.
- `src/lib/artifacts.ts` defines virtual project folder paths such as `projects/{projectId}/exports`.
- `src/routes/index.tsx` renders the project list and already supports project deletion.
- Existing export surfaces download generated artifacts, but the home project list does not show storage location or local-only controls.

## Product Decision

The web MVP does not have direct filesystem APIs, so "project folder" means the deterministic DeckForge virtual project folder rooted at `projects/{projectId}` inside browser local storage. The UI should show this constraint explicitly and provide direct local export/delete/open actions without implying cloud sync.

## Required Behavior

- Show storage provider, storage key, and virtual folder path for each project.
- State that cloud sync is not available in the MVP.
- Provide project folder open, export, and delete controls.
- Export a redacted local project folder JSON payload.
- Keep controls local-only; do not introduce cloud sync or remote account concepts.

