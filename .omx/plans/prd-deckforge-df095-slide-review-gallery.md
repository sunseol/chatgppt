# PRD: DF-095 Slide Review Gallery

## Problem

Users need to inspect generated slides before vectorization. The UI must support full approval, per-slide approval, selected slide regeneration, deletion/addition requests, and clear QA failure states.

## Requirements

- Build review gallery state from generated slides, slide specs, and QA status.
- Allow advancing only when every slide is approved and none has failed QA.
- Render controls for per-slide approval, selected regeneration, deletion request, and addition request.
- Show partial edit as disabled/experimental until DF-101.
- Clearly mark failed QA slides.

## Acceptance

- Failed QA slides block vectorization.
- Unapproved slides block vectorization.
- Review panel renders required actions.
- Partial edit control is visibly disabled.
