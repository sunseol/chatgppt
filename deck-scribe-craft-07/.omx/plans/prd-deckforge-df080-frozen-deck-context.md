# PRD: DF-080 Frozen Deck Context

## Problem
Parallel slide generation needs a stable, approved deck-level contract. Without a frozen context id and hash, workers could accidentally consume different versions of the brief, research, plan, design system, or layout prototype.

## Scope
- Build a Frozen Deck Context from approved project artifacts.
- Include approved artifact ids and hashes.
- Include layout prototype id and DOM layer metadata.
- Produce a stable context hash and locked flag.
- Block context creation when required artifacts are missing or unapproved.

## Acceptance Criteria
- `deck_context_id`, approved artifact ids, hash, and locked flag are stored in the bundle.
- Every downstream generation package can reference the same `deck_context_id`.
- `layout_prototype_id` and DOM layer metadata are included.

## Non-Goals
- Slide-level context bundles.
- Parallel worker creation.
- Persistent artifact-store writes.
