import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { hashContent } from "../../src/lib/artifacts.ts";
import { LIVE_GOLDEN_PATH_E2E_STEPS } from "../../src/lib/live-golden-path-e2e.ts";

const DEFAULTS = {
  reportPath: "live_e2e_report.md",
  screenshotsDir: "screenshots",
  recordingPath: "recordings/live-golden-path.mp4",
  finalValidationBundlePath: "final-validation-bundle.zip",
  sourcesPath: "sources.json",
  lineagePath: "lineage.json",
  imageArtifactsPath: "image-artifacts.json",
};

export async function buildPackagedGoldenPathManifest(options) {
  const rootDir = path.resolve(options.rootDir);
  const paths = {
    reportPath: options.reportPath ?? DEFAULTS.reportPath,
    recordingPath: options.recordingPath ?? DEFAULTS.recordingPath,
    finalValidationBundlePath:
      options.finalValidationBundlePath ?? DEFAULTS.finalValidationBundlePath,
    sourcesPath: options.sourcesPath ?? DEFAULTS.sourcesPath,
    lineagePath: options.lineagePath ?? DEFAULTS.lineagePath,
    imageArtifactsPath: options.imageArtifactsPath ?? DEFAULTS.imageArtifactsPath,
  };
  const screenshots = screenshotPaths(options.screenshotsDir ?? DEFAULTS.screenshotsDir);
  await assertFilesExist(rootDir, [
    paths.reportPath,
    paths.recordingPath,
    paths.finalValidationBundlePath,
    paths.sourcesPath,
    paths.lineagePath,
    paths.imageArtifactsPath,
    ...screenshots,
  ]);

  const reportContent = await readText(rootDir, paths.reportPath);
  const sources = await readJson(rootDir, paths.sourcesPath);
  const lineage = await readJson(rootDir, paths.lineagePath);
  const imageArtifacts = await readJson(rootDir, paths.imageArtifactsPath);
  const reportDigest = hashContent(reportContent);
  const reopenedAt = options.reopenedAt ?? options.signedAt;

  return {
    schemaVersion: 1,
    sourceDmgSha256: options.sourceDmgSha256,
    bundle: {
      projectId: options.projectId,
      finalExportArtifactId: options.finalExportArtifactId,
      completedSteps: LIVE_GOLDEN_PATH_E2E_STEPS,
      reportPath: paths.reportPath,
      reportContent,
      reportSignature: {
        signer: options.signer,
        signedAt: options.signedAt,
        digest: reportDigest,
      },
      screenshots,
      recordingPath: paths.recordingPath,
      finalValidationBundle: {
        path: paths.finalValidationBundlePath,
        finalExportArtifactId: options.finalExportArtifactId,
        reportDigest,
        screenshotPaths: screenshots,
        recordingPath: paths.recordingPath,
        sourceArtifactIds: sources.map((source) => source.artifactId),
        imageArtifactIds: imageArtifacts.map((artifact) => artifact.artifactId),
      },
      restartReopen: {
        projectId: options.projectId,
        reopenedAt,
        exportArtifactId: options.finalExportArtifactId,
      },
      sources,
      lineage,
      imageArtifacts,
    },
  };
}

function screenshotPaths(screenshotsDir) {
  return LIVE_GOLDEN_PATH_E2E_STEPS.map(
    (step) => `${screenshotsDir.replace(/\/$/, "")}/${step}.png`,
  );
}

async function assertFilesExist(rootDir, filePaths) {
  const missing = [];
  for (const filePath of filePaths) {
    const absolutePath = path.resolve(rootDir, filePath);
    try {
      const info = await stat(absolutePath);
      if (!info.isFile()) missing.push(filePath);
    } catch {
      missing.push(filePath);
    }
  }
  if (missing.length > 0) {
    throw new Error(`Missing packaged Golden Path evidence file: ${missing.join(", ")}`);
  }
}

async function readText(rootDir, filePath) {
  return readFile(path.resolve(rootDir, filePath), "utf8");
}

async function readJson(rootDir, filePath) {
  return JSON.parse(await readText(rootDir, filePath));
}
