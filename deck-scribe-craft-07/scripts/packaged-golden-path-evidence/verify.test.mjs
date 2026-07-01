import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import { hashContent } from "../../src/lib/artifacts.ts";
import { LIVE_GOLDEN_PATH_E2E_STEPS } from "../../src/lib/live-golden-path-e2e.ts";
import { verifyPackagedGoldenPathEvidence } from "./verify.mjs";

describe("packaged Golden Path evidence verification", () => {
  test("passes when a packaged live Golden Path manifest and referenced files are complete", async () => {
    const fixture = await createFixture();

    const result = await verifyPackagedGoldenPathEvidence(fixture.manifestPath);

    expect(result.ok).toBe(true);
    expect(result.status).toBe("pass");
    expect(result.findings).toEqual([]);
    expect(result.completedStepCount).toBe(LIVE_GOLDEN_PATH_E2E_STEPS.length);
    expect(result.checkedFileCount).toBe(13);
  });

  test("blocks when no manifest is provided", async () => {
    const result = await verifyPackagedGoldenPathEvidence(null);

    expect(result.ok).toBe(false);
    expect(result.status).toBe("blocked");
    expect(result.findings).toContainEqual({
      code: "missing_manifest",
      path: "manifestPath",
      detail: "",
    });
  });

  test("blocks when the underlying Golden Path bundle is incomplete", async () => {
    const fixture = await createFixture({
      bundlePatch: {
        completedSteps: LIVE_GOLDEN_PATH_E2E_STEPS.filter((step) => step !== "title_edit"),
      },
    });

    const result = await verifyPackagedGoldenPathEvidence(fixture.manifestPath);

    expect(result.ok).toBe(false);
    expect(result.findings.map((finding) => finding.code)).toContain("missing_e2e_step");
  });

  test("blocks when referenced evidence files are missing", async () => {
    const fixture = await createFixture({
      bundlePatch: { recordingPath: "recordings/missing.mp4" },
    });

    const result = await verifyPackagedGoldenPathEvidence(fixture.manifestPath);

    expect(result.ok).toBe(false);
    expect(result.findings).toContainEqual({
      code: "missing_referenced_file",
      path: "bundle.recordingPath",
      detail: "recordings/missing.mp4",
    });
  });

  test("blocks when reportPath content diverges from the signed report content", async () => {
    const fixture = await createFixture({ reportFileContent: "stale report" });

    const result = await verifyPackagedGoldenPathEvidence(fixture.manifestPath);

    expect(result.ok).toBe(false);
    expect(result.findings.map((finding) => finding.code)).toContain("report_file_mismatch");
  });
});

async function createFixture(options = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "deckforge-packaged-golden-path-"));
  const reportContent = "Golden Path passed with zero mock artifacts.";
  const screenshots = LIVE_GOLDEN_PATH_E2E_STEPS.map((step) => `screenshots/${step}.png`);
  const recordingPath = "recordings/live-golden-path.mp4";
  const finalValidationPath = "final-validation-bundle.zip";
  await writeFixtureFile(root, "live_e2e_report.md", options.reportFileContent ?? reportContent);
  await Promise.all(screenshots.map((screenshot) => writeFixtureFile(root, screenshot, "png")));
  await writeFixtureFile(root, recordingPath, "recording");
  await writeFixtureFile(root, finalValidationPath, "zip");

  const sources = [
    { url: "https://www.sec.gov/example", role: "official", artifactId: "src_sec" },
    { url: "https://www.w3.org/TR/WCAG22/", role: "primary", artifactId: "src_w3c" },
    { url: "https://www.rfc-editor.org/rfc/rfc9110", role: "supporting", artifactId: "src_rfc" },
  ];
  const imageArtifacts = Array.from({ length: 5 }, (_, index) => imageArtifact(index + 1));
  const bundle = {
    projectId: "p_live",
    finalExportArtifactId: "live_export_001",
    completedSteps: LIVE_GOLDEN_PATH_E2E_STEPS,
    reportPath: "live_e2e_report.md",
    reportContent,
    reportSignature: {
      signer: "qa.lead@example.com",
      signedAt: "2026-06-25T09:00:00.000Z",
      digest: hashContent(reportContent),
    },
    screenshots,
    recordingPath,
    finalValidationBundle: {
      path: finalValidationPath,
      finalExportArtifactId: "live_export_001",
      reportDigest: hashContent(reportContent),
      screenshotPaths: screenshots,
      recordingPath,
      sourceArtifactIds: sources.map((source) => source.artifactId),
      imageArtifactIds: imageArtifacts.map((artifact) => artifact.artifactId),
    },
    restartReopen: {
      projectId: "p_live",
      reopenedAt: "2026-06-25T09:10:00.000Z",
      exportArtifactId: "live_export_001",
    },
    sources,
    lineage: [textArtifact("live_interview", "turn_interview"), ...imageArtifacts],
    imageArtifacts,
    ...options.bundlePatch,
  };
  const manifestPath = path.join(root, "packaged-golden-path.json");
  await writeJson(manifestPath, {
    schemaVersion: 1,
    sourceDmgSha256: "a".repeat(64),
    bundle,
  });
  return { manifestPath };
}

async function writeFixtureFile(root, relativePath, contents) {
  const absolutePath = path.join(root, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, contents);
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function textArtifact(artifactId, turnId) {
  return {
    artifactId,
    executionMode: "production",
    providerKind: "codex",
    authMode: "codex_session",
    modelOrRuntime: "codex-cli 0.139.0",
    promptVersion: `${artifactId}@v1`,
    durationMs: 500,
    inputArtifactIds: [],
    fixture: false,
    turnId,
    threadId: "thread_live_project",
  };
}

function imageArtifact(index) {
  return {
    artifactId: `live_image_${index}`,
    executionMode: "production",
    providerKind: "openaiImage",
    authMode: "api_key",
    modelOrRuntime: "gpt-image-1",
    promptVersion: "slide_background@v1",
    durationMs: 1_000,
    inputArtifactIds: ["live_layout_ir"],
    fixture: false,
    requestId: `img_req_${index}`,
  };
}
