# Live Compositor Review Contract

Date: 2026-06-18

Ticket: DF-234

Status: Partial, external evidence required

## Contract Summary

DF-234 requires the review gallery to show compositor output built from real generated backgrounds plus editable title, body, source, and chart overlays. The local contract now carries compositor metadata and stored background artifact references into review items so the gallery can render five compositor thumbnails, show the selected presentation preview, and block false Live evidence such as mock backgrounds, missing or malformed stored image artifacts, fake compositor preview PNGs, or generated image text colliding with editable overlays.

## Local Evidence

- `src/lib/final-slide-compositor.ts` now records `backgroundProviderId`, stored background artifact id/path/hash, editable `overlayRoles`, and overlay bounds in every `FinalSlideComposition`.
- `src/components/deck/review-gallery-model.ts` attaches compositor results to review items and validates Live review readiness.
- `validateReviewGalleryLiveCompositions` emits `mock_background_artifact` when a review item uses a mock background, `missing_stored_background_artifact` when the compositor result does not reference a stored PNG artifact, `invalid_stored_background_artifact_hash` when the stored artifact hash is not a full SHA-256 digest, `invalid_compositor_preview` when the compositor preview is not PNG-signature binary output, and `text_overlay_collision` when detected generated-image text overlaps editable overlay bounds.
- `src/components/deck/ReviewGalleryPanel.tsx` renders compositor thumbnails for each slide and a selected presentation preview from the compositor result, including the stored background artifact path on the rendered review surfaces.
- `src/components/deck/ReviewGallery.integration.test.tsx` covers five compositor thumbnails, selected presentation preview rendering, stored background artifact propagation, per-slide approval/regeneration, and the mock/missing-artifact/invalid-hash/fake-preview/collision blockers.

## Verification

- `bun test src/lib/final-slide-compositor.test.ts src/components/deck/ReviewGallery.integration.test.tsx`
- `bun run typecheck`
- `bun run lint`

## Remaining Live Work

The current repository still lacks live compositor screenshots from five real image artifacts. DF-234 remains open until a production run captures live compositor screenshots, verifies title edit and re-export against real backgrounds, and confirms the review gallery uses only stored live image artifacts.
