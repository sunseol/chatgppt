import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { validateObjectGraphRoundTrip, verifyObjectGraph } from "./object-graph.mjs";

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const ALLOWED_OPERATOR_TYPES = new Set(["human", "external-qa"]);

export async function verifyPowerPointRoundTripManifest(manifestPath, options = {}) {
  const findings = [];
  const verification = {
    schemaVersion: 1,
    ok: false,
    status: "blocked",
    checkedAt: new Date().toISOString(),
    manifestPath,
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

  const manifestDir = path.dirname(absoluteManifestPath);
  verification.manifestPath = absoluteManifestPath;
  validateManifestShape(manifest, findings, options);

  const beforePptx = await verifyReferencedFile({
    manifest,
    manifestDir,
    pathField: "pptxPath",
    hashField: "pptxSha256",
    extension: ".pptx",
    findings,
  });
  const afterPptx = await verifyReferencedFile({
    manifest,
    manifestDir,
    pathField: "roundTrippedPptxPath",
    hashField: "roundTrippedPptxSha256",
    extension: ".pptx",
    findings,
  });
  const beforeGraph = await verifyObjectGraph({
    manifest,
    manifestDir,
    pathField: "beforeObjectGraphPath",
  });
  findings.push(...beforeGraph.findings);
  const afterGraph = await verifyObjectGraph({
    manifest,
    manifestDir,
    pathField: "afterObjectGraphPath",
  });
  findings.push(...afterGraph.findings);

  verification.checkedFileCount = [beforePptx, afterPptx, beforeGraph, afterGraph].filter(
    (entry) => entry.checked,
  ).length;
  verification.sourceDmgSha256 = manifest.sourceDmgSha256 ?? null;
  verification.pptxSha256 = beforePptx.actualHash ?? null;
  verification.roundTrippedPptxSha256 = afterPptx.actualHash ?? null;

  validateRoundTripHashes(beforePptx, afterPptx, findings);
  findings.push(...validateObjectGraphRoundTrip({ beforeGraph, afterGraph, manifest }));

  verification.ok = findings.length === 0;
  verification.status = verification.ok ? "pass" : "blocked";
  return verification;
}

function validateManifestShape(manifest, findings, options) {
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
  if (!nonEmptyString(manifest.powerPointVersion)) {
    pushFinding(findings, "missing_powerpoint_version", "powerPointVersion");
  }
  validateTimestamps(manifest, findings);
  validateEditProof(manifest, findings);
  validateOperator(manifest.operator, findings);
}

function validateTimestamps(manifest, findings) {
  const openedAt = validateTimestamp(manifest.openedAt, "openedAt", findings);
  const editedAt = validateTimestamp(manifest.editedAt, "editedAt", findings);
  const savedAt = validateTimestamp(manifest.savedAt, "savedAt", findings);
  if (openedAt && editedAt && openedAt > editedAt) {
    pushFinding(findings, "timestamp_order_invalid", "editedAt", "editedAt before openedAt");
  }
  if (editedAt && savedAt && editedAt > savedAt) {
    pushFinding(findings, "timestamp_order_invalid", "savedAt", "savedAt before editedAt");
  }
}

function validateTimestamp(value, field, findings) {
  if (!nonEmptyString(value)) {
    pushFinding(findings, "missing_timestamp", field);
    return null;
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    pushFinding(findings, "invalid_timestamp", field);
    return null;
  }
  return parsed;
}

function validateEditProof(manifest, findings) {
  for (const field of ["editedSlideId", "editedObjectId", "editDescription"]) {
    if (!nonEmptyString(manifest[field])) {
      pushFinding(findings, "missing_edit_proof", field);
    }
  }
}

function validateOperator(operator, findings) {
  if (!operator || typeof operator !== "object") {
    pushFinding(findings, "missing_operator", "operator");
    return;
  }
  if (!ALLOWED_OPERATOR_TYPES.has(operator.type)) {
    pushFinding(findings, "invalid_operator_type", "operator.type", operator.type ?? "missing");
  }
  if (!nonEmptyString(operator.name)) {
    pushFinding(findings, "missing_operator_name", "operator.name");
  }
}

async function verifyReferencedFile({
  manifest,
  manifestDir,
  pathField,
  hashField,
  extension,
  findings,
}) {
  const result = { checked: false, actualHash: null, absolutePath: null };
  const filePath = manifest[pathField];
  if (!nonEmptyString(filePath)) {
    pushFinding(findings, "missing_file_path", pathField);
    return result;
  }
  if (path.extname(filePath).toLowerCase() !== extension) {
    pushFinding(findings, "invalid_file_extension", pathField, path.extname(filePath));
  }
  if (!isSha256(manifest[hashField])) {
    pushFinding(findings, "missing_file_hash", hashField);
  }
  const absolutePath = resolveManifestPath(manifestDir, filePath);
  result.absolutePath = absolutePath;
  let bytes;
  try {
    const info = await stat(absolutePath);
    if (!info.isFile()) {
      pushFinding(findings, "referenced_path_not_file", pathField);
      return result;
    }
    bytes = await readFile(absolutePath);
  } catch {
    pushFinding(findings, "missing_referenced_file", pathField, filePath);
    return result;
  }
  result.checked = true;
  result.actualHash = createHash("sha256").update(bytes).digest("hex");
  if (isSha256(manifest[hashField]) && manifest[hashField] !== result.actualHash) {
    pushFinding(findings, "file_hash_mismatch", hashField);
  }
  return result;
}

function validateRoundTripHashes(beforePptx, afterPptx, findings) {
  if (
    beforePptx.actualHash &&
    afterPptx.actualHash &&
    beforePptx.actualHash === afterPptx.actualHash
  ) {
    pushFinding(findings, "round_trip_artifact_unchanged", "roundTrippedPptxSha256");
  }
}

function resolveManifestPath(manifestDir, filePath) {
  return path.isAbsolute(filePath) ? filePath : path.resolve(manifestDir, filePath);
}

function isSha256(value) {
  return typeof value === "string" && SHA256_PATTERN.test(value);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function pushFinding(findings, code, findingPath, detail = "") {
  findings.push({ code, path: findingPath, detail });
}
