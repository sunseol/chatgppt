import { mkdir } from "node:fs/promises";
import { runReviewStageSlideRegeneration } from "../src/components/deck/review-stage-regeneration";
import { createBrowserImageArtifactStore } from "../src/lib/browser-image-artifact-store";
import type { DeckProject, GeneratedSlide } from "../src/lib/deck-types";
import type { ImagePathDecisionRecord } from "../src/lib/image-path-decision";
import {
  FileBackedArtifactStore,
  MemoryStorage,
  approvedProject,
  clock,
  contentBytes,
  sha256File,
  writeJson,
} from "./live-codex-generate-export-smoke-support";

const PROJECT_ID = "df235_failure_preservation_smoke_20260622";
const EVENT_ID = "rev_df235_failure_preservation_20260622";
const EVIDENCE_DIR = "docs/live-evidence/codex-image";
const SUMMARY_PATH = `${EVIDENCE_DIR}/df235-review-failure-preservation-20260622.json`;
const IMAGE_PATH = `projects/${PROJECT_ID}/slides/images/slide_001.v1.png`;
const METADATA_PATH = `projects/${PROJECT_ID}/slides/images/slide_001.v1.metadata.json`;
const PROVENANCE_PATH = `projects/${PROJECT_ID}/slides/images/slide_001.v1.provenance.json`;
const INSTRUCTION = "오른쪽 차트를 더 크게 만들어줘.";
const CAPTURED_AT = "2026-06-21T23:50:16.721Z";

const startedAt = Date.parse(CAPTURED_AT);
await mkdir(EVIDENCE_DIR, { recursive: true });

const storage = new MemoryStorage();
await writeOriginalCodexEvidence(storage);
const store = new FileBackedArtifactStore();
const project = reviewProject(startedAt);
const originalSlides = project.slides ?? [];
const result = await runReviewStageSlideRegeneration({
  project,
  slides: originalSlides,
  selected: 1,
  instruction: INSTRUCTION,
  storage,
  store,
  client: {
    async generate() {
      throw new Error("provider returned 503 from DF-235 product smoke");
    },
  },
  now: clock(startedAt),
  createId: () => EVENT_ID,
});

const preservedSlide = result.slides.find((slide) => slide.number === 1);
if (result.reviewEvidencePath === null) {
  throw new Error("Expected DF-235 preserved_after_failure evidence path.");
}
if (preservedSlide?.status !== "approved" || preservedSlide.version !== 1) {
  throw new Error("Expected failed regeneration to preserve the approved original slide.");
}
if (result.comparison !== null || result.liveCandidate !== null || result.editConsumed) {
  throw new Error("Expected failed regeneration to avoid consuming the edit request.");
}

const reviewEvidenceHash = await sha256File(result.reviewEvidencePath);
await writeJson(SUMMARY_PATH, {
  capturedAt: CAPTURED_AT,
  evidenceKind: "df235-review-failure-preservation-smoke",
  productRunner: "runReviewStageSlideRegeneration",
  projectId: PROJECT_ID,
  eventId: EVENT_ID,
  instruction: INSTRUCTION,
  reviewEvidencePath: result.reviewEvidencePath,
  reviewEvidenceSha256: reviewEvidenceHash,
  preservedSlide: {
    number: preservedSlide.number,
    version: preservedSlide.version,
    status: preservedSlide.status,
    imageDescriptor: preservedSlide.imageDescriptor,
    notes: preservedSlide.notes,
  },
  comparison: result.comparison,
  liveCandidate: result.liveCandidate,
  editConsumed: result.editConsumed,
  writes: store.writes.map((write) => ({
    path: write.path,
    kind: typeof write.content === "string" ? "text" : "binary",
    bytes: contentBytes(write.content),
  })),
});

console.log(`${SUMMARY_PATH} ${await sha256File(SUMMARY_PATH)}`);

async function writeOriginalCodexEvidence(storage: Storage): Promise<void> {
  const store = createBrowserImageArtifactStore(storage);
  await store.write({ path: IMAGE_PATH, content: new Uint8Array([1, 2, 3]) });
  await store.write({
    path: METADATA_PATH,
    content: JSON.stringify({
      path: METADATA_PATH,
      providerId: "codex",
      slideNumber: 1,
      request: {
        model: "gpt-image-2",
        threadId: "thread_codex_image_original",
        turnId: "turn_codex_image_original",
      },
    }),
  });
  await store.write({
    path: PROVENANCE_PATH,
    content: JSON.stringify({
      path: PROVENANCE_PATH,
      artifactId: `${PROJECT_ID}_image_slide_001_v1`,
      providerKind: "codex",
      threadId: "thread_codex_image_original",
      turnId: "turn_codex_image_original",
    }),
  });
}

function reviewProject(now: number): DeckProject {
  const originalSlide = approvedOriginalSlide();
  return {
    ...approvedProject(PROJECT_ID, now),
    name: "DF-235 Failure Preservation Smoke",
    stage: "SLIDE_REVIEW_PENDING",
    slides: [originalSlide],
    imagePathDecision: codexLockedDecision(now),
  };
}

function approvedOriginalSlide(): GeneratedSlide {
  return {
    number: 1,
    version: 1,
    status: "approved",
    imageDescriptor: "codex|16:9|slide_01_layout.png|slide_generation@v1",
    notes: IMAGE_PATH,
  };
}

function codexLockedDecision(now: number): ImagePathDecisionRecord {
  return {
    decisionId: "image_path_codex_oauth",
    decidedAt: now,
    status: "locked",
    providerId: "codex",
    authMode: "codexOAuth",
    model: "gpt-image-2",
    billingOwner: "codex_account",
    requiredPermissions: ["codex.image_generation", "model:gpt-image-2"],
    organizationVerification: "unknown",
    fixtureFallbackAllowed: false,
    excludedRoutes: [
      {
        route: "openaiApiKey",
        reason: "OpenAI API-key image generation is not the production route.",
      },
    ],
    blockers: [],
    binaryArtifactPath: IMAGE_PATH,
    provenanceArtifactPath: PROVENANCE_PATH,
  };
}
