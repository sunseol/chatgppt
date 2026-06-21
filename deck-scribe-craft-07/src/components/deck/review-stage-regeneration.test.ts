import { describe, expect, test } from "bun:test";
import type { DeckProject } from "@/lib/deck-types";
import type { ImageArtifactStoreWrite } from "@/lib/image-artifact-store";
import type { ImagePathDecisionRecord } from "@/lib/image-path-decision";
import { createBrowserImageArtifactStore } from "@/lib/browser-image-artifact-store";
import { encodeSolidPngDataUrl } from "@/lib/png-encoder";
import { mockBrief, mockDesign, mockLayout, mockPlan, mockResearch } from "@/lib/mock-ai";
import {
  approveReviewStageRevision,
  runReviewStageSlideRegeneration,
} from "./review-stage-regeneration";
import { approveReviewStageRevisionWithEvidence } from "./review-stage-regeneration-evidence";

describe("review stage regeneration", () => {
  test("runs Codex live regeneration for an approved slide with stored browser evidence", async () => {
    // Given
    const storage = new MemoryStorage();
    await writeOriginalCodexEvidence(storage);
    const writes: ImageArtifactStoreWrite[] = [];
    const project = approvedProject();

    // When
    const result = await runReviewStageSlideRegeneration({
      project,
      slides: project.slides ?? [],
      selected: 1,
      instruction: "오른쪽 차트를 더 크게 만들어줘.",
      storage,
      client: {
        async generate() {
          return {
            imageDataUrl: encodeSolidPngDataUrl({
              width: 1,
              height: 1,
              color: { r: 24, g: 80, b: 120, a: 255 },
            }),
            model: "gpt-image-2",
            runtime: "codex_app_server",
            threadId: "thread_codex_regeneration_001",
            turnId: "turn_codex_regeneration_001",
            latencyMs: 1_200,
            usage: { imageCount: 1 },
          };
        },
      },
      store: {
        write: async (entry) => {
          writes.push(entry);
        },
      },
      now: clock(1_789_930_000),
      createId: () => "rev_review_live_001",
    });

    // Then
    expect(result.liveCandidate?.backgroundArtifactId).toBe("project_001_image_slide_001_v2");
    expect(result.comparison?.afterImageDescriptor.includes("project_001_image_slide_001_v2")).toBe(
      true,
    );
    expect(result.slides[0]?.status).toBe("approved");
    expect(writes.map((write) => write.path)).toEqual([
      "projects/project_001/slides/images/slide_001.v2.png",
      "projects/project_001/slides/images/slide_001.v2.metadata.json",
      "projects/project_001/slides/images/slide_001.v2.provenance.json",
    ]);
    if (result.comparison === null) throw new Error("Expected a live comparison.");
    const approved = approveReviewStageRevision({
      slides: result.slides,
      comparison: result.comparison,
      liveCandidate: result.liveCandidate,
    });
    expect(approved[0]?.status).toBe("approved");
    expect(approved[0]?.version).toBe(2);
    const approvedWithEvidence = await approveReviewStageRevisionWithEvidence({
      projectId: project.id,
      slides: result.slides,
      comparison: result.comparison,
      liveCandidate: result.liveCandidate,
      store: {
        write: async (entry) => {
          writes.push(entry);
        },
      },
      now: () => 1_789_930_100,
    });
    expect(approvedWithEvidence.reviewEvidencePath).toBe(
      "projects/project_001/live-evidence/df235-slide-regeneration-review-rev_review_live_001.json",
    );
    expect(approvedWithEvidence.slides[0]?.version).toBe(2);
    expect(writes.at(-1)?.path).toBe(approvedWithEvidence.reviewEvidencePath);
    const reviewEvidenceContent = writes.at(-1)?.content;
    if (typeof reviewEvidenceContent !== "string") {
      throw new Error("Expected review evidence JSON.");
    }
    expect(reviewEvidenceContent.includes('"issue": "DF-235"')).toBe(true);
    expect(reviewEvidenceContent.includes('"outcome": "approved"')).toBe(true);
  });

  test("preserves the approved original and writes failure evidence when live regeneration fails", async () => {
    // Given
    const storage = new MemoryStorage();
    await writeOriginalCodexEvidence(storage);
    const writes: ImageArtifactStoreWrite[] = [];
    const project = approvedProject();

    // When
    const result = await runReviewStageSlideRegeneration({
      project,
      slides: project.slides ?? [],
      selected: 1,
      instruction: "오른쪽 차트를 더 크게 만들어줘.",
      storage,
      client: {
        async generate() {
          throw new Error("provider returned 503");
        },
      },
      store: {
        write: async (entry) => {
          writes.push(entry);
        },
      },
      now: clock(1_789_930_000),
      createId: () => "rev_review_live_failed_001",
    });

    // Then
    expect(result.slides[0]?.status).toBe("approved");
    expect(result.slides[0]?.version).toBe(1);
    expect(result.comparison).toBe(null);
    expect(result.liveCandidate).toBe(null);
    expect(result.editConsumed).toBe(false);
    expect(result.reviewEvidencePath).toBe(
      "projects/project_001/live-evidence/df235-slide-regeneration-review-rev_review_live_failed_001.json",
    );
    expect(writes.map((write) => write.path)).toEqual([result.reviewEvidencePath]);
    const content = writes[0]?.content;
    if (typeof content !== "string") throw new Error("Expected failure evidence JSON.");
    expect(content.includes('"outcome": "preserved_after_failure"')).toBe(true);
    expect(content.includes("provider returned 503")).toBe(true);
  });
});

async function writeOriginalCodexEvidence(storage: Storage): Promise<void> {
  const store = createBrowserImageArtifactStore(storage);
  await store.write({
    path: "projects/project_001/slides/images/slide_001.v1.png",
    content: new Uint8Array([1, 2, 3]),
  });
  await store.write({
    path: "projects/project_001/slides/images/slide_001.v1.metadata.json",
    content: JSON.stringify({
      path: "projects/project_001/slides/images/slide_001.v1.metadata.json",
      providerId: "codex",
      slideNumber: 1,
      request: { model: "gpt-image-2", turnId: "turn_codex_image_original" },
    }),
  });
  await store.write({
    path: "projects/project_001/slides/images/slide_001.v1.provenance.json",
    content: JSON.stringify({
      path: "projects/project_001/slides/images/slide_001.v1.provenance.json",
      artifactId: "project_001_image_slide_001_v1",
      providerKind: "codex",
      turnId: "turn_codex_image_original",
    }),
  });
}

function approvedProject(): DeckProject {
  const brief = {
    ...mockBrief("Review stage live regeneration", 1, "16:9"),
    id: "brief_001",
    approvedHash: "sha256:brief",
  };
  const research = { ...mockResearch(brief), id: "research_001", approvedHash: "sha256:research" };
  const plan = { ...mockPlan(brief, research), id: "plan_001", approvedHash: "sha256:plan" };
  const design = { ...mockDesign(brief, plan), id: "design_001", approvedHash: "sha256:design" };
  const layout = { ...mockLayout(plan, design), id: "layout_001", approvedHash: "sha256:layout" };
  return {
    id: "project_001",
    name: "Review Live Regeneration",
    initialPrompt: "Create a live deck",
    aspectRatio: "16:9",
    language: "ko",
    slideCount: 1,
    stage: "SLIDE_REVIEW_PENDING",
    createdAt: 1_789_930_000,
    updatedAt: 1_789_930_000,
    brief,
    research,
    plan,
    design,
    layout,
    imagePathDecision: codexLockedDecision(),
    slides: [
      {
        number: 1,
        version: 1,
        status: "approved",
        imageDescriptor: "codex|16:9|slide_01_layout.png|slide_generation@v1",
        notes: "projects/project_001/slides/images/slide_001.v1.png",
      },
    ],
    invalidated: {},
    approvalLog: [],
  };
}

function codexLockedDecision(): ImagePathDecisionRecord {
  return {
    decisionId: "image_path_codex_oauth",
    decidedAt: 1_789_930_000,
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
    binaryArtifactPath: "projects/project_001/slides/images/slide_001.v1.png",
    provenanceArtifactPath: "projects/project_001/slides/images/slide_001.v1.provenance.json",
  };
}

function clock(start: number): () => number {
  let next = start;
  return () => {
    next += 1;
    return next;
  };
}

class MemoryStorage implements Storage {
  readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    let currentIndex = 0;
    for (const key of this.values.keys()) {
      if (currentIndex === index) return key;
      currentIndex += 1;
    }
    return null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}
