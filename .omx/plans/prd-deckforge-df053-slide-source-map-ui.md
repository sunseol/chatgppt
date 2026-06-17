# DF-053 PRD: Slide Source Map UI/Advanced Linking

## Goal

Users can review the slide-level claim/source/dataset map before approving the deck plan, see unsafe links, and submit manual correction instructions.

## Scope

- Display one source-map row per slide with linked claim ids, source ids, dataset ids, and rejected claim ids.
- Surface fatal source-map issues in the planning sidebar.
- Provide a manual correction request control that appends correction guidance to the plan markdown.
- Prevent source-less numeric claims from reaching image-generation facts.

## Non-Goals

- Full drag-and-drop source-map editing.
- Persisting a separate normalized source-map artifact.
- Adding new dependencies.

## Acceptance Criteria

- The review UI shows slide-by-slide evidence mapping and fatal issues.
- Manual correction text can be submitted from the Plan stage.
- The final report continues to show the slide-level source map.
- A source-less numeric claim is not included in slide context facts or prompt package input.

## Risks

- `slide-source-map.ts` is already the canonical minimal map; duplicating logic would increase drift. The review layer must derive from the canonical map.
- The Plan sidebar is narrow; UI text must stay compact and wrap safely.
