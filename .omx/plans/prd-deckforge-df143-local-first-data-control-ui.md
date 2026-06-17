# PRD: DF-143 Local-first Data Control UI

## Goal

Users can see where DeckForge stores project data, export the local project folder, open the project workspace, and delete local project data from the project list.

## Acceptance Criteria

- Each listed project exposes its storage location as browser local storage plus virtual folder path.
- The storage key `deckforge.projects.v1` is visible.
- The UI explicitly states that cloud sync is not provided in the MVP.
- The user can open the project workspace from the local data controls.
- The user can export the project folder as a local JSON file.
- The user can delete the local project.
- Exported folder content is redacted and local-only.

## Non-goals

- Do not add cloud sync.
- Do not add native filesystem access.
- Do not add remote backup/account flows.

