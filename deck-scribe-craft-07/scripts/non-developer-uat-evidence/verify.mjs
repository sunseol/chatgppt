import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { evaluateLiveManualQaEvidence } from "../../src/lib/live-manual-qa-evidence.ts";

const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export async function verifyNonDeveloperUatEvidence(manifestPath, options = {}) {
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
  verification.manifestPath = absoluteManifestPath;
  verification.sourceDmgSha256 = manifest.sourceDmgSha256 ?? null;
  validateEnvelope(manifest, findings, options);
  if (!evidence || typeof evidence !== "object") {
    pushFinding(findings, "missing_evidence", "evidence");
    return verification;
  }

  const result = evaluateLiveManualQaEvidence(evidence);
  if (result.kind === "blocked") {
    findings.push(...result.issues.map(issueToFinding));
  }
  const sessionArtifact = await fileExists(
    manifest.sessionArtifactPath,
    path.dirname(absoluteManifestPath),
    "sessionArtifactPath",
  );
  verification.checkedFileCount = sessionArtifact.checked ? 1 : 0;
  findings.push(...sessionArtifact.findings);
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

async function fileExists(filePath, manifestDir, findingPath) {
  const findings = [];
  if (typeof filePath !== "string" || filePath.trim().length === 0) {
    pushFinding(findings, "missing_referenced_file", findingPath, "missing");
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

function issueToFinding(issue) {
  return {
    code: issue.code,
    path: "evidence",
    detail: `${issue.message} ${issue.refs.join(",")}`.trim(),
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
