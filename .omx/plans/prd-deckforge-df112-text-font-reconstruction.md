# PRD: DF-112 Text And Font Reconstruction

## Problem

Editable overlays exist, but text layers do not yet expose a deterministic reconstruction contract for font candidates, role-aware sizing, editability scoring, and Korean text integrity.

## Requirements

- Convert MVP editable text layers into reconstructed text layers.
- Assign role-aware font family, size range, and line-height candidates.
- Score title and body editability rates against the P0 target.
- Flag broken Korean text instead of silently accepting it.

## Acceptance

- Title text editability target is at least 95%.
- Body text editability target is at least 85%.
- Korean text corruption count is zero for valid generated layers.
- Font candidates use local fallback stacks and do not require bundled font files.
