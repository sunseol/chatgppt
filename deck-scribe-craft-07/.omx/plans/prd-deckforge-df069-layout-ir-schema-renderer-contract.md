# PRD: DF-069 Layout IR Schema And Renderer Contract

## Problem
Layout generation must not emit free-form HTML/CSS. It needs a constrained JSON IR that references approved components, slots, source metadata, and editable layer metadata. Deterministic app code should own rendering.

## Scope
- Define Layout IR schema.
- Require approved catalog component types.
- Require slot and layer metadata.
- Reject unknown keys and arbitrary CSS/style/font/color fields.
- Provide deterministic renderer contract to produce `LayoutPrototype`.

## Acceptance Criteria
- Layout IR validates with a JSON-schema-like runtime schema.
- Unknown component types and unknown keys fail validation.
- Arbitrary CSS/font/color/style cannot be represented.
- Rendered output has DOM layer metadata traceable 1:1 to Layout IR layer ids.

## Non-Goals
- Sandboxed WebView rendering.
- PNG rendering.
- CSS whitelist hardening.
- Layout prompt generation.
