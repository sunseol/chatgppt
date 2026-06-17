# DF-132 Generation Report Context

- Ticket: DF-132. Generation Report 생성
- Source: `/Users/jake/chatgppt/docs/codex_ppt_ticket_breakdown.md`
- Depends on: DF-014, DF-015A, DF-053A, DF-080, DF-082, DF-130A

## Decisions

- Preserve existing report section numbering through prompt versions (`## 9`) to avoid breaking earlier tests.
- Enrich the slide section with per-slide plan/source/design/layout/editable/generated lineage.
- Surface validation and uncertainty in the existing risk section.
- Append export package summary after prompt versions.

## Verification

- Report snapshot-style assertions for complete lineage and export summary.
- Risk assertions for layout validation failures, fact-check issues, and uncertain claims/items.
