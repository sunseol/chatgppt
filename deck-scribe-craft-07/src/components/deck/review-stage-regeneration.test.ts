import { describe, expect, test } from "bun:test";
import type { ImageArtifactStoreWrite } from "@/lib/image-artifact-store";
import { encodeSolidPngDataUrl } from "@/lib/png-encoder";
import {
  approvedProject,
  clock,
  MemoryStorage,
  writeOriginalCodexEvidence,
} from "./review-stage-regeneration-test-fixtures";
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
