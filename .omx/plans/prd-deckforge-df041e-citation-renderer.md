# PRD: DF-041E Citation Renderer

## Problem

DeckForge currently shows source ids or ad-hoc source strings. Slide footers, generation reports, and source-map review surfaces need consistent citation text that includes source type, grade, publisher, title, year, and review warnings when confidence is weak.

## Scope

- Define source-type-aware citation formats.
- Provide short slide citations.
- Provide detailed Generation Report citations.
- Provide source-map citations with source id lineage.
- Flag uncertain, low-grade, or restricted sources.

## Acceptance Criteria

- Source type-specific citation formats are defined.
- Both slide-short and report-detailed citations are generated.
- Uncertain or low-grade sources are clearly marked.

## Non-Goals

- Full APA/MLA/Chicago style support.
- Bibliography sorting beyond caller order.
- UI source editor.
