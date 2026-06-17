# PRD: DF-034 Project Asset Import MVP

## Problem

DeckForge needs user-provided files to become first-class project assets with artifact metadata. Research, planning, and design stages must be able to reference those assets without leaking sensitive files to external providers silently.

## Scope

- Add an `asset` artifact type and project `assets` folder.
- Support image, PDF, CSV/XLSX, and text assets.
- Compute stable artifact id/hash/path for imports.
- Mark assets as referenceable by research, plan, and design.
- Require explicit review before sensitive assets are transferred to an external provider.

## Acceptance Criteria

- Uploaded files have artifact id and hash.
- Imported assets can be referenced by research, deck plan, and design system work.
- Sensitive files are explicitly flagged before external provider transfer.

## Non-Goals

- Binary file persistence adapter.
- Asset gallery UI.
- Logo placement and design prioritization; that is DF-035.
