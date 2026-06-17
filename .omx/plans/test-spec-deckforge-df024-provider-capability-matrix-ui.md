# Test Spec: DF-024 Provider Capability Matrix UI

## View Model Tests

- Given a connected provider with deck planning and research only, when the matrix is built, then text planning and research are available while image and revision generation are locked.
- Given an OpenAI image fallback with missing credential, when the matrix is built, then image generation shows API-key remediation.

## UI Tests

- Given a mixed capability matrix, when rendered, then all four required features are visible.
- Locked rows render both the reason and the action path.
- Available rows render a clear available state.
