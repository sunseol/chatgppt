# PRD: DF-091 Slide Prompt Package

## Problem

The image provider needs a complete, frozen, slide-specific prompt package. If workers receive incomplete context, they may invent numbers, drift from the approved design, recreate the HTML layout as a web UI, or add unsourced content.

## Requirements

- Build a deterministic package from a slide context bundle.
- Include prompt asset id/version/hash for `slide_generation`.
- Include global deck context, approved design system, current slide spec, HTML layout prototype reference, DOM layer metadata, source map, editability constraints, and negative constraints.
- State that the HTML layout screenshot is a composition reference, not final style.
- Ban literal web UI reproduction, generic SaaS dashboard aesthetics, new numbers, new sentences, logos, and source additions.

## Out of Scope

- Provider-specific API request body.
- Image binary generation.
- Visual QA scoring.

## Acceptance

- Prompt package references the approved layout screenshot and DOM layers.
- Negative constraints are explicit and stable.
- Prompt package includes prompt version metadata.
- Prompt package does not require original conversation history.
