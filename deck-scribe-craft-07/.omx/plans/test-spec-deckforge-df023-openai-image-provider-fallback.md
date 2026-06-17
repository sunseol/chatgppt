# Test Spec: DF-023 OpenAIImageProvider Fallback

## Secret Storage Tests

- Given an API key, when fallback public state is serialized with project-shaped state, then the raw key is absent.
- Given a blank API key, when a session credential is created, then a typed credential error is thrown.

## Provider Contract Tests

- Given a fallback credential and transport, when the OpenAI image client generates an image, then authorization reaches only the transport request.
- Given fallback feasibility product copy, when public state is created, then connection, billing, and permission copy are available for UI display.

## Regression Tests

- Existing image provider feasibility tests still pass.
- Existing slide image provider contract tests still pass.
