# Live Compositor Review Contract

Date: 2026-06-19

Ticket: DF-234

Status: Ready with Lane D live artifact bundle

## Contract Summary

DF-234 requires the review gallery to show compositor output built from real generated backgrounds plus editable title, body, source, and chart overlays. The local contract now carries compositor metadata and stored background artifact references into review items so the gallery can render five compositor thumbnails, show the selected presentation preview, accept the production Codex OAuth image provider as a live image background, and block false Live evidence such as duplicate or missing compositor slide entries, mock backgrounds, non-image live providers, reused stored background artifact ids, paths, or hashes, cross-slide stored background references, missing or malformed stored image artifacts, compositor SVG output that omits stored background artifact identity, stored background artifacts that target another slide, stored background artifact id/path version drift, artifacts outside versioned project image storage, missing or invalid editable overlay bounds, fake or reused compositor preview PNGs, missing, mismatched, synthetic, boundary-whitespace-padded, template, or compositor-background-detached title edit re-export evidence, or generated image text colliding with editable overlays.

## Local Evidence

- `src/lib/final-slide-compositor.ts` now records `backgroundProviderId`, stored background artifact id/path/hash, editable `overlayRoles`, and overlay bounds in every `FinalSlideComposition`, and rejects stored background artifact id/path/hash values unless they carry a full SHA-256 digest, target the same slide as the compositor background, use matching artifact id/path versions, and live under versioned project image storage.
- `src/components/deck/review-gallery-model.ts` attaches compositor results to review items and validates Live review readiness.
- `src/components/deck/review-gallery-compositor-svg.ts` checks that the compositor SVG background layer references the same stored background artifact id/path/hash as the composition metadata.
- `validateReviewGalleryLiveCompositions` emits `duplicate_compositor_slide` and `missing_compositor_slide` when five review entries hide duplicate/missing slide coverage, `mock_background_artifact` when a review item uses a mock background, accepts `codex` Codex OAuth image backgrounds as live image outputs, emits `background_provider_not_live_image` when a compositor background comes from a non-image live provider, `missing_stored_background_artifact` when the compositor result does not reference a stored PNG artifact, `invalid_stored_background_artifact_hash` when the stored artifact hash is not a full SHA-256 digest, `duplicate_stored_background_artifact` when review items reuse stored background artifact ids, paths, or hashes, `stored_background_artifact_slide_mismatch` when stored artifact id/path evidence targets another slide, `compositor_svg_artifact_mismatch` when the SVG omits the stored background artifact identity, `missing_editable_overlay` when a required `title`, `body`, `chart`, or `source` overlay lacks compositor bounds, `invalid_editable_overlay_bounds` when required overlay bounds are empty, non-finite, or outside the compositor canvas, `invalid_compositor_preview` when the compositor preview is not PNG-signature binary output, `duplicate_compositor_preview` when distinct review items reuse one preview PNG, `missing_title_edit_reexport_evidence` when otherwise valid Live review lacks title edit re-export evidence, `title_edit_reexport_mismatch` when exported SVG evidence does not contain the edited title for the reviewed slide, points at a synthetic, boundary-whitespace-padded, or template export path, or omits the reviewed compositor's export basis and stored background artifact id/path/hash, and `text_overlay_collision` when detected generated-image text overlaps editable overlay bounds.
- `src/components/deck/ReviewGalleryPanel.tsx` renders compositor thumbnails for each slide and a selected presentation preview from the compositor result, including the stored background artifact path on the rendered review surfaces.
- `src/lib/final-slide-compositor.test.ts` covers stored background artifact propagation plus malformed-hash and cross-slide artifact rejection. `src/lib/final-slide-compositor-storage-path.test.ts` covers stored background refs outside versioned project image storage and artifact id/path version drift. `src/components/deck/review-gallery-model.test.ts` covers required editable overlay bounds, compositor SVG artifact identity, Codex OAuth image provider acceptance, duplicate/missing slide coverage, and reused stored background artifact hashes. `src/components/deck/review-gallery-overlay-bounds.test.ts` covers empty or out-of-canvas required overlay bounds. `src/components/deck/review-gallery-preview-validation.test.ts` covers reused compositor preview PNGs across distinct review items. `src/components/deck/review-gallery-title-edit-export.test.ts` covers missing, mismatched, synthetic/template, boundary-whitespace-padded, compositor-background-detached, and valid title edit re-export evidence. `src/components/deck/ReviewGallery.integration.test.tsx` covers five compositor thumbnails, selected presentation preview rendering, stored background artifact propagation, per-slide approval/regeneration, and the mock/missing-artifact/invalid-hash/fake-preview/collision blockers.

## Verification

- `bun test src/lib/final-slide-compositor-storage-path.test.ts src/lib/final-slide-compositor.test.ts src/components/deck/review-gallery-model.test.ts src/components/deck/review-gallery-overlay-bounds.test.ts src/components/deck/review-gallery-preview-validation.test.ts src/components/deck/review-gallery-title-edit-export.test.ts src/components/deck/ReviewGallery.integration.test.tsx`
- `bun run typecheck`
- `bun run lint`

## Live Evidence Update

2026-06-21 KST Lane B produced the five real stored Codex background artifacts required to drive the compositor/review gallery:

- Batch evidence: `docs/live-evidence/codex-image/df232-five-background-protocol-summary.json`
- Stored live backgrounds: `projects/df232_live_codex_batch/slides/images/slide_001.v1.png` through `slide_005.v1.png`
- Sidecars: matching `.metadata.json` and `.provenance.json` files beside every PNG
- Provider/auth: `codex` / `codex_session`
- Fixture flag: `false`

## Lane D App-Surface Evidence

2026-06-21 KST Lane D packaged the five real Codex OAuth backgrounds into a review-gallery/compositor artifact bundle:

- Manifest: `docs/live-evidence/codex-image/lane-d-live-app-surface-20260621/manifest.json`
- Manifest hash: `sha256:caa4036a28a40886a953a1b547059fd1073cabe35e67f73dc56418b02c02676f`
- Review gallery artifact: `docs/live-evidence/codex-image/lane-d-live-app-surface-20260621/review-gallery.html`
- Review gallery hash: `sha256:0e4ae0e0f3d58def76caebf2529d900bc54c2260f34e9d6a34f5ce9abe15e6d3`
- Compositor SVGs: `review-compositor-slide-001.svg` through `review-compositor-slide-005.svg` in the same bundle directory
- Title edit/re-export: `projects/df232_live_codex_batch/exports/svg/slide_01.svg`
- Title edit/re-export hash: `sha256:84b87892be4e9348c1402e348f99f9a77dfecc3ff64e1769196dca2ef8f03bef`

The bundle uses the stored live backgrounds `projects/df232_live_codex_batch/slides/images/slide_001.v1.png` through `slide_005.v1.png`, preserves each `df232_live_codex_batch_image_slide_###_v1` artifact id, embeds the recorded SHA-256 binary hash in the compositor SVG background layer, includes editable title/body/chart/source overlays, and includes approve/regenerate controls on each review card.
