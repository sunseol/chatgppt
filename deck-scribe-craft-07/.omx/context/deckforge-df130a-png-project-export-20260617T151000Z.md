# DF-130A PNG/Project Export Context

- Ticket: DF-130A. PNG/Project Export
- Source: `/Users/jake/chatgppt/docs/codex_ppt_ticket_breakdown.md`
- Depends on: DF-096, DF-124
- Scope: Export final compositor/layout PNGs and a credential-safe project file.

## Decisions

- P0 export uses approved layout PNG data URLs as the visual source of truth for the current local mock path.
- Export packaging is pure and deterministic when supplied `now` and `version`.
- The UI stores an export artifact summary on the project before marking `EXPORT_READY`.
- Project JSON export is redacted before download and package hashing.

## Verification

- Unit regression covers PNG paths/data URLs, artifact id/hash/path, project redaction, blocked missing PNGs, and project patch storage.
- UI/browser verification should confirm export buttons and stored `exportPackage`.
