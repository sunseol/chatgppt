# PRD: DF-024 Provider Capability Matrix UI

## Problem

Provider availability is currently implicit. Users need a clear setup surface showing which workflow features work with the current provider/auth state and how to unlock unavailable capabilities.

## Scope

- Build a provider capability matrix view model.
- Render text planning, research assist, image generation, and revision generation rows.
- Show available/locked state, reason, and remediation for locked features.
- Integrate the matrix into the new project setup surface.

## Acceptance Criteria

- Text planning, research assist, image generation, and revision generation availability are visible.
- Locked features show why they are locked.
- Locked features show a concrete remediation path.

## Non-Goals

- Real provider authentication flow.
- Provider settings persistence.
- New provider implementations.
