# PRD: DF-082 Prompt Asset Versioning

## Problem

Core generation prompts are currently embedded across code paths or missing as explicit product assets. Without a manifest and versioned files, execution logs and final reports cannot explain which prompt package shaped a generated deck.

## Requirements

- Manage all core prompts as versioned files under `/prompts`.
- Expose a manifest with stable ids, stages, versions, file paths, and content hashes.
- Provide an API for recording prompt usage events with prompt version metadata.
- Include prompt version information in provider audit events.
- Include prompt version information in the final generation report.

## Out of Scope

- Runtime prompt loading from the filesystem in the browser.
- Real provider execution for every prompt stage.
- Prompt authoring UI.

## Acceptance

- All required prompt ids are present in the manifest and each points to an existing file.
- Prompt usage records include prompt id, version, hash, file path, and stage.
- Provider audit events can include prompt usage metadata.
- Generation reports include a prompt version section.
