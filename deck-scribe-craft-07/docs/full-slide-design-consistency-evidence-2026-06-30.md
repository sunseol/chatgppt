# Full-slide image generation design consistency evidence — 2026-06-30

## Scope

User correction: each generated presentation slide should not only be a complete full-slide raster, but also share a coherent design system across the series.

This run regenerates the Seoul Marathon sample with a single repeated master visual system.

## Target behavior

- `output_kind = full_presentation_slide`
- The image model generates the complete slide raster itself.
- No background-only generation.
- No post-rendered Korean text overlay.
- Slides should share a consistent palette, layout rhythm, card style, header/numbering system, route-line motif, and icon language.

## Shared visual system used

- Background: warm ivory `#F8F4EC`
- Text: deep charcoal `#1F252A`
- Accent 1: Seoul coral red `#E84D5B`
- Accent 2: Han River blue `#2D7DD2`
- Accent 3: pale mint `#BFE7D6`
- Components: rounded white cards, thin charcoal line icons, soft shadows
- Repeating motif: coral marathon route line with blue river accent
- Header: `SEOUL MARATHON 2026` + slide number
- Text policy: large sparse Korean titles/labels only; avoid small body copy

## Output

```text
/tmp/deckforge-seoul-marathon-full-slide-consistent-v2-260630
```

Key files:

```text
/tmp/deckforge-seoul-marathon-full-slide-consistent-v2-260630/seoul-marathon-full-slide-consistent-v2.pdf
/tmp/deckforge-seoul-marathon-full-slide-consistent-v2-260630/contact-sheet-consistent-full-slide-v2.png
/tmp/deckforge-seoul-marathon-full-slide-consistent-v2-260630/run-summary.json
```

## Mechanical verification

```text
ok True
mode image model generated complete full-slide rasters; PDF assembled from generated slide images only; no post-rendered text overlay
generated_full_slide_count 5
pdf_exists True
pdf_bytes 773180
pdf_header b'%PDF-'
pdf_page_objects 5
consistent_full_slide_01.png (1920, 1080) 1634059 full_presentation_slide
consistent_full_slide_02.png (1920, 1080) 1522691 full_presentation_slide
consistent_full_slide_03.png (1920, 1080) 1456413 full_presentation_slide
consistent_full_slide_04.png (1920, 1080) 1436527 full_presentation_slide
consistent_full_slide_05.png (1920, 1080) 1484250 full_presentation_slide
contact_sheet True 1253866
pdf_sha256 7c560ae3c9cf4a4a05fe79db69240b0fbf45fac5d5e7271ba1c49c7770a88d70
contact_sha256 bfb729dcb13fb6101546d55b8f15ecf255ed27fbfaaca29616663c7b4a382752
```

## Vision QA summary

The five slides now read as a coherent series more than the prior sample:

- Warm ivory background is consistent.
- Coral/blue/mint civic marathon palette is repeated.
- Route-line motif appears across the deck.
- Rounded cards and line icons are repeated.
- The slides are complete presentation slide images, not background photos.

Remaining issues:

1. Header/footer system is not perfectly fixed across all slides.
   - Logo form, brand label position, slide number, footer line/text vary by slide.
2. Card component rules still drift.
   - Radius, shadow, icon size, label placement, and padding differ between slides.
3. Slide 04 is information-dense.
   - Dashboard microtext and small labels reduce readability.
4. Icon family is related but not identical.
   - Silhouette, line icons, dashboard icons, and filled badges are mixed.
5. Korean small text remains risky.
   - Large titles are mostly readable; small labels/footers/dashboard text are not reliable.

## Product implication

Design consistency is now a first-class acceptance criterion for the full-slide image generation harness. A stronger next iteration should encode the design system as structured prompt fields and add a QA gate for:

- same palette
- same header/footer
- same card component rules
- same motif
- maximum text density
- minimum readable Korean text size
- per-slide deviation scoring

This does not change the release gap: packaged app, clean-machine real-provider evidence, PowerPoint round-trip, notarization/Gatekeeper, non-developer UAT, and final sign-off remain separate acceptance items.
