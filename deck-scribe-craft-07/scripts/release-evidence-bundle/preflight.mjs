import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const REQUIRED_EVIDENCE = [
  "releaseArtifact",
  "automation",
  "uiContract",
  "packagedGoldenPath",
  "section45Interactions",
  "cleanMachine",
  "powerPointRoundTrip",
  "nonDeveloperUat",
  "visualCouncil",
  "secretScan",
];
const FINAL_STATUSES = new Set(["release-ready", "accepted"]);
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export async function readReleaseEvidenceManifest(manifestPath) {
  return JSON.parse(await readFile(manifestPath, "utf8"));
}

export async function evaluateReleaseEvidenceBundle(manifest, options = {}) {
  const findings = [];
  if (manifest.schemaVersion !== 1) {
    pushFinding(findings, "invalid_schema_version", "schemaVersion");
  }
  if (!FINAL_STATUSES.has(manifest.qaStatus)) {
    pushFinding(findings, "qa_status_not_final", "qaStatus", manifest.qaStatus ?? "missing");
  }
  validateBundleChecksum(manifest, findings);
  validateArtifactIdentity(manifest, findings);
  await validateRequiredEvidence(manifest, findings, options);
  validateReleaseBlockers(manifest, findings);
  validateSignOff(manifest, findings);

  return {
    ok: findings.length === 0,
    status: findings.length === 0 ? "ready" : "blocked",
    checkedAt: new Date().toISOString(),
    evidenceCount: Object.keys(manifest.evidence ?? {}).length,
    findings,
  };
}

export async function writeReleaseEvidencePreflight(manifestPath, outPath) {
  const manifest = await readReleaseEvidenceManifest(manifestPath);
  const verification = await evaluateReleaseEvidenceBundle(manifest, {
    evidenceRoot: process.cwd(),
  });
  await writeFile(outPath, `${JSON.stringify(verification, null, 2)}\n`);
  return verification;
}

function validateBundleChecksum(manifest, findings) {
  const checksum = manifest.bundleChecksum;
  if (!isSha256(checksum)) {
    pushFinding(findings, "missing_bundle_checksum", "bundleChecksum", checksum ?? "missing");
    return;
  }
  const expected = hashManifestForBundle(manifest);
  if (checksum !== expected) {
    pushFinding(
      findings,
      "bundle_checksum_mismatch",
      "bundleChecksum",
      `${checksum} != ${expected}`,
    );
  }
}

function validateArtifactIdentity(manifest, findings) {
  const identity = manifest.artifactIdentity ?? {};
  if (!identity.gitCommit)
    pushFinding(findings, "missing_git_commit", "artifactIdentity.gitCommit");
  if (identity.dirtyWorktree !== false) {
    pushFinding(findings, "dirty_worktree_identity", "artifactIdentity.dirtyWorktree");
  }
  if (!identity.version)
    pushFinding(findings, "missing_release_version", "artifactIdentity.version");
  if (!identity.buildNumber) {
    pushFinding(findings, "missing_build_number", "artifactIdentity.buildNumber");
  }
  if (!identity.dmgPath) pushFinding(findings, "missing_dmg_path", "artifactIdentity.dmgPath");
  if (!isSha256(identity.dmgSha256)) {
    pushFinding(findings, "missing_dmg_sha256", "artifactIdentity.dmgSha256");
  }
}

async function validateRequiredEvidence(manifest, findings, options) {
  const evidence = manifest.evidence ?? {};
  const expectedDmgSha = manifest.artifactIdentity?.dmgSha256;
  const finalStatus = FINAL_STATUSES.has(manifest.qaStatus);
  for (const [key, item] of Object.entries(evidence)) {
    if (item.status !== "pass") {
      pushFinding(
        findings,
        "evidence_not_passed",
        `evidence.${key}.status`,
        item.status ?? "missing",
      );
    }
    if (item.skipped === true || item.unverified === true) {
      pushFinding(findings, "evidence_marked_unverified", `evidence.${key}`);
    }
    if (!item.path) {
      pushFinding(findings, "missing_evidence_path", `evidence.${key}.path`);
    } else {
      await validateEvidenceReference({
        key,
        item,
        findings,
        evidenceRoot: options.evidenceRoot ?? process.cwd(),
        finalStatus,
      });
    }
    if (expectedDmgSha && item.dmgSha256 !== expectedDmgSha) {
      pushFinding(findings, "evidence_dmg_hash_mismatch", `evidence.${key}.dmgSha256`);
    }
  }
  for (const key of REQUIRED_EVIDENCE) {
    if (!evidence[key]) pushFinding(findings, "missing_required_evidence", `evidence.${key}`);
  }
}

async function validateEvidenceReference({ key, item, findings, evidenceRoot, finalStatus }) {
  const evidencePath = item.path;
  if (!isInspectableLocalPath(evidencePath)) {
    if (finalStatus) {
      pushFinding(findings, "evidence_path_not_machine_verifiable", `evidence.${key}.path`);
    }
    return;
  }
  const resolvedPath = path.isAbsolute(evidencePath)
    ? evidencePath
    : path.resolve(evidenceRoot, evidencePath);
  if (!(await fileExists(resolvedPath))) {
    pushFinding(findings, "missing_evidence_verification_file", `evidence.${key}.path`);
    return;
  }
  let verification;
  try {
    verification = JSON.parse(await readFile(resolvedPath, "utf8"));
  } catch (error) {
    pushFinding(
      findings,
      "invalid_evidence_verification_json",
      `evidence.${key}.path`,
      error instanceof Error ? error.message : String(error),
    );
    return;
  }
  if (verification.ok === false) {
    pushFinding(findings, "evidence_verification_not_ok", `evidence.${key}.path`);
  }
  if (["blocked", "fail", "failed"].includes(verification.status)) {
    pushFinding(
      findings,
      "evidence_verification_not_passed",
      `evidence.${key}.path`,
      verification.status,
    );
  }
}

function isInspectableLocalPath(value) {
  return typeof value === "string" && value.length > 0 && !/^[a-z][a-z0-9+.-]*:/i.test(value);
}

async function fileExists(filePath) {
  try {
    const info = await stat(filePath);
    return info.isFile();
  } catch {
    return false;
  }
}

function validateReleaseBlockers(manifest, findings) {
  const blockers = manifest.releaseBlockers ?? {};
  const entries = Object.entries(blockers);
  if (entries.length === 0) {
    pushFinding(findings, "missing_release_blocker_status", "releaseBlockers");
    return;
  }
  for (const [ticket, status] of entries) {
    if (status !== "closed") {
      pushFinding(findings, "release_blocker_not_closed", `releaseBlockers.${ticket}`, status);
    }
  }
}

function validateSignOff(manifest, findings) {
  for (const [key, label] of [
    ["qa", "signOff.qa"],
    ["releaseOwner", "signOff.releaseOwner"],
  ]) {
    const signOff = manifest.signOff?.[key] ?? {};
    if (!signOff.name) pushFinding(findings, "missing_signoff_name", `${label}.name`);
    if (!signOff.signedAt) pushFinding(findings, "missing_signoff_time", `${label}.signedAt`);
  }
}

export function hashManifestForBundle(manifest) {
  const copy = JSON.parse(JSON.stringify(manifest));
  delete copy.bundleChecksum;
  return createHash("sha256")
    .update(`${stableStringify(copy)}\n`)
    .digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function isSha256(value) {
  return typeof value === "string" && SHA256_PATTERN.test(value);
}

function pushFinding(findings, code, path, detail = "") {
  findings.push({ code, path, detail });
}
