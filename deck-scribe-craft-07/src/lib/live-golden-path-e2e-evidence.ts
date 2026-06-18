import { hashContent } from "./artifacts";
import {
  liveGoldenPathIssue,
  type LiveFinalValidationBundle,
  type LiveGoldenPathE2EBundle,
  type LiveGoldenPathE2EIssue,
  type LiveGoldenPathSource,
} from "./live-golden-path-e2e-contract";
import type { ProviderArtifactProvenance } from "./provider-provenance";

export function countValidLiveSources(sources: readonly LiveGoldenPathSource[]): number {
  return new Set(validSources(sources).map((source) => source.url.trim())).size;
}

export function countLiveImageArtifacts(
  imageArtifacts: readonly ProviderArtifactProvenance[],
): number {
  return liveImageArtifacts(imageArtifacts).length;
}

export function validationBundleIssues(
  bundle: LiveGoldenPathE2EBundle,
): readonly LiveGoldenPathE2EIssue[] {
  const manifest = bundle.finalValidationBundle;
  if (!manifest.path.trim()) {
    return [
      liveGoldenPathIssue("missing_validation_bundle", "Final validation bundle is required.", [
        "missing",
      ]),
    ];
  }

  const expectedReportDigest = hashContent(bundle.reportContent);
  const expectedSourceIds = validSources(bundle.sources).map((source) => source.artifactId);
  const expectedImageIds = liveImageArtifacts(bundle.imageArtifacts).map(
    (artifact) => artifact.artifactId,
  );

  return [
    ...manifestExportIssues(manifest, bundle.finalExportArtifactId),
    ...manifestDigestIssues(manifest, expectedReportDigest),
    ...manifestScreenshotsIssues(manifest, bundle.screenshots),
    ...manifestRecordingIssues(manifest, bundle.recordingPath),
    ...manifestSourceIssues(manifest, expectedSourceIds),
    ...manifestImageIssues(manifest, expectedImageIds),
  ];
}

export function validSources(
  sources: readonly LiveGoldenPathSource[],
): readonly LiveGoldenPathSource[] {
  return sources.filter((source) => isHttpUrl(source.url) && source.artifactId.trim());
}

export function liveImageArtifacts(
  imageArtifacts: readonly ProviderArtifactProvenance[],
): readonly ProviderArtifactProvenance[] {
  return imageArtifacts.filter(
    (artifact) =>
      artifact.executionMode === "production" &&
      artifact.providerKind === "openaiImage" &&
      !artifact.fixture &&
      Boolean(artifact.requestId?.trim()),
  );
}

function manifestExportIssues(
  manifest: LiveFinalValidationBundle,
  expectedExportId: string,
): readonly LiveGoldenPathE2EIssue[] {
  return manifest.finalExportArtifactId === expectedExportId && expectedExportId.trim()
    ? []
    : [
        liveGoldenPathIssue(
          "validation_bundle_export_mismatch",
          "Final validation bundle must reference the final export artifact id.",
          [manifest.finalExportArtifactId || "missing", expectedExportId || "missing"],
        ),
      ];
}

function manifestDigestIssues(
  manifest: LiveFinalValidationBundle,
  expectedDigest: string,
): readonly LiveGoldenPathE2EIssue[] {
  return manifest.reportDigest === expectedDigest
    ? []
    : [
        liveGoldenPathIssue(
          "validation_bundle_report_digest_mismatch",
          "Final validation bundle must include the signed report digest.",
          [manifest.reportDigest || "missing", expectedDigest],
        ),
      ];
}

function manifestScreenshotsIssues(
  manifest: LiveFinalValidationBundle,
  screenshots: readonly string[],
): readonly LiveGoldenPathE2EIssue[] {
  const manifestPaths = pathSet(manifest.screenshotPaths);
  const missing = screenshots.filter((path) => path.trim() && !manifestPaths.has(path));
  return missing.length === 0
    ? []
    : [
        liveGoldenPathIssue(
          "validation_bundle_missing_screenshot",
          "Final validation bundle must include every step screenshot.",
          missing,
        ),
      ];
}

function manifestRecordingIssues(
  manifest: LiveFinalValidationBundle,
  recordingPath: string,
): readonly LiveGoldenPathE2EIssue[] {
  return manifest.recordingPath === recordingPath && recordingPath.trim()
    ? []
    : [
        liveGoldenPathIssue(
          "validation_bundle_missing_recording",
          "Final validation bundle must include the Golden Path recording.",
          [manifest.recordingPath || "missing", recordingPath || "missing"],
        ),
      ];
}

function manifestSourceIssues(
  manifest: LiveFinalValidationBundle,
  expectedSourceIds: readonly string[],
): readonly LiveGoldenPathE2EIssue[] {
  const manifestIds = pathSet(manifest.sourceArtifactIds);
  const missing = expectedSourceIds.filter((artifactId) => !manifestIds.has(artifactId));
  return missing.length === 0
    ? []
    : [
        liveGoldenPathIssue(
          "validation_bundle_missing_source",
          "Final validation bundle must include every valid source artifact.",
          missing,
        ),
      ];
}

function manifestImageIssues(
  manifest: LiveFinalValidationBundle,
  expectedImageIds: readonly string[],
): readonly LiveGoldenPathE2EIssue[] {
  const manifestIds = pathSet(manifest.imageArtifactIds);
  const missing = expectedImageIds.filter((artifactId) => !manifestIds.has(artifactId));
  return missing.length === 0
    ? []
    : [
        liveGoldenPathIssue(
          "validation_bundle_missing_image_artifact",
          "Final validation bundle must include every live image artifact.",
          missing,
        ),
      ];
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function pathSet(paths: readonly string[]): ReadonlySet<string> {
  return new Set(paths.filter((path) => path.trim()));
}
