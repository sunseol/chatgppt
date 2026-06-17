# Test Spec: DF-034 Project Asset Import MVP

## Asset Import Tests

- Given a CSV upload, when imported, then it receives an `asset` artifact id, hash, project assets path, kind, and reference targets.
- Given a sensitive PDF asset, when reviewed for local use, then no external confirmation is required.
- Given a sensitive PDF asset, when reviewed for external provider transfer, then user confirmation is required.
- Given an unsupported ZIP upload, when imported, then a typed import error is thrown.

## Artifact Tests

- Project folder schema includes `projects/{projectId}/assets`.
