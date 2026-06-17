# PRD: DF-110 Editable Layer Model Schema

## Problem

The app needs a richer editable layer model than the current mock UI shape so downstream compositing and export can trace layers back to DOM metadata, datasets, and source maps.

## Requirements

- Represent layer id, source layer id, type, role, bounds, editability, source ids, dataset ids, and source map ids.
- Distinguish Level 2 MVP editability from Level 3 advanced object matching.
- Validate bounds and required fields.

## Acceptance

- Schema accepts a complete editable chart/text layer.
- Schema rejects invalid bounds.
- Quality levels are explicit and documented in code.
