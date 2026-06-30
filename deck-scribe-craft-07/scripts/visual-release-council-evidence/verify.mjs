import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { evaluateVisualReleaseCouncil } from "../../src/lib/visual-release-council.ts";

const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export async function verifyVisualReleaseCouncilEvidence(manifestPath, options = {}) {
  const findings = [];
  const verification = {
    schemaVersion: 1,
    ok: false,
    status: "blocked",
    checkedAt: new Date().toISOString(),
    manifestPath,
    sourceDmgSha256: null,
    checkedFileCount: 0,
    hardGateStatus: "blocked",
    councilAdvisoryStatus: "target_not_met",
    targetScore: 98,
    reviewerCount: 0,
    averageScore: 0,
    minimumScore: 0,
    findings,
  };
  if (!manifestPath) {
    pushFinding(findings, "missing_manifest", "manifestPath");
    return verification;
  }

  const absoluteManifestPath = path.resolve(manifestPath);
  let manifest;
  try {
    manifest = JSON.parse(await readFile(absoluteManifestPath, "utf8"));
  } catch (error) {
    pushFinding(
      findings,
      "invalid_manifest_json",
      "manifestPath",
      error instanceof Error ? error.message : String(error),
    );
    return verification;
  }

  const manifestDir = path.dirname(absoluteManifestPath);
  verification.manifestPath = absoluteManifestPath;
  verification.sourceDmgSha256 = manifest.sourceDmgSha256 ?? null;
  validateEnvelope(manifest, findings, options);

  const hardGates = Array.isArray(manifest.hardGates) ? manifest.hardGates : [];
  const reviews = Array.isArray(manifest.reviews) ? manifest.reviews : [];
  if (hardGates.length === 0) pushFinding(findings, "missing_hard_gates", "hardGates");
  if (reviews.length === 0) pushFinding(findings, "missing_reviews", "reviews");

  const readout = evaluateVisualReleaseCouncil({
    hardGates,
    reviews,
    targetScore: manifest.targetScore,
  });
  verification.hardGateStatus = readout.hardGateStatus;
  verification.councilAdvisoryStatus = readout.councilAdvisoryStatus;
  verification.targetScore = readout.targetScore;
  verification.reviewerCount = readout.reviewerCount;
  verification.averageScore = readout.averageScore;
  verification.minimumScore = readout.minimumScore;
  findings.push(...readout.alerts.map(alertToFinding));

  const fileChecks = await verifyReferencedFiles({ hardGates, reviews }, manifestDir);
  verification.checkedFileCount = fileChecks.checkedFileCount;
  findings.push(...fileChecks.findings);

  verification.ok =
    findings.length === 0 &&
    readout.hardGateStatus === "passed" &&
    readout.councilAdvisoryStatus === "target_met";
  verification.status = verification.ok ? "pass" : "blocked";
  return verification;
}

function validateEnvelope(manifest, findings, options) {
  if (manifest.schemaVersion !== 1) {
    pushFinding(findings, "invalid_schema_version", "schemaVersion");
  }
  if (!isSha256(manifest.sourceDmgSha256)) {
    pushFinding(findings, "missing_source_dmg_sha256", "sourceDmgSha256");
  }
  if (
    options.expectedDmgSha256 &&
    isSha256(manifest.sourceDmgSha256) &&
    manifest.sourceDmgSha256 !== options.expectedDmgSha256
  ) {
    pushFinding(findings, "source_dmg_hash_mismatch", "sourceDmgSha256");
  }
}

async function verifyReferencedFiles(input, manifestDir) {
  const checks = await Promise.all([
    ...input.hardGates.map((gate, index) =>
      fileExists(gate.evidencePath, manifestDir, `hardGates.${index}.evidencePath`),
    ),
    ...input.reviews.map((review, index) =>
      fileExists(review.evidencePath, manifestDir, `reviews.${index}.evidencePath`),
    ),
  ]);
  return {
    checkedFileCount: checks.filter((check) => check.checked).length,
    findings: checks.flatMap((check) => check.findings),
  };
}

async function fileExists(filePath, manifestDir, findingPath) {
  const findings = [];
  if (typeof filePath !== "string" || filePath.trim().length === 0) {
    return { checked: false, findings };
  }
  try {
    const info = await stat(resolveManifestPath(manifestDir, filePath));
    if (!info.isFile()) {
      pushFinding(findings, "referenced_path_not_file", findingPath, filePath);
      return { checked: false, findings };
    }
    return { checked: true, findings };
  } catch {
    pushFinding(findings, "missing_referenced_file", findingPath, filePath);
    return { checked: false, findings };
  }
}

function alertToFinding(alert) {
  return {
    code: alert.code,
    path: "visualCouncil",
    detail: `${alert.message} ${alert.ref}`.trim(),
  };
}

function resolveManifestPath(manifestDir, filePath) {
  return path.isAbsolute(filePath) ? filePath : path.resolve(manifestDir, filePath);
}

function isSha256(value) {
  return typeof value === "string" && SHA256_PATTERN.test(value);
}

function pushFinding(findings, code, findingPath, detail = "") {
  findings.push({ code, path: findingPath, detail });
}
