# PRD: DF-124 Editor Autosave Recovery

## Problem

Editor layer changes are important final work. A browser crash or restart should not lose the latest editable layer state.

## Requirements

- Capture editor layer snapshots with id, hash, timestamp, and reason.
- Trigger autosave after important editor edits.
- Provide a 10 second periodic autosave decision helper.
- Recover the latest snapshot for a project after restart/crash.

## Acceptance

- Restart recovery restores edited layer state.
- Crash recovery uses the latest snapshot.
- Autosave snapshot includes stable hash metadata.

