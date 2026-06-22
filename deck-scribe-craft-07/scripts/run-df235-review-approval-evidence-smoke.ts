import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { approveReviewStageRevisionWithEvidence } from "../src/components/deck/review-stage-regeneration-evidence";
import type { GeneratedSlide } from "../src/lib/deck-types";
import type { ImageArtifactStore, ImageArtifactStoreWrite } from "../src/lib/image-artifact-store";
import type { LiveSlideRegenerationCandidate } from "../src/lib/live-slide-regeneration";
import type { SlideRevisionComparison } from "../src/lib/slide-revision-generation";

const PROJECT_ID = "df235_live_regeneration_lineage_20260622";
const EVIDENCE_DIR = "docs/live-evidence/codex-image";
const SUMMARY_PATH = `${EVIDENCE_DIR}/df235-review-approval-evidence-20260622.json`;
const LINEAGE_SUMMARY_PATH =
  "docs/live-evidence/codex-image/df235-selected-slide-regeneration-lineage-20260622.json";
const ORIGINAL_ARTIFACT_ID = "df232_live_codex_batch_image_slide_003_v1";
const REGENERATED_ARTIFACT_ID = "df235_live_regeneration_lineage_20260622_image_slide_003_v2";
const REQUEST_ID = "rev_df235_lineage_20260622";

const originalSlide: GeneratedSlide = {
  number: 3,
  version: 1,
  status: "approved",
  imageDescriptor: "codex|16:9|slide_03_layout.png|slide_generation@v1",
  notes: "projects/df232_live_codex_batch/slides/images/slide_003.v1.png",
};
const regeneratedDescriptor = [
  "live-regeneration",
  `request=${REQUEST_ID}`,
  `background=${REGENERATED_ARTIFACT_ID}`,
  "deckContext=deckctx_fdba5853",
  "designSystem=design_df235_lineage",
].join("|");
const candidate: LiveSlideRegenerationCandidate = {
  requestId: REQUEST_ID,
  slide: {
    ...originalSlide,
    version: 2,
    status: "ready",
    imageDescriptor: regeneratedDescriptor,
    notes: "title text",
  },
  originalBackgroundArtifactId: ORIGINAL_ARTIFACT_ID,
  backgroundArtifactId: REGENERATED_ARTIFACT_ID,
  backgroundArtifactHash: "sha256:167127d22caf3a920d843e2a88e929bc37ca98f2f83f8b88b2e678805a64910a",
  deckContextId: "deckctx_fdba5853",
  designSystemId: "design_df235_lineage",
  mustKeep: [
    "main statistics",
    "source caption",
    "background style",
    "approved color palette",
    "global design style",
    "layout hierarchy",
  ],
  mustChange: ["title text"],
  beforeImageDescriptor: originalSlide.imageDescriptor,
  afterImageDescriptor: regeneratedDescriptor,
};
const comparison: SlideRevisionComparison = {
  slideNumber: 3,
  originalSlideVersion: 1,
  revisedSlideVersion: 2,
  beforeImageDescriptor: originalSlide.imageDescriptor,
  afterImageDescriptor: regeneratedDescriptor,
  requestedChanges: candidate.mustChange,
  preservedTargets: candidate.mustKeep,
  preservationChecks: candidate.mustKeep.map((target) => ({
    target,
    status: "kept",
    message: `${target} preserved by live regeneration request ${REQUEST_ID}.`,
  })),
  summary: `Slide 3 live regeneration ${REQUEST_ID} is ready for approval.`,
};

await mkdir(EVIDENCE_DIR, { recursive: true });
const store = new FileBackedArtifactStore();
const result = await approveReviewStageRevisionWithEvidence({
  projectId: PROJECT_ID,
  slides: [originalSlide],
  comparison,
  liveCandidate: candidate,
  store,
  now: () => 1_782_085_000_001,
});

if (result.reviewOutcome !== "approved") {
  throw new Error(`Expected approved review evidence, got ${String(result.reviewOutcome)}.`);
}
const approvedSlide = result.slides.find((slide) => slide.number === candidate.slide.number);
if (approvedSlide?.status !== "approved" || approvedSlide.version !== 2) {
  throw new Error("Expected regenerated candidate to become the approved slide.");
}
const reviewEvidencePath = result.reviewEvidencePath;
if (reviewEvidencePath === null) throw new Error("Expected review evidence path.");
const reviewEvidenceHash = await sha256File(reviewEvidencePath);
const lineageSummaryHash = await sha256File(LINEAGE_SUMMARY_PATH);

await writeJson(SUMMARY_PATH, {
  capturedAt: new Date().toISOString(),
  evidenceKind: "df235-review-approval-evidence-smoke",
  projectId: PROJECT_ID,
  productWriter: "approveReviewStageRevisionWithEvidence",
  lineageSummaryPath: LINEAGE_SUMMARY_PATH,
  lineageSummarySha256: lineageSummaryHash,
  reviewOutcome: result.reviewOutcome,
  reviewEvidencePath,
  reviewEvidenceSha256: reviewEvidenceHash,
  approvedSlide: {
    number: approvedSlide.number,
    version: approvedSlide.version,
    status: approvedSlide.status,
    imageDescriptor: approvedSlide.imageDescriptor,
  },
  candidate: {
    requestId: candidate.requestId,
    originalBackgroundArtifactId: candidate.originalBackgroundArtifactId,
    backgroundArtifactId: candidate.backgroundArtifactId,
    backgroundArtifactHash: candidate.backgroundArtifactHash,
  },
  writes: store.writes.map((write) => ({
    path: write.path,
    kind: typeof write.content === "string" ? "text" : "binary",
    bytes: contentBytes(write.content),
  })),
});

console.log(`${SUMMARY_PATH} ${await sha256File(SUMMARY_PATH)}`);

class FileBackedArtifactStore implements ImageArtifactStore {
  readonly writes: ImageArtifactStoreWrite[] = [];

  async write(entry: ImageArtifactStoreWrite): Promise<void> {
    this.writes.push(entry);
    await mkdir(dirname(entry.path), { recursive: true });
    await writeFile(entry.path, entry.content);
  }
}

function contentBytes(content: ImageArtifactStoreWrite["content"]): number {
  return typeof content === "string" ? Buffer.byteLength(content) : content.length;
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function sha256File(path: string): Promise<string> {
  return createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
}
