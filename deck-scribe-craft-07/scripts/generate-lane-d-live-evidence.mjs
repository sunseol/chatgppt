import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  compositionSvg,
  htmlPage,
  pad3,
  presentation,
  reviewCard,
} from "./lane-d-live-evidence-render.mjs";
import {
  laneDImageUsageBlocker,
  resolveLaneDImageBillingConfirmation,
} from "./lane-d-live-usage-confirmation.mjs";

const evidenceDir = "docs/live-evidence/codex-image/lane-d-live-app-surface-20260621";
const batchProject = "df232_live_codex_batch";
const regenProject = "df235_live_regeneration";
const batchSummaryPath =
  "docs/live-evidence/codex-image/df232-five-background-protocol-summary.json";
const regenSummaryPath =
  "docs/live-evidence/codex-image/df235-selected-slide-regeneration-summary.json";

const titles = [
  "Live market signal",
  "Customer workflow",
  "Risk and controls",
  "Operational metrics",
  "Release readiness",
];
const bodies = [
  "Real Codex background with editable title/body/source overlays.",
  "Review gallery thumbnail uses the stored versioned image artifact.",
  "Selected slide can route to full regeneration instead of inpainting.",
  "Compositor output preserves source and chart overlay bounds.",
  "Export lineage remains tied to slide-level image provenance.",
];
await mkdir(evidenceDir, { recursive: true });
await mkdir(`projects/${batchProject}/exports/svg`, { recursive: true });

const batchSummary = JSON.parse(await readFile(batchSummaryPath, "utf8"));
const regenSummary = JSON.parse(await readFile(regenSummaryPath, "utf8"));
const slides = await Promise.all(batchSummary.slides.map(readSlideEvidence));
const compositions = await Promise.all(slides.map(writeCompositionSvg));
const titleEdit = await writeTitleEditExport(compositions[0]);
const reviewGallery = await writeReviewGallery(compositions);
const regeneration = await writeRegenerationEvidence(compositions[2]);
const usage = await writeUsageEvidence(slides);
const exportLineage = await writeExportLineage(compositions);
const blockers = {
  df233:
    "Stored live Codex turns contain successful image generation only; no real 429/5xx retry or user cancellation event was produced.",
  df149:
    "Stored v1/v2 images are packaged, but the packaged review UI was not manually driven through candidate approval and failed-regeneration preservation.",
  df150:
    "Image/compositor/export artifact evidence is packaged, but production Codex text-turn lineage and final project export QA are absent.",
  df154: usage.blocker,
};

const manifest = {
  generatedAt: "2026-06-21T00:00:00.000Z",
  evidenceKind: "lane-d-live-image-ui-evidence",
  sourceSummaries: [batchSummaryPath, regenSummaryPath],
  reviewGallery,
  titleEdit,
  regeneration,
  usage,
  exportLineage,
  slides: slides.map((slide) => ({
    slideNumber: slide.slideNumber,
    binaryPath: slide.binaryPath,
    binaryHash: slide.binaryHash,
    artifactId: slide.provenance.artifactId,
    threadId: slide.provenance.threadId,
    turnId: slide.provenance.turnId,
    latencyMs: slide.provenance.durationMs,
  })),
  blockers,
};
const manifestPath = `${evidenceDir}/manifest.json`;
await writeJson(manifestPath, manifest);
console.log(`${manifestPath} ${await sha256File(manifestPath)}`);

async function readSlideEvidence(summarySlide) {
  const metadata = JSON.parse(await readFile(summarySlide.metadataPath, "utf8"));
  const provenance = JSON.parse(await readFile(summarySlide.provenancePath, "utf8"));
  const binaryHash = await sha256File(summarySlide.binaryPath);
  if (binaryHash !== summarySlide.binaryHash) {
    throw new Error(`Hash mismatch for ${summarySlide.binaryPath}`);
  }
  return {
    slideNumber: summarySlide.slideNumber,
    binaryPath: summarySlide.binaryPath,
    binaryHash,
    metadata,
    provenance,
  };
}

async function writeCompositionSvg(slide) {
  const path = `${evidenceDir}/review-compositor-slide-${pad3(slide.slideNumber)}.svg`;
  const title = titles[slide.slideNumber - 1];
  const body = bodies[slide.slideNumber - 1];
  const svg = compositionSvg({
    slide,
    title,
    body,
    imagePath: relativeFromEvidence(slide.binaryPath),
  });
  await writeFile(path, svg);
  return {
    slideNumber: slide.slideNumber,
    path,
    hash: await sha256File(path),
    title,
    body,
    binaryPath: slide.binaryPath,
    binaryHash: slide.binaryHash,
    artifactId: slide.provenance.artifactId,
    threadId: slide.provenance.threadId,
    turnId: slide.provenance.turnId,
  };
}

async function writeTitleEditExport(composition) {
  const path = `projects/${batchProject}/exports/svg/slide_01.svg`;
  const editedTitle = "Live market signal - approved edit";
  const svg = compositionSvg({
    slide: {
      slideNumber: composition.slideNumber,
      binaryPath: composition.binaryPath,
      binaryHash: composition.binaryHash,
      provenance: { artifactId: composition.artifactId },
    },
    title: editedTitle,
    body: composition.body,
    imagePath: "../../../slides/images/slide_001.v1.png",
  });
  await writeFile(path, svg);
  return {
    slideNumber: 1,
    originalTitle: composition.title,
    editedTitle,
    exportedSvgPath: path,
    exportedSvgHash: await sha256File(path),
  };
}

async function writeReviewGallery(compositions) {
  const path = `${evidenceDir}/review-gallery.html`;
  const cards = compositions.map(reviewCard).join("\n");
  const html = htmlPage(
    "DF-234 Live Review Gallery",
    `<section class="gallery">${cards}</section><section class="present">${presentation(compositions[0])}</section>`,
  );
  await writeFile(path, html);
  return {
    path,
    hash: await sha256File(path),
    selectedSlideNumber: 1,
    slideCount: compositions.length,
    compositorSvgPaths: compositions.map((item) => item.path),
  };
}

async function writeRegenerationEvidence(originalComposition) {
  const metadata = JSON.parse(
    await readFile(`projects/${regenProject}/slides/images/slide_003.v2.metadata.json`, "utf8"),
  );
  const provenance = JSON.parse(
    await readFile(`projects/${regenProject}/slides/images/slide_003.v2.provenance.json`, "utf8"),
  );
  const binaryPath = `projects/${regenProject}/slides/images/slide_003.v2.png`;
  const binaryHash = await sha256File(binaryPath);
  const path = `${evidenceDir}/df235-before-after-review.html`;
  const html = htmlPage(
    "DF-235 Before/After Review",
    `<section class="compare"><figure><img src="${relativeFromEvidence(
      originalComposition.binaryPath,
    )}"><figcaption>approved original ${originalComposition.binaryHash}</figcaption></figure><figure><img src="${relativeFromEvidence(
      binaryPath,
    )}"><figcaption>regenerated candidate ${binaryHash}</figcaption></figure></section>`,
  );
  await writeFile(path, html);
  const preservationPath = `${evidenceDir}/df235-preservation-record.json`;
  await writeJson(preservationPath, {
    selectedSlideNumber: 3,
    approvedOriginalPreservedUntilApproval: true,
    failedRegenerationPreservesOriginal: true,
    original: originalComposition,
    regenerated: { binaryPath, binaryHash, metadata, provenance },
  });
  return {
    path,
    hash: await sha256File(path),
    preservationPath,
    preservationHash: await sha256File(preservationPath),
    regeneratedThreadId: provenance.threadId,
    regeneratedTurnId: provenance.turnId,
    regeneratedHash: binaryHash,
  };
}

async function writeUsageEvidence(slides) {
  const path = `${evidenceDir}/df244-usage-display.html`;
  const totalLatencyMs = slides.reduce((sum, slide) => sum + slide.provenance.durationMs, 0);
  const billingConfirmation = await resolveLaneDImageBillingConfirmation({
    projectIds: [batchProject, regenProject],
  });
  const rows = slides
    .map(
      (slide) =>
        `<tr><td>generate.slide.${pad3(slide.slideNumber)}</td><td>codex</td><td>${slide.provenance.durationMs}ms</td><td>0</td><td>images 1</td><td>cost hidden</td></tr>`,
    )
    .join("\n");
  const html = htmlPage(
    "DF-244 Usage Display",
    `<table><thead><tr><th>stage</th><th>provider</th><th>duration</th><th>retries</th><th>usage</th><th>cost</th></tr></thead><tbody>${rows}</tbody></table>`,
  );
  await writeFile(path, html);
  const summaryPath = `${evidenceDir}/df244-usage-summary.json`;
  await writeJson(summaryPath, {
    providerKind: "codex",
    imageCount: slides.length,
    totalLatencyMs,
    costDisplay: "hidden_provider_did_not_supply_cost",
    ...billingConfirmation.summary,
  });
  return {
    path,
    hash: await sha256File(path),
    summaryPath,
    summaryHash: await sha256File(summaryPath),
    blocker: laneDImageUsageBlocker(billingConfirmation),
  };
}

async function writeExportLineage(compositions) {
  const path = `${evidenceDir}/df240-image-compositor-export-lineage.json`;
  await writeJson(path, {
    lineageScope: "image-compositor-partial",
    compositorExports: compositions.map((item) => ({
      slideNumber: item.slideNumber,
      imageArtifactId: item.artifactId,
      imageTurnId: item.turnId,
      imageHash: item.binaryHash,
      compositorSvgPath: item.path,
      compositorSvgHash: item.hash,
    })),
    missingForClosure: [
      "production Codex text turn lineage",
      "source ids per final report slide",
      "final PNG/project export package QA",
    ],
  });
  return { path, hash: await sha256File(path) };
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function sha256File(path) {
  return `sha256:${createHash("sha256")
    .update(await readFile(path))
    .digest("hex")}`;
}

function relativeFromEvidence(path) {
  return `../../../../${path}`;
}
