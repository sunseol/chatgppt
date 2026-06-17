# Test Spec: DF-092 Image Provider Call

## Automated Tests

- Provider mock image generation test:
  - returns a PNG data URL
  - records 16:9 dimensions
  - records layout screenshot as composition reference
  - creates a `GeneratedSlide` bridge object
- Provider request test:
  - OpenAI-style provider passes `gpt-image-2`, aspect ratio, prompt text, and layout reference to the injected client
- Provider error handling test:
  - provider/client failures return retryable failure metadata

## Manual Verification

- Run `bun run verify`.
