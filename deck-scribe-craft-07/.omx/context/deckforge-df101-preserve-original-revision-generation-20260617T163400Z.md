# DF-101 Preserve Original Revision Generation Context

Implement DF-101 from `/Users/jake/chatgppt/docs/codex_ppt_ticket_breakdown.md`.

Existing state:
- DF-100 provides `createSlideRevisionRequest` in `src/lib/slide-revision-model.ts`.
- Generated slides currently store `number`, `version`, `status`, `imageDescriptor`, and optional `notes`.
- Provider-facing image generation code uses small typed library modules with deterministic mock providers.

Implementation direction:
- Add a library module for revision generation rather than wiring UI first.
- Pass the original slide image reference and structured revision request into the provider input.
- Treat any changed or unverified `mustKeep` target as a failed generation.
- On success, emit a new ready slide version plus deterministic revision artifact metadata and before/after comparison.

Verification:
- Add targeted unit tests for mock revision generation and before/after comparison.
- Run target tests, lint, and full verify.
