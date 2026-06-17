# DF-091 Slide Prompt Package Context

- Ticket: DF-091. Slide Prompt Package 구성
- PRD: §8.9, §11.3
- Depends on: DF-081, DF-082
- Scope: bundle approved slide plan, design system, layout screenshot, DOM layers, source map, editability constraints, and negative prompt for slide image generation.

## Implementation Notes

- Use `SlideContextBundle` as the only input so original conversation history cannot leak into workers.
- Attach the `slide_generation@v1` prompt asset version/hash.
- Include DF-089 text overlay addendum so exact text and charts are not rendered by the image model.
- Keep output deterministic for prompt package snapshot tests.

## Risks

- Real provider shape is DF-092; this package is provider-agnostic text plus metadata.
