# Test Spec: DF-082 Prompt Asset Versioning

## Automated Tests

- Prompt manifest test:
  - required core prompt ids are present exactly once
  - versions use the `vN` format
  - each manifest file exists under `/prompts`
  - manifest hashes match file content
- Prompt usage test:
  - usage records include prompt id, version, hash, file path, stage, and job/artifact links
- Provider audit test:
  - completed job audit events include prompt version metadata when supplied
- Report test:
  - generation report includes the prompt version section and specific prompt version rows

## Manual Verification

- Run lint/typecheck/test/build via `bun run verify`.
