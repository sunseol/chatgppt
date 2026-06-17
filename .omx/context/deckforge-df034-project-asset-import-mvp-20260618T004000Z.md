# DF-034 Project Asset Import MVP Context

## Ticket

- Source: `/Users/jake/chatgppt/docs/codex_ppt_ticket_breakdown.md`
- Priority: P1
- Depends on: DF-004, DF-013
- Scope: Add image, PDF, CSV/XLSX, and text files as project assets.

## Current-State Evidence

- `src/lib/artifacts.ts` had no `asset` artifact type or `assets` project folder.
- `src/lib/research-source-fetcher.ts` already blocks sensitive user-provided files before external provider transfer, but there was no project asset import model.

## Implementation

- Added `asset` to `ArtifactType` and `projects/{projectId}/assets` to project folder schema.
- Added `src/lib/project-assets.ts`.
- Imported assets get stable artifact id, hash, path, kind, byte size, sensitivity, and reference targets for research, plan, and design.
- Sensitive asset external transfer review is explicit.

## Verification

- `bun test src/lib/project-assets.test.ts src/lib/artifacts.test.ts`
