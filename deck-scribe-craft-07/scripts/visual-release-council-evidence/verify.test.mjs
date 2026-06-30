import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { verifyVisualReleaseCouncilEvidence } from "./verify.mjs";

const SOURCE_DMG_SHA256 = "a".repeat(64);
const REVIEWERS = ["agy", "model_1", "model_2", "model_3", "model_4", "model_5", "model_6"];

describe("visual release council evidence verifier", () => {
  test("passes a complete hard-gated AGY plus six-model review manifest", async () => {
    const dir = await evidenceDir();
    const manifestPath = await writeManifest(dir, completeManifest());

    const result = await verifyVisualReleaseCouncilEvidence(manifestPath, {
      expectedDmgSha256: SOURCE_DMG_SHA256,
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("pass");
    expect(result.hardGateStatus).toBe("passed");
    expect(result.councilAdvisoryStatus).toBe("target_met");
    expect(result.reviewerCount).toBe(7);
    expect(result.averageScore).toBe(98.1);
    expect(result.minimumScore).toBe(98);
    expect(result.checkedFileCount).toBe(10);
    expect(result.findings).toEqual([]);
  });

  test("blocks when no manifest is provided", async () => {
    const result = await verifyVisualReleaseCouncilEvidence(null);

    expect(result.ok).toBe(false);
    expect(result.status).toBe("blocked");
    expect(result.findings.map((finding) => finding.code)).toContain("missing_manifest");
  });

  test("blocks a failed deterministic hard gate even when advisory scores pass", async () => {
    const dir = await evidenceDir();
    const manifest = {
      ...completeManifest(),
      hardGates: [
        ...completeManifest().hardGates.slice(0, 2),
        { id: "pptx_real_render", passed: false, evidencePath: "hard-gates/pptx-render.json" },
      ],
    };
    const manifestPath = await writeManifest(dir, manifest);

    const result = await verifyVisualReleaseCouncilEvidence(manifestPath);

    expect(result.ok).toBe(false);
    expect(result.status).toBe("blocked");
    expect(result.hardGateStatus).toBe("blocked");
    expect(result.councilAdvisoryStatus).toBe("target_met");
    expect(result.findings.map((finding) => finding.code)).toContain("hard_gate_failed");
  });

  test("blocks missing reviewer, low score, and unresolved blocking defect", async () => {
    const dir = await evidenceDir();
    const reviews = completeManifest()
      .reviews.filter((review) => review.reviewerId !== "model_6")
      .map((review) =>
        review.reviewerId === "model_2"
          ? {
              ...review,
              score: 97,
              defects: [
                {
                  severity: "P1",
                  slideNumber: 2,
                  description: "Title overlaps generated visual crop.",
                  resolved: false,
                },
              ],
            }
          : review,
      );
    const manifestPath = await writeManifest(dir, { ...completeManifest(), reviews });

    const result = await verifyVisualReleaseCouncilEvidence(manifestPath);

    expect(result.ok).toBe(false);
    expect(result.status).toBe("blocked");
    expect(result.councilAdvisoryStatus).toBe("target_not_met");
    expect(result.findings.map((finding) => finding.code)).toContain("missing_reviewer");
    expect(result.findings.map((finding) => finding.code)).toContain("review_score_below_target");
    expect(result.findings.map((finding) => finding.code)).toContain("blocking_defect_reported");
  });

  test("blocks when cited evidence files are missing", async () => {
    const dir = await evidenceDir();
    const manifest = {
      ...completeManifest(),
      reviews: completeManifest().reviews.map((review) =>
        review.reviewerId === "agy"
          ? { ...review, evidencePath: "reviews/missing-agy.json" }
          : review,
      ),
    };
    const manifestPath = await writeManifest(dir, manifest);

    const result = await verifyVisualReleaseCouncilEvidence(manifestPath);

    expect(result.ok).toBe(false);
    expect(result.checkedFileCount).toBe(9);
    expect(result.findings.map((finding) => finding.code)).toContain("missing_referenced_file");
  });
});

function completeManifest() {
  return {
    schemaVersion: 1,
    sourceDmgSha256: SOURCE_DMG_SHA256,
    targetScore: 98,
    hardGates: [
      { id: "layout_ir_validator", passed: true, evidencePath: "hard-gates/layout-ir.json" },
      { id: "pixel_diff", passed: true, evidencePath: "hard-gates/pixel-diff.json" },
      { id: "pptx_real_render", passed: true, evidencePath: "hard-gates/pptx-render.json" },
    ],
    reviews: REVIEWERS.map((reviewerId, index) => ({
      reviewerId,
      score: index === 0 ? 99 : 98,
      evidencePath: `reviews/${reviewerId}.json`,
      defects: [{ severity: "P2", description: "Non-blocking polish note.", resolved: false }],
    })),
  };
}

async function evidenceDir() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "deckforge-visual-council-"));
  for (const filePath of [
    "hard-gates/layout-ir.json",
    "hard-gates/pixel-diff.json",
    "hard-gates/pptx-render.json",
    ...REVIEWERS.map((reviewerId) => `reviews/${reviewerId}.json`),
  ]) {
    await writeJsonFile(path.join(dir, filePath), { ok: true });
  }
  return dir;
}

async function writeManifest(dir, manifest) {
  const manifestPath = path.join(dir, "visual-council-manifest.json");
  await writeJsonFile(manifestPath, manifest);
  return manifestPath;
}

async function writeJsonFile(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value)}\n`);
}
