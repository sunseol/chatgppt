# PRD: DF-071 Layout IR Prompt

## Problem
The app needs a provider-facing prompt for Layout IR generation, but provider output must stay inside the constrained renderer contract. Without a prompt package and parse boundary, a provider could drift into free-form HTML, CSS, fonts, colors, JavaScript, or external resources.

## Scope
- Build a prompt package from an approved Deck Plan and approved Design System.
- Include an allowed component catalog, schema contract summary, and slide/source constraints.
- Require JSON-only Layout IR output with draft metadata.
- Provide a parser that validates candidate provider output through `LayoutIRSchema`.
- Reject unapproved plans/design systems before prompt creation.

## Acceptance Criteria
- Prompt package output is snapshot-stable.
- Prompt instructs that output must pass the Layout IR JSON schema.
- Prompt only permits approved components, slots, layer roles, token refs, source ids, dataset ids, and editable flags.
- Prompt forbids arbitrary CSS, arbitrary color/font values, JavaScript, inline event handlers, and external resources.
- Candidate parsing fails when schema validation fails.
- Layout IR draft metadata is required.

## Non-Goals
- Real AI provider integration.
- Renderer sandbox implementation.
- CSS whitelist hardening.
- Final slide visual design generation.
