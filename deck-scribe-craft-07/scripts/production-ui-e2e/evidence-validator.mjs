import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { isSha256 } from "./artifact-identity.mjs";

const REQUIRED_FILE_KEYWORDS = [
  ["interaction", "interaction.json"],
  ["beforeScreenshot", "before.png"],
  ["afterScreenshot", "after.png"],
  ["beforeState", "before-state.json"],
  ["afterState", "after-state.json"],
  ["ipc", "ipc.jsonl"],
  ["network", "network.jsonl"],
];

const TEXT_FILE_KEYS = ["interaction", "beforeState", "afterState", "ipc", "network"];

export async function validateProductionE2eBundle(bundleDir) {
  const manifestPath = path.join(bundleDir, "manifest.json");
  const summaryPath = path.join(bundleDir, "summary.json");
  const findings = [];
  const manifest = await readJson(manifestPath, findings);
  const summary = await readJson(summaryPath, findings);
  if (!manifest || !summary) return verificationResult(bundleDir, findings, 0, 0);

  if (manifest.status !== "pass") pushFinding(findings, "manifest_status", manifestPath);
  if (summary.status !== "pass") pushFinding(findings, "summary_status", summaryPath);
  if (manifest.projectStateInjection !== false) {
    pushFinding(findings, "project_state_injection", manifestPath);
  }
  if (manifest.fixtureProjectLoaded !== false) {
    pushFinding(findings, "fixture_project_loaded", manifestPath);
  }
  if (manifest.uiCreatedProject !== true) pushFinding(findings, "ui_created_project", manifestPath);
  const artifactIdentityFileCount = await validateArtifactIdentity({
    bundleDir,
    manifest,
    summary,
    manifestPath,
    summaryPath,
    findings,
  });

  let fileCount = 2 + artifactIdentityFileCount;
  await scanTextFile(manifestPath, findings);
  await scanTextFile(summaryPath, findings);
  fileCount += await validateRecording(manifest, findings);

  const interactions = Array.isArray(manifest.interactions) ? manifest.interactions : [];
  for (const interaction of interactions) {
    fileCount += await validateInteraction(interaction, findings);
  }
  return verificationResult(bundleDir, findings, interactions.length, fileCount);
}

export async function writeProductionE2eVerification(bundleDir) {
  const verification = await validateProductionE2eBundle(bundleDir);
  await writeFile(
    path.join(bundleDir, "verification.json"),
    `${JSON.stringify(verification, null, 2)}\n`,
  );
  return verification;
}

async function validateArtifactIdentity({
  bundleDir,
  manifest,
  summary,
  manifestPath,
  summaryPath,
  findings,
}) {
  const manifestIdentity = manifest.artifactIdentity ?? null;
  const summaryIdentity = summary.artifactIdentity ?? null;
  if (!identitiesMatch(manifestIdentity, summaryIdentity)) {
    pushFinding(findings, "artifact_identity_mismatch", manifestPath, summaryPath);
  }
  if (manifest.packagedCandidate !== true) return 0;
  if (!manifestIdentity || typeof manifestIdentity !== "object") {
    pushFinding(findings, "missing_packaged_artifact_identity", manifestPath);
    return 0;
  }
  if (!manifestIdentity.dmgPath) {
    pushFinding(findings, "missing_packaged_dmg_path", "artifactIdentity.dmgPath");
  }
  if (!isSha256(manifestIdentity.dmgSha256)) {
    pushFinding(findings, "missing_packaged_dmg_sha256", "artifactIdentity.dmgSha256");
  }
  return validateReleaseManifestIdentity(bundleDir, manifestIdentity, findings);
}

function identitiesMatch(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

async function validateReleaseManifestIdentity(bundleDir, identity, findings) {
  const releaseManifestPath = identity.releaseManifestPath;
  if (!releaseManifestPath) {
    pushFinding(
      findings,
      "missing_packaged_release_manifest_path",
      "artifactIdentity.releaseManifestPath",
    );
    return 0;
  }
  const resolvedPath = resolveEvidencePath(bundleDir, releaseManifestPath);
  if (!(await fileExists(resolvedPath))) {
    pushFinding(findings, "missing_release_manifest_file", releaseManifestPath);
    return 0;
  }
  await scanTextFile(resolvedPath, findings);
  let releaseManifest;
  try {
    releaseManifest = JSON.parse(await readFile(resolvedPath, "utf8"));
  } catch (error) {
    pushFinding(
      findings,
      "invalid_release_manifest_json",
      releaseManifestPath,
      error instanceof Error ? error.message : String(error),
    );
    return 1;
  }
  const manifestDmgSha256 = releaseManifest.artifactIdentity?.dmgSha256;
  if (!isSha256(manifestDmgSha256)) {
    pushFinding(
      findings,
      "release_manifest_missing_dmg_sha256",
      `${releaseManifestPath}:artifactIdentity.dmgSha256`,
    );
    return 1;
  }
  if (manifestDmgSha256 !== identity.dmgSha256) {
    pushFinding(
      findings,
      "release_manifest_dmg_sha256_mismatch",
      `${releaseManifestPath}:artifactIdentity.dmgSha256`,
      `${manifestDmgSha256} != ${identity.dmgSha256}`,
    );
  }
  return 1;
}

function resolveEvidencePath(bundleDir, filePath) {
  if (path.isAbsolute(filePath)) return filePath;
  return path.resolve(bundleDir, filePath);
}

async function validateInteraction(interaction, findings) {
  let fileCount = 0;
  for (const [key, expectedBasename] of REQUIRED_FILE_KEYWORDS) {
    const filePath = interaction.files?.[key];
    if (typeof filePath !== "string") {
      pushFinding(findings, "missing_interaction_file_reference", interaction.id ?? "unknown", key);
      continue;
    }
    if (path.basename(filePath) !== expectedBasename) {
      pushFinding(findings, "unexpected_interaction_file_name", filePath, expectedBasename);
    }
    if (!(await fileExists(filePath))) {
      pushFinding(findings, "missing_interaction_file", filePath);
      continue;
    }
    fileCount += 1;
    if (TEXT_FILE_KEYS.includes(key)) await scanTextFile(filePath, findings);
  }
  return fileCount;
}

async function validateRecording(manifest, findings) {
  if (typeof manifest.recordingPath !== "string") {
    pushFinding(findings, "missing_recording_reference", "manifest.json");
    return 0;
  }
  if (!(await fileExists(manifest.recordingPath))) {
    pushFinding(findings, "missing_recording_file", manifest.recordingPath);
    return 0;
  }
  return 1;
}

async function scanTextFile(filePath, findings) {
  const text = await readFile(filePath, "utf8");
  for (const { code, pattern } of secretPatterns()) {
    if (pattern.test(text)) pushFinding(findings, code, filePath);
  }
}

async function readJson(filePath, findings) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    pushFinding(
      findings,
      "invalid_json",
      filePath,
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}

async function fileExists(filePath) {
  try {
    const info = await stat(filePath);
    return info.isFile();
  } catch {
    return false;
  }
}

function verificationResult(bundleDir, findings, interactionCount, checkedFileCount) {
  return {
    ok: findings.length === 0,
    bundleDir,
    checkedAt: new Date().toISOString(),
    interactionCount,
    checkedFileCount,
    findings,
  };
}

function pushFinding(findings, code, filePath, detail = "") {
  findings.push({ code, filePath, detail });
}

function secretPatterns() {
  return [
    { code: "unredacted_bearer_token", pattern: /Bearer\s+(?!\[REDACTED\])[A-Za-z0-9._-]{20,}/ },
    { code: "unredacted_openai_key", pattern: /sk-(?!\[REDACTED\])[A-Za-z0-9_-]{16,}/ },
    {
      code: "unredacted_api_key",
      pattern: /\b[A-Z0-9_]*API_KEY\s*=\s*(?!\[REDACTED\])\S+/i,
    },
  ];
}
