# Test Spec: DF-133 Final Export Gate

## Unit

- Given invalidated downstream artifacts, final export gate returns a blocking issue.
- Given missing report/export package/project file/pngs, final export gate returns blocking issues.
- Given a report that references the export artifact and a complete export summary, final export gate returns ready with report/export hashes.

## Integration

- ExportStage renders a blocked final gate panel when the project has invalidated outputs.
- ExportStage auto-finalizes only when the final gate is ready.
