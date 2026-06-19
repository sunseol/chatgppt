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
  if (!validValidationBundlePath(manifest.path)) {
    return [
      liveGoldenPathIssue("missing_validation_bundle", "Final validation bundle is required.", [
        manifest.path || "missing",
      ]),
    ];
  }

  const expectedReportDigest = hashContent(bundle.reportContent);
  const expectedSourceIds = validSources(bundle.sources).map((source) => source.artifactId);
  const expectedImageIds = liveImageArtifacts(bundle.imageArtifacts).map(
    (artifact) => artifact.artifactId,
  );

  return [
    ...manifestDuplicateIssues(manifest),
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
      artifact.authMode === "api_key" &&
      !artifact.fixture &&
      Boolean(artifact.requestId?.trim()),
  );
}

function manifestDuplicateIssues(
  manifest: LiveFinalValidationBundle,
): readonly LiveGoldenPathE2EIssue[] {
  const duplicates = [
    ...duplicateValues(manifest.screenshotPaths).map((path) => `screenshot:${path}`),
    ...duplicateValues(manifest.sourceArtifactIds).map((artifactId) => `source:${artifactId}`),
    ...duplicateValues(manifest.imageArtifactIds).map((artifactId) => `image:${artifactId}`),
  ];
  return duplicates.length === 0
    ? []
    : [
        liveGoldenPathIssue(
          "validation_bundle_duplicate_reference",
          "Final validation bundle must not contain duplicate artifact or screenshot references.",
          duplicates,
        ),
      ];
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

function validValidationBundlePath(value: string): boolean {
  const normalized = value.toLowerCase();
  if (!normalized.endsWith(".zip") && !normalized.endsWith(".json")) return false;
  return !["mock", "fixture", "test", "fake"].some((marker) => normalized.includes(marker));
}

function duplicateValues(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values.map((item) => item.trim()).filter(Boolean)) {
    if (seen.has(value)) {
      duplicates.add(value);
    } else {
      seen.add(value);
    }
  }
  return [...duplicates];
}
