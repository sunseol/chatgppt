# PRD: DF-090 Slide Generation Queue

## Problem

Slide image generation must run faster than a purely sequential flow, but parallel workers must not reinterpret the deck independently. Each job needs the same frozen deck context and a visible job lifecycle for progress, failure, and retry.

## Requirements

- Build a bounded parallel queue from slide context bundles.
- Block the queue when bundles disagree on Deck Context, Design System hash, or HTML Layout Prototype id.
- Track one provider job per slide image task.
- Report aggregate progress as jobs finish.
- Preserve successful outputs when another slide fails.
- Return retryable failure descriptors with user-facing error text.

## Out of Scope

- Actual image provider implementation.
- Visual QA after generated images.
- UI gallery changes.

## Acceptance

- Queue can run more than one slide concurrently with a configured concurrency cap.
- Worker inputs reference the same Deck Context, Design System, and HTML Layout Prototype.
- Partial failures do not discard successful slide outputs.
- Failures expose job id, slide number, error message, and retry availability.
