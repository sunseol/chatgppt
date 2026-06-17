# Test Spec: DF-124 Editor Autosave Recovery

## Automated Tests

- Autosave snapshot test:
  - creates deterministic snapshot id/path/hash metadata
  - preserves edited Korean layer text
  - decides periodic save at 10 seconds or dirty edits
  - recovers the latest snapshot for a project

## Manual Verification

- Edit a layer in the editor and confirm the autosave localStorage entry changes.

