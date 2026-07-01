# DeckForge App Agent Instructions

This app inherits the workspace evidence-first contract.

Before implementation, bugfix, test, visual QA, packaging, or release work in this directory, read:

- `../docs/ai_worker_operating_contract.md`
- `../docs/project_status_briefing_2026-06-24.md`
- `docs/live-readiness-audit.md` for live workflow work
- `docs/live-release-decision.md` for release work
- `docs/result-testing-handoff.md` for PPT/Deck visual result testing and human visual feedback loops

## App-Specific Guardrails

- Do not mark production/live work complete from markdown reports alone.
- Do not count mock-provider, fixture, cached search, or development-stage artifacts as production evidence.
- Development workflow and production workflow must not be conflated.
- If a production task changes only docs, label it specification-only and do not claim product readiness.
- If visual output changes, deterministic geometry/text/asset/render/regression gates must pass before AI visual review is considered.
- New or changed visual baselines require human approval.
- Public release claims require package hash, tested artifact hash, exact source identity, and clean-machine or independent validation evidence.

## Expected Verification Surfaces

Use the narrowest command that proves the acceptance criterion, then run relevant regressions.

Common local gates:

```text
bun run typecheck
bun test
bun run lint
bun run build
bun run rust:fmt
bun run rust:test
bun run rust:clippy
```

Release and packaged-app claims may also require:

```text
bun run qa:frontend
bun run qa:package
bun run tauri:build
```

Do not imply these were run unless they actually were.

## Result Testing / Human Visual Feedback Contract

When the user asks for `결과 테스트`, `시각 결과 테스트`, or feedback-driven PPT/Deck iteration:

- Show the human tester visual artifacts only first: contact sheet, slide PNGs, rendered PDF/PPTX.
- Do not require the user to inspect manifest, prompts, provider logs, raw images, or source code.
- Record user comments as visual symptoms under `09_qa/`.
- Diagnose by cross-checking the visual output with artifact logs and source metadata.
- Keep the target label `system_consistent_varied`: same design system, controlled variation, role-specific slide personality, not identical templates.
- Preserve provenance labels: rendered previews are not image generation; only claim image generation when full-slide provider artifacts and metadata exist.
