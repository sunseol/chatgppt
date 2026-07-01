import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { evaluateProductionPackagingEvidence } from "../../src/lib/production-packaging-evidence.ts";

const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export async function verifyCleanMachineEvidence(manifestPath, options = {}) {
  const findings = [];
  const verification = {
    schemaVersion: 1,
    ok: false,
    status: "blocked",
    checkedAt: new Date().toISOString(),
    manifestPath,
    sourceDmgSha256: null,
    checkedFileCount: 0,
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

  const evidence = manifest.evidence;
  const manifestDir = path.dirname(absoluteManifestPath);
  verification.manifestPath = absoluteManifestPath;
  verification.sourceDmgSha256 = manifest.sourceDmgSha256 ?? null;
  validateEnvelope(manifest, findings, options);
  if (!evidence || typeof evidence !== "object") {
    pushFinding(findings, "missing_evidence", "evidence");
    return verification;
  }

  const result = evaluateProductionPackagingEvidence(evidence);
  if (result.kind === "blocked") {
    findings.push(...result.issues.map(issueToFinding));
  }
  if (
    isSha256(manifest.sourceDmgSha256) &&
    evidence.nativeMacosBundleSha256 !== manifest.sourceDmgSha256
  ) {
    pushFinding(findings, "native_bundle_hash_mismatch", "evidence.nativeMacosBundleSha256");
  }

  const fileChecks = await verifyReferencedFiles(
    evidence,
    options.referenceRoot ?? manifestDir,
    manifestDir,
  );
  verification.checkedFileCount = fileChecks.checkedFileCount;
  findings.push(...fileChecks.findings);
  verification.ok = findings.length === 0;
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

async function verifyReferencedFiles(evidence, referenceRoot, manifestDir) {
  const checks = await Promise.all([
    fileExists(evidence.packagePath, referenceRoot, "evidence.packagePath"),
    fileExists(evidence.nativeMacosBundlePath, referenceRoot, "evidence.nativeMacosBundlePath"),
    fileExists(evidence.runbookPath, referenceRoot, "evidence.runbookPath"),
    ...(evidence.runtimeAbsenceRemediationShown
      ? [
          runtimeRemediationEvidencePass(
            evidence.runtimeAbsenceRemediationEvidencePath,
            referenceRoot,
            manifestDir,
          ),
        ]
      : []),
  ]);
  return {
    checkedFileCount: checks.filter((check) => check.checked).length,
    findings: checks.flatMap((check) => check.findings),
  };
}

async function fileExists(filePath, referenceRoot, findingPath) {
  const findings = [];
  if (typeof filePath !== "string" || filePath.trim().length === 0) {
    pushFinding(findings, "missing_referenced_file", findingPath, "missing");
    return { checked: false, findings };
  }
  try {
    const info = await stat(resolveReferencePath(referenceRoot, filePath));
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

async function runtimeRemediationEvidencePass(filePath, referenceRoot, manifestDir) {
  const findings = [];
  if (typeof filePath !== "string" || filePath.trim().length === 0) {
    pushFinding(
      findings,
      "missing_runtime_absence_remediation",
      "evidence.runtimeAbsenceRemediationEvidencePath",
      "missing verification path",
    );
    return { checked: false, findings };
  }

  const resolvedPath = await firstExistingPath(filePath, referenceRoot, manifestDir);
  if (!resolvedPath) {
    pushFinding(
      findings,
      "missing_runtime_absence_remediation",
      "evidence.runtimeAbsenceRemediationEvidencePath",
      filePath,
    );
    return { checked: false, findings };
  }

  let verification;
  try {
    verification = JSON.parse(await readFile(resolvedPath, "utf8"));
  } catch (error) {
    pushFinding(
      findings,
      "missing_runtime_absence_remediation",
      "evidence.runtimeAbsenceRemediationEvidencePath",
      error instanceof Error ? error.message : String(error),
    );
    return { checked: true, findings };
  }

  if (
    verification?.evidenceKind !== "runtime_absence_remediation" ||
    verification?.ok !== true ||
    verification?.status !== "pass"
  ) {
    pushFinding(
      findings,
      "missing_runtime_absence_remediation",
      "evidence.runtimeAbsenceRemediationEvidencePath",
      "runtime absence remediation verification is not pass",
    );
  }
  return { checked: true, findings };
}

async function firstExistingPath(filePath, referenceRoot, manifestDir) {
  const candidates = candidateReferencePaths(filePath, referenceRoot, manifestDir);
  for (const candidate of candidates) {
    try {
      const info = await stat(candidate);
      if (info.isFile()) return candidate;
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

function candidateReferencePaths(filePath, referenceRoot, manifestDir) {
  if (path.isAbsolute(filePath)) return [filePath];
  const fromRoot = path.resolve(referenceRoot, filePath);
  const fromManifest = path.resolve(manifestDir, filePath);
  return fromRoot === fromManifest ? [fromRoot] : [fromRoot, fromManifest];
}

function issueToFinding(issue) {
  return {
    code: issue.code,
    path: "evidence",
    detail: `${issue.message} ${issue.refs.join(",")}`.trim(),
  };
}

function resolveReferencePath(referenceRoot, filePath) {
  return path.isAbsolute(filePath) ? filePath : path.resolve(referenceRoot, filePath);
}

function isSha256(value) {
  return typeof value === "string" && SHA256_PATTERN.test(value);
}

function pushFinding(findings, code, findingPath, detail = "") {
  findings.push({ code, path: findingPath, detail });
}
