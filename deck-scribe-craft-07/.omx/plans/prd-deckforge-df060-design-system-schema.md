# DF-060 PRD: Design System Schema

## Goal

The approved design system is a validated structured contract for all later layout and slide-generation stages.

## Scope

- Validate canvas ratio, dimensions, safe margin, grid, color tokens, typography min/max, layout rules, component rules, visual language, and negative rules.
- Keep approved design systems immutable as artifacts.
- Propagate negative rules into layout generation and slide generation prompts.

## Non-Goals

- Building the full design editor.
- Changing the generated visual style.
- Adding external schema tooling.

## Acceptance Criteria

- All token groups are schema-validated.
- Safe margin, grid, and typography min/max are required.
- Negative rules are available to both Layout IR generation and slide image generation.

## Risk

- Downstream prompt packages can drift from the schema if they copy only selected design fields. Tests must verify propagation explicitly.
