# PRD: DF-023 OpenAIImageProvider Fallback

## Problem

Codex login may not provide image generation. DeckForge needs an explicit fallback path using an OpenAI API key while keeping the credential out of project files and serializable frontend state.

## Scope

- Model an API-key fallback mode separately from Codex OAuth.
- Keep API keys as ephemeral session credentials.
- Provide a fallback client contract that sends authorization only to the image transport boundary.
- Provide serializable public state and product copy for UI display.

## Acceptance Criteria

- Fallback mode is explicitly distinguishable.
- API key is not stored in project file shaped state or serializable frontend state.
- Image generation permission and billing differences are available for UI display.

## Non-Goals

- Add a real network HTTP client.
- Persist API keys.
- Implement the provider capability matrix UI; that is DF-024.
