# Test Spec: DF-130A PNG/Project Export

## Unit

- Given a final project with layout PNGs and editable layers, when an export package is built, then slide PNG files reuse approved layout PNGs and include deterministic paths/hashes.
- Given secret-like values in the project prompt, when the project JSON export is built, then credentials are redacted and the secret scan passes.
- Given a ready export package, when the project patch is created, then the patch stores `exportPackage` and appends an export approval log entry.
- Given missing layout PNGs, when packaging runs, then export is blocked with a typed issue.

## Integration

- Export stage renders PNG/project/report actions and stores the export summary when finalizing.

## Manual/Browser

- Open `/project/{id}/export`, verify PNG buttons are enabled, project file button is enabled, and `deckforge.projects.v1` contains `exportPackage` after auto-finalization.
