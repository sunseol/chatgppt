# PRD: DF-100 Slide Revision Request Model

## Problem

Free-form slide revision text is unsafe to pass directly to a provider. The app needs a structured request model with explicit preservation and change boundaries.

## Requirements

- Parse user edit instructions into `editInstruction`, `mustKeep`, and `mustChange`.
- Include `designSystemId` and `slidePlanId`.
- Preserve major non-target elements by default.
- Create revision artifact metadata with id, path, and hash.

## Acceptance

- Natural-language edit requests are structured.
- Major non-target elements are included in must-keep.
- Revision artifact metadata is produced.
