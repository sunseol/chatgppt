# Full-Slide Image Generation Harness Evidence — 2026-06-30

Path: `docs/full-slide-image-generation-harness-2026-06-30.md`

## Correction

The target DeckForge image-generation behavior is **not** “generate a photorealistic background and overlay text later.” The target is:

```text
image model generates the complete presentation slide image itself
```

That means the provider prompt and harness must classify the requested artifact as:

```text
output_kind = full_presentation_slide
```

not:

```text
output_kind = background_image
```

## Harness invariant

A valid image-generation request must include:

- slide title / key message
- intended audience and topic
- visual hierarchy
- chart/card/map/table layout intent
- design system / palette / motif
- page number or section identity
- explicit instruction: “complete finished 16:9 presentation slide image, not a background”

A valid artifact must be stored as a slide raster artifact and may later be used directly in PDF/PPTX export.

## Seoul Marathon sample run

Output root:

```text
/tmp/deckforge-seoul-marathon-full-slide-imagegen-260630
```

Files:

```text
/tmp/deckforge-seoul-marathon-full-slide-imagegen-260630/seoul-marathon-full-slide-imagegen.pdf
/tmp/deckforge-seoul-marathon-full-slide-imagegen-260630/contact-sheet-full-slide-imagegen.png
/tmp/deckforge-seoul-marathon-full-slide-imagegen-260630/run-summary.json
/tmp/deckforge-seoul-marathon-full-slide-imagegen-260630/full_slide_imagegen_01.png
/tmp/deckforge-seoul-marathon-full-slide-imagegen-260630/full_slide_imagegen_02.png
/tmp/deckforge-seoul-marathon-full-slide-imagegen-260630/full_slide_imagegen_03.png
/tmp/deckforge-seoul-marathon-full-slide-imagegen-260630/full_slide_imagegen_04.png
/tmp/deckforge-seoul-marathon-full-slide-imagegen-260630/full_slide_imagegen_05.png
```

Measured result:

- generated full-slide image count: `5`
- PDF path: `/tmp/deckforge-seoul-marathon-full-slide-imagegen-260630/seoul-marathon-full-slide-imagegen.pdf`
- PDF bytes: `1279391`
- PDF header: `%PDF-`
- PDF page objects: `5`
- normalized slide size: `1920x1080`
- all artifacts have `output_kind: full_presentation_slide`
- PDF SHA-256: `2045f41de720d0af9d00a0a5ab250f303349d4d059c65a69e7a4d32d7dce77a7`
- contact sheet SHA-256: `cf51bea8cf7ccb2c7b2d0cd2478b82c5f5139c28acac33d64c5d9232f95e3fe5`

## QA result

Vision QA confirmed:

- the output is not plain background photography;
- each image looks like a complete presentation slide;
- slide layouts include title regions, cards, metrics, route map, diagrams, icons, page numbers, and presentation hierarchy;
- issue: small Korean/body text is distorted or pseudo-text in several places.

## Implication

Correct status wording:

```text
프롬프트/하네스 기준은 full-slide image generation으로 수정해야 한다. 서울시 마라톤 샘플로 이미지 모델이 완성형 슬라이드 이미지 5장을 직접 생성했고, 그 이미지들만으로 PDF를 만들었다. 다만 세부 한글 텍스트 품질은 이미지 모델 한계로 아직 QA/편집 레이어 또는 텍스트 후처리 전략이 필요하다.
```

Incorrect status wording:

```text
배경 이미지를 만들고 HTML/PIL로 텍스트를 올렸으니 슬라이드 이미지 생성이 완료됐다.
```
