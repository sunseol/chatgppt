# Live Source Capture Bundle

Date: 2026-06-18

Scope: DF-222 source capture evidence. This bundle also prepares DF-223 and DF-224 by preserving captured source files, extracted text files, metadata, and hashes that a live Research Pack can reference without relying on transient web state.

Capture result: partial local evidence

- HTML succeeded: 2
- PDF succeeded: 1
- Failed candidate preserved: 1
- Bundle path: `docs/live-source-capture-bundle/`

## Capture method

The captures were fetched with `curl -L -sS -D <headers> -o <original>` and then reduced to bounded text files for review evidence. The bundle keeps both the original file and the extracted text file so later recapture runs can compare raw and text hashes separately.

## Successful captures

| ID       | Type | Original URL                                                              | Final URL                                                                 | Fetched at           | Status | MIME type                   | Raw archive                                              | Raw bytes | Raw SHA-256                                                               | Text archive                                             | Text bytes | Text SHA-256                                                              |
| -------- | ---- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------- | ------ | --------------------------- | -------------------------------------------------------- | --------: | ------------------------------------------------------------------------- | -------------------------------------------------------- | ---------: | ------------------------------------------------------------------------- |
| html_001 | HTML | `https://www.w3.org/TR/WCAG22/`                                           | `https://www.w3.org/TR/WCAG22/`                                           | 2026-06-18T08:19:04Z | 200    | `text/html; charset=utf-8`  | `docs/live-source-capture-bundle/html_001/original.html` |    512457 | `sha256:6e3c5fe397257cae509a2fb4752b73062cf8cbeb92c2cec618989b17e4cf7057` | `docs/live-source-capture-bundle/html_001/extracted.txt` |      12003 | `sha256:4219ebacacecb20fd58d9da6cb4912e6127192959ba758b154b0402289c1bb50` |
| html_002 | HTML | `https://www.rfc-editor.org/rfc/rfc9110.html`                             | `https://www.rfc-editor.org/rfc/rfc9110.html`                             | 2026-06-18T08:19:37Z | 200    | `text/html`                 | `docs/live-source-capture-bundle/html_002/original.html` |   1187554 | `sha256:d431760660ea44e130f6e919dab216df2d0b3a490567a98089267523368fe1e5` | `docs/live-source-capture-bundle/html_002/extracted.txt` |      12584 | `sha256:1d0e219be542b2bfad0247e4ba0e4d4bb9f63c65b1105db65cae8aedc80cc1f9` |
| pdf_001  | PDF  | `https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf` | `https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf` | 2026-06-18T08:19:05Z | 200    | `application/pdf; qs=0.001` | `docs/live-source-capture-bundle/pdf_001/original.pdf`   |     13264 | `sha256:3df79d34abbca99308e79cb94461c1893582604d68329a41fd4bec1885e6adb4` | `docs/live-source-capture-bundle/pdf_001/extracted.txt`  |       8806 | `sha256:1c53da7902058391dddc950c60133f132ff9c7c33564b6229a152610b9680338` |

## Failed candidate

| ID              | Type | Original URL                                                          | Final URL                                                             | Fetched at           | Status | MIME type                  | Raw archive                                                     | Raw bytes | Raw SHA-256                                                               | Text archive                                                    | Text bytes | Text SHA-256                                                              | Failure class         |
| --------------- | ---- | --------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------- | ------ | -------------------------- | --------------------------------------------------------------- | --------: | ------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------: | ------------------------------------------------------------------------- | --------------------- |
| html_failed_001 | HTML | `https://www.ietf.org/archive/id/draft-iab-use-it-or-lose-it-05.html` | `https://www.ietf.org/archive/id/draft-iab-use-it-or-lose-it-05.html` | 2026-06-18T08:19:05Z | 404    | `text/html; charset=utf-8` | `docs/live-source-capture-bundle/html_failed_001/original.html` |     76853 | `sha256:d58437f787e34dda4f1ed2e2e62b2482769fcca9a02c85e9d85f8e605bee3d37` | `docs/live-source-capture-bundle/html_failed_001/extracted.txt` |       5452 | `sha256:fa6fd2f8f928e8734971fa98337d36f8e6a6145af0d0db65b12bd9818f6e6cf8` | `network` / not found |

The failed candidate is deliberately retained as non-success evidence. It is not a paywall or permission-denied case; current local failure classification maps 404 into the retryable network bucket, and the capture was corrected by replacing it with `html_002`.

## Recapture contract

`src/lib/research-source-capture-bundle.ts` now models successful captures with raw and extracted-text hashes, archive paths, and per-kind counts. It also exposes `compareResearchSourceCaptureVersions` so a later recapture can report `previousVersion`, `nextVersion`, raw hash changes, and extracted-text hash changes independently.

`validateResearchSourceCaptureBundle` blocks DF-222 evidence when a bundle has fewer than two HTML captures (`insufficient_html_captures`), no PDF capture (`missing_pdf_capture`), or missing URL/fetch/MIME/status/archive/text metadata (`missing_capture_metadata`).

## Recapture evidence

`html_001` was fetched again into `docs/live-source-capture-bundle/html_001_v2/`.

| Source   | Previous version | Next version | Fetched at           | Final URL                       | Status | MIME type                  | Raw archive                                                 | Raw SHA-256                                                               | Raw changed | Text archive                                                | Text SHA-256                                                              | Text changed |
| -------- | ---------------: | -----------: | -------------------- | ------------------------------- | ------ | -------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------- | ------------------------------------------------------------------------- | ------------ |
| html_001 |                1 |            2 | 2026-06-18T13:48:40Z | `https://www.w3.org/TR/WCAG22/` | 200    | `text/html; charset=utf-8` | `docs/live-source-capture-bundle/html_001_v2/original.html` | `sha256:6e3c5fe397257cae509a2fb4752b73062cf8cbeb92c2cec618989b17e4cf7057` | no          | `docs/live-source-capture-bundle/html_001_v2/extracted.txt` | `sha256:0d5abfbe2419f468f0656cd75ab0720dba75adda41bafbc50a3488a71c585c47` | yes          |

## App surface preservation

`ResearchPack.sources[].capture` now preserves the current source capture metadata through `parseResearchPack`, including `originalUrl`, `finalUrl`, `fetchedAt`, `mimeType`, `statusCode`, `contentHash`, raw/text archive paths, extracted text hash, and version. `ResearchPack.sources[].captureHistory` preserves recapture history through Research Pack parsing and approved Research Pack artifacts, and approved artifacts freeze that history so version/hash evidence cannot be mutated after approval. `SourceReviewList` displays the current persisted capture metadata directly from the Research Pack, so app-produced captures remain visible during Research review without a separate transient prop.

DF-222 is complete for the source-capture evidence scope: the bundle contains two successful HTML captures, one successful PDF capture, one retained failed candidate, and one recapture version/hash record. Production Research Pack consumption of this evidence remains tracked by DF-223 and DF-224.
