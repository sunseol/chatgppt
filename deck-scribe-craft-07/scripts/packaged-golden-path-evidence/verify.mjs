import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { evaluateLiveGoldenPathE2EBundle } from "../../src/lib/live-golden-path-e2e.ts";

const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export async function verifyPackagedGoldenPathEvidence(manifestPath, options = {}) {
  const findings = [];
  const verification = {
    schemaVersion: 1,
    ok: false,
    status: "blocked",
    checkedAt: new Date().toISOString(),
    manifestPath,
    sourceDmgSha256: null,
    completedStepCount: 0,
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
  const bundle = manifest.bundle;
  verification.manifestPath = absoluteManifestPath;
  verification.sourceDmgSha256 = manifest.sourceDmgSha256 ?? null;
  validateManifestEnvelope(manifest, findings, options);
  if (!bundle || typeof bundle !== "object") {
    pushFinding(findings, "missing_bundle", "bundle");
    return verification;
  }

  verification.completedStepCount = Array.isArray(bundle.completedSteps)
    ? bundle.completedSteps.length
    : 0;
  const result = evaluateLiveGoldenPathE2EBundle(bundle);
  if (result.kind === "blocked") {
    findings.push(...result.issues.map(issueToFinding));
  }

  const fileChecks = await verifyReferencedFiles(bundle, manifestDir);
  verification.checkedFileCount = fileChecks.checkedFileCount;
  findings.push(...fileChecks.findings);

  verification.ok = findings.length === 0;
  verification.status = verification.ok ? "pass" : "blocked";
  return verification;
}

function validateManifestEnvelope(manifest, findings, options) {
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

async function verifyReferencedFiles(bundle, manifestDir) {
  const findings = [];
  let checkedFileCount = 0;
  const report = await readTextReference(bundle.reportPath, manifestDir, "bundle.reportPath");
  checkedFileCount += report.checked ? 1 : 0;
  if (report.text !== null && report.text !== bundle.reportContent) {
    pushFinding(findings, "report_file_mismatch", "bundle.reportPath");
  }

  for (const [index, screenshotPath] of (bundle.screenshots ?? []).entries()) {
    const screenshot = await fileExists(screenshotPath, manifestDir, `bundle.screenshots.${index}`);
    checkedFileCount += screenshot.checked ? 1 : 0;
    findings.push(...screenshot.findings);
  }
  const recording = await fileExists(bundle.recordingPath, manifestDir, "bundle.recordingPath");
  checkedFileCount += recording.checked ? 1 : 0;
  findings.push(...recording.findings);

  const validationBundle = await fileExists(
    bundle.finalValidationBundle?.path,
    manifestDir,
    "bundle.finalValidationBundle.path",
  );
  checkedFileCount += validationBundle.checked ? 1 : 0;
  findings.push(...validationBundle.findings, ...report.findings);
  return { checkedFileCount, findings };
}

async function readTextReference(filePath, manifestDir, findingPath) {
  const result = await fileExists(filePath, manifestDir, findingPath);
  if (!result.checked) return { ...result, text: null };
  const absolutePath = resolveManifestPath(manifestDir, filePath);
  return { ...result, text: await readFile(absolutePath, "utf8") };
}

async function fileExists(filePath, manifestDir, findingPath) {
  const findings = [];
  if (typeof filePath !== "string" || filePath.trim().length === 0) {
    pushFinding(findings, "missing_referenced_file", findingPath, "missing");
    return { checked: false, findings };
  }
  const absolutePath = resolveManifestPath(manifestDir, filePath);
  try {
    const info = await stat(absolutePath);
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
    path: "bundle",
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
