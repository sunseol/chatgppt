# DF-124 Editor Autosave Recovery Context

- Ticket: DF-124. 자동 저장과 크래시 복구
- Priority: P0
- Depends on: DF-013, DF-120

Add editor autosave snapshots for layer edits so local projects can recover the latest editor state after restart or crash.

## Scope

- Create hash-stable editor autosave snapshots.
- Save on major editor layer edits.
- Decide periodic autosave with a 10 second interval helper.
- Recover the latest snapshot for a project.

