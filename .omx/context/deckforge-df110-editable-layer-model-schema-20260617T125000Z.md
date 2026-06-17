# DF-110 Editable Layer Model Schema Context

- Ticket: DF-110. Editable Layer Model 스키마 정의
- PRD: §8.11
- Depends on: DF-074
- Scope: define layer id, source layer id, type, role, bounds, editability, dataset/source linkage, and editability quality levels.

## Implementation Notes

- Keep this schema separate from the existing lightweight UI `EditableLayerModel` type.
- Use camelCase in TypeScript while preserving source-layer and dataset semantics.
- Level 2 is the MVP overlay path; Level 3 is a future advanced object matching target.
