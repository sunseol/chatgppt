import { mkdir, mkdtemp, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import { hashContent } from "../../src/lib/artifacts.ts";
import { LIVE_GOLDEN_PATH_E2E_STEPS } from "../../src/lib/live-golden-path-e2e.ts";
import { buildPackagedGoldenPathManifest } from "./manifest.mjs";
import { verifyPackagedGoldenPathEvidence } from "./verify.mjs";

describe("packaged Golden Path manifest builder", () => {
  test("builds a verifier-ready manifest from packaged live run files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "deckforge-packaged-gp-manifest-"));
    const reportContent = "Packaged Golden Path passed with live GPT image artifacts.";
    const reportPath = "live_e2e_report.md";
    const screenshots = LIVE_GOLDEN_PATH_E2E_STEPS.map((step) => `screenshots/${step}.png`);
    const recordingPath = "recordings/live-golden-path.mp4";
    const finalValidationBundlePath = "final-validation-bundle.zip";
    const sources = [
      { url: "https://www.sec.gov/example", role: "official", artifactId: "src_sec" },
      { url: "https://www.w3.org/TR/WCAG22/", role: "primary", artifactId: "src_w3c" },
      {
        url: "https://www.rfc-editor.org/rfc/rfc9110",
        role: "supporting",
        artifactId: "src_rfc",
      },
    ];
    const imageArtifacts = Array.from({ length: 5 }, (_, index) => imageArtifact(index + 1));
    const lineage = [textArtifact("live_interview", "turn_interview"), ...imageArtifacts];
    await writeFixtureFile(root, reportPath, reportContent);
    await Promise.all(screenshots.map((screenshot) => writeFixtureFile(root, screenshot, "png")));
    await writeFixtureFile(root, recordingPath, "recording");
    await writeFixtureFile(root, finalValidationBundlePath, "zip");
    await writeJson(path.join(root, "sources.json"), sources);
    await writeJson(path.join(root, "lineage.json"), lineage);
    await writeJson(path.join(root, "image-artifacts.json"), imageArtifacts);

    const manifest = await buildPackagedGoldenPathManifest({
      rootDir: root,
      sourceDmgSha256: "a".repeat(64),
      projectId: "p_live",
      finalExportArtifactId: "live_export_001",
      signer: "qa.lead@example.com",
      signedAt: "2026-06-30T05:00:00.000Z",
    });

    expect(manifest.bundle.completedSteps).toEqual(LIVE_GOLDEN_PATH_E2E_STEPS);
    expect(manifest.bundle.reportContent).toBe(reportContent);
    expect(manifest.bundle.reportSignature.digest).toBe(hashContent(reportContent));
    expect(manifest.bundle.finalValidationBundle).toEqual({
      path: finalValidationBundlePath,
      finalExportArtifactId: "live_export_001",
      reportDigest: hashContent(reportContent),
      screenshotPaths: screenshots,
      recordingPath,
      sourceArtifactIds: sources.map((source) => source.artifactId),
      imageArtifactIds: imageArtifacts.map((artifact) => artifact.artifactId),
    });
    expect(manifest.bundle.restartReopen).toEqual({
      projectId: "p_live",
      reopenedAt: "2026-06-30T05:00:00.000Z",
      exportArtifactId: "live_export_001",
    });

    const manifestPath = path.join(root, "packaged-golden-path.json");
    await writeJson(manifestPath, manifest);
    const verification = await verifyPackagedGoldenPathEvidence(manifestPath, {
      expectedDmgSha256: "a".repeat(64),
    });

    expect(verification.ok).toBe(true);
    expect(verification.status).toBe("pass");
    expect(verification.findings).toEqual([]);
  });

  test("fails before writing when a required run file is missing", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "deckforge-packaged-gp-manifest-"));
    await writeFixtureFile(root, "live_e2e_report.md", "report");

    await expect(
      buildPackagedGoldenPathManifest({
        rootDir: root,
        sourceDmgSha256: "b".repeat(64),
        projectId: "p_live",
        finalExportArtifactId: "live_export_001",
        signer: "qa.lead@example.com",
        signedAt: "2026-06-30T05:00:00.000Z",
      }),
    ).rejects.toThrow("Missing packaged Golden Path evidence file");
  });
});

async function writeFixtureFile(root, relativePath, contents) {
  const absolutePath = path.join(root, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, contents);
  const info = await stat(absolutePath);
  expect(info.isFile()).toBe(true);
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function textArtifact(artifactId, turnId) {
  return {
    artifactId,
    executionMode: "production",
    providerKind: "codex",
    authMode: "codex_session",
    modelOrRuntime: "codex-cli 0.142.0",
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
