# DF-023A Image Auth Feasibility Note

## Decision

DF-092 should depend on `OpenAIImageProvider` using backend-held OpenAI API bearer credentials for MVP slide image generation.

Codex/ChatGPT OAuth remains the default auth path for Codex text/planning work, but it is explicitly excluded as the MVP image generation path unless a future Codex runtime capability confirms image generation support.

## Official Source Rationale

- OpenAI documents image generation through the OpenAI API Image API and Responses API: https://developers.openai.com/api/docs/guides/image-generation
- OpenAI API authentication accepts bearer credentials from API keys or short-lived workload identity federation tokens: https://developers.openai.com/api/reference/overview/
- The image generation create reference uses `Authorization: Bearer $OPENAI_API_KEY`: https://developers.openai.com/api/reference/resources/images/methods/generate/
- The developer quickstart starts API use by creating and exporting an API key: https://developers.openai.com/api/docs/quickstart
- GPT Image models may require API Organization Verification: https://developers.openai.com/api/docs/guides/image-generation

## Excluded Path

`CodexProvider` image generation via Codex/ChatGPT OAuth is not selected for MVP because current official OpenAI API docs establish API bearer credentials for image generation, while the product has not verified a Codex runtime image capability.

## Product Copy

Image generation may require a separate OpenAI API credential and may be billed to the API organization/project that owns that credential. This can differ from the user’s ChatGPT or Codex login. Some GPT Image models may require organization verification before use.

## Follow-up Work

- DF-023: implement secure API credential fallback without storing secrets in project files or renderer state.
- DF-092: call the concrete `OpenAIImageProvider` selected here.
- Security hardening: keep API credentials backend-only and redact logs using the existing redaction utility.
