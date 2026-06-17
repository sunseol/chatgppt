# PRD: DF-133 Final Export Gate

## Goal

Prevent final export from completing unless all final artifacts are current, report-backed, and frozen by an export artifact summary.

## Requirements

- Block final export when any workflow step is invalidated.
- Block final export when PNG/project export artifacts are missing.
- Block final export when a Generation Report is missing or does not reference the export artifact.
- Allow final export only when report and export package are complete.
- Preserve the export artifact summary and approval log after finalization.

## Non-Goals

- Full benchmark scoring is handled by later benchmark tickets.
- SVG/PPTX gates wait for their export tickets.
