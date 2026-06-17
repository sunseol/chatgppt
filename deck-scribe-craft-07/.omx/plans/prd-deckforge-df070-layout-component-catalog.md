# PRD: DF-070 Restricted Layout Component Catalog

## Problem
Layout generation needs a constrained component vocabulary before Layout IR exists. Without a catalog, the mock layout path still behaves like free-form component selection.

## Scope
- Define the approved slide component types:
  CoverHero, Agenda, SectionDivider, KeyMessage, TwoColumn, ChartWithInsight, MetricCards, ComparisonTable, Timeline, ImageWithCaption, ClosingSummary.
- Define required slots and editable layer roles per component.
- Define allowed design token references per component.
- Provide helpers for validating and selecting component definitions.
- Wire mock layout component selection through the catalog.

## Acceptance Criteria
- Free HTML or unknown component types are rejected.
- Every component has required slots and editable layer roles.
- Every component references approved token namespaces only.
- Mock layout uses catalog-defined component types and roles.

## Non-Goals
- Layout IR schema.
- HTML/CSS renderer.
- Sandbox enforcement.
