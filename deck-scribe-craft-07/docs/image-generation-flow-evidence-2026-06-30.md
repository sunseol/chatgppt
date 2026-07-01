# Image Generation Flow Evidence — 2026-06-30

Path: `docs/image-generation-flow-evidence-2026-06-30.md`

Timestamp: 2026-06-30 21:56:16 KST

## Decision scope

This evidence updates the local functional status for the DeckForge image generation flow. It proves the orchestrated image-generation path with an injected provider and real artifact persistence semantics. It does **not** prove packaged-app live provider acceptance, clean-machine validation, Developer ID notarization, or PowerPoint round-trip.

## Functional result

Status: **local functional pass**

Completed flow:

1. Approved deck context is frozen.
2. Five slide prompt packages are built from approved context and layout references.
3. A provider interface is invoked for five slide backgrounds.
4. Five PNG image artifacts are stored with request metadata and SHA-256 hashes.
5. One selected slide is regenerated as a new background artifact version.
6. The regenerated artifact is applied to project slide state.
7. DeckForge export package and PPTX are generated from the patched project.
8. PNG/PPTX outputs are structurally verified.

## Code added

- `src/lib/production-image-generation-flow.ts`
  - `runProductionImageGenerationFlow`
  - `runProductionSlideRegenerationFlow`
- `src/lib/production-image-generation-flow.test.ts`
  - initial five-image generation test
  - one-slide regeneration/new-version test

## Evidence artifacts

Output root:

```text
/tmp/deckforge-seoul-marathon-image-flow-260630
```

Key files:

```text
/tmp/deckforge-seoul-marathon-image-flow-260630/seoul-marathon-image-flow-summary.json
/tmp/deckforge-seoul-marathon-image-flow-260630/seoul-marathon-image-flow-project.json
/tmp/deckforge-seoul-marathon-image-flow-260630/seoul-marathon-image-flow.pptx
/tmp/deckforge-seoul-marathon-image-flow-260630/generated-image-artifact-contact-sheet.png
/tmp/deckforge-seoul-marathon-image-flow-260630/slide_01.png
/tmp/deckforge-seoul-marathon-image-flow-260630/slide_02.png
/tmp/deckforge-seoul-marathon-image-flow-260630/slide_03.png
/tmp/deckforge-seoul-marathon-image-flow-260630/slide_04.png
/tmp/deckforge-seoul-marathon-image-flow-260630/slide_05.png
```

Generated image artifact paths:

```text
projects/seoul_marathon_image_flow_260630/slides/images/slide_001.v1.png
projects/seoul_marathon_image_flow_260630/slides/images/slide_002.v1.png
projects/seoul_marathon_image_flow_260630/slides/images/slide_003.v1.png
projects/seoul_marathon_image_flow_260630/slides/images/slide_004.v1.png
projects/seoul_marathon_image_flow_260630/slides/images/slide_005.v1.png
projects/seoul_marathon_image_flow_260630/slides/images/slide_003.v2.png
```

## Measured output

From `seoul-marathon-image-flow-summary.json`:

- `ok`: `true`
- provider mode: `injected-openaiImage-client`
- live API key present: `false`
- initial image artifact count: `5`
- regeneration request id: `rev_slide_003_dynamic_city_run`
- original artifact: `seoul_marathon_image_flow_260630_image_slide_003_v1`
- regenerated artifact: `seoul_marathon_image_flow_260630_image_slide_003_v2`
- provider request count: `6`
- export package PNG count: `5`
- export package SVG count: `5`
- export package Hybrid SVG count: `5`
- PPTX export kind: `ready`
- export secret scan: `passed`

File verification:

- project JSON exists: `422125` bytes
- summary JSON exists: `5666` bytes
- PPTX exists: `20551` bytes
- slide preview PNGs exist: five files, `57758` bytes each
- generated image artifact PNG count: `6`
- each generated image artifact PNG: `5761403` bytes
- PPTX zip entries: `19`
- PPTX slide XML count: `5`
- PPTX `[Content_Types].xml`: present

Vision check:

- `generated-image-artifact-contact-sheet.png` shows `slide 1 v1`, `slide 2 v1`, `slide 3 v1`, `slide 4 v1`, `slide 5 v1`, and `slide 3 v2 regen` as distinct entries.

## Quality gates run

```text
bun test src/lib/production-image-generation-flow.test.ts
```

Result:

```text
2 pass, 0 fail
```

```text
bun test src/lib/live-image-provider-adapter.test.ts src/lib/live-background-batch.test.ts src/lib/live-slide-regeneration.test.ts src/lib/project-export.test.ts src/lib/pptx-project-export.test.ts src/lib/production-image-generation-flow.test.ts
```

Result:

```text
exit 0
```

```text
bun test
```

Result:

```text
723 pass, 0 fail
```

```text
bun run typecheck
```

Result:

```text
exit 0
```

```text
bun run build
```

Result:

```text
exit 0
```

## Release blocker update

The previous blocker “image generation flow not implemented/tested” is no longer accurate for the local functional path. Replace it with the narrower release-acceptance blocker below:

- Remaining blocker: no packaged-app, clean-machine, real external AI image provider run has produced the five live image artifacts + one regeneration + export bundle.
- Remaining blocker: live provider credential and billing/API-key disclosure evidence is not recorded for this flow.
- Remaining blocker: PowerPoint open/edit/save/reopen round-trip is still not recorded for this generated PPTX.
- Remaining blocker: notarization/Gatekeeper/non-developer UAT/final sign-off remain separate release acceptance gates.

## Status wording to use

Correct:

```text
이미지 생성 플로우의 로컬 기능 구현과 주입형 provider E2E 테스트는 통과했다. 서울시 마라톤 fixture로 5개 이미지 artifact와 1개 regeneration artifact, PNG/PPTX export까지 재생성·검증했다. 실제 외부 이미지 API 호출과 packaged release acceptance는 아직 별도 미검증이다.
```

Incorrect:

```text
이미지 생성 플로우가 아예 미구현이다.
```

Incorrect:

```text
실제 외부 이미지 API와 packaged 앱 릴리즈까지 검증됐다.
```
