# PRD: DF-092 Image Provider Call

## Problem

Slide image generation must call a concrete image provider using the approved prompt package and layout screenshot reference. The app also needs deterministic mock generation for tests and a safe error surface for retry.

## Requirements

- Define a slide image provider interface.
- Implement a deterministic mock slide image provider.
- Implement an OpenAI-style provider adapter with an injected client.
- Preserve 16:9 and 4:3 aspect ratio metadata.
- Pass the HTML layout screenshot as a composition reference.
- Convert provider errors into retryable failure results.

## Out of Scope

- Storing API keys.
- Real network SDK wiring.
- Image QA and final compositing.

## Acceptance

- Mock provider generates a slide image artifact for 16:9 and 4:3 requests.
- Provider requests include prompt package text, target model, aspect ratio, and layout reference.
- Failure results include slide number, provider id, retryable flag, and user-facing message.
