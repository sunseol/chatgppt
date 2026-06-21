import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const CONFIRMATION_TYPE = "deckforge_live_image_billing_confirmation";
const CONFIRMATION_FILENAME = "image-billing-confirmation.json";
const CONFIRMED_USER_CONFIRMATION = "confirmed_app_surface_pre_generation_codex_oauth";
const MISSING_USER_CONFIRMATION = "missing_app_surface_pre_generation_confirmation";
const CONFIRMATION_LABEL = "Codex image usage confirmed";
const BILLING_OWNER = "codex_oauth_account";
const SAFE_SEGMENT = /^[a-zA-Z0-9_-]+$/;
const FORBIDDEN_SEGMENTS = new Set(["unknown"]);
const SYNTHETIC_MARKERS = ["template", "sample", "example", "placeholder"];

export async function resolveLaneDImageBillingConfirmation(input = {}) {
  const workspaceRoot = input.workspaceRoot ?? ".";
  const candidates = await confirmationCandidatePaths(workspaceRoot, input.projectIds ?? []);
  for (const candidatePath of candidates) {
    const record = await readConfirmationRecord(candidatePath);
    const summary = confirmationSummary(record, workspaceRoot, candidatePath);
    if (summary !== undefined) return { kind: "confirmed", summary };
  }
  return missingConfirmation();
}

function missingConfirmation() {
  return {
    kind: "missing",
    summary: { userConfirmation: MISSING_USER_CONFIRMATION },
  };
}

async function confirmationCandidatePaths(workspaceRoot, projectIds) {
  const searchRoots = [
    ...projectIds.map((projectId) => join(workspaceRoot, "projects", projectId, "usage")),
    join(workspaceRoot, "usage"),
  ];
  const nestedCandidates = await Promise.all(searchRoots.map(listConfirmationFiles));
  return nestedCandidates.flat().sort();
}

async function listConfirmationFiles(root) {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    const nested = await Promise.all(
      entries.map(async (entry) => {
        const entryPath = join(root, entry.name);
        if (entry.isDirectory()) return listConfirmationFiles(entryPath);
        return entry.isFile() && entry.name === CONFIRMATION_FILENAME ? [entryPath] : [];
      }),
    );
    return nested.flat();
  } catch (error) {
    if (error instanceof Error && error.code === "ENOENT") return [];
    throw error;
  }
}

async function readConfirmationRecord(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error instanceof Error) return undefined;
    throw error;
  }
}

function confirmationSummary(record, workspaceRoot, recordPath) {
  if (!isValidConfirmationRecord(record)) return undefined;
  const productPath = productEvidencePath(recordPath);
  if (record.evidencePath !== productPath) return undefined;
  const recordRelativePath = relative(workspaceRoot, recordPath).split(sep).join("/");
  return {
    userConfirmation: CONFIRMED_USER_CONFIRMATION,
    confirmationEvidencePath: record.evidencePath,
    confirmationRecordPath: recordRelativePath,
    confirmationLabel: record.label,
    billingOwner: record.billingOwner,
    confirmedAt: record.confirmedAt,
  };
}

function isValidConfirmationRecord(record) {
  if (record === null || typeof record !== "object") return false;
  return (
    record.type === CONFIRMATION_TYPE &&
    record.version === 1 &&
    record.providerId === "codex" &&
    record.label === CONFIRMATION_LABEL &&
    record.apiKeyRequired === false &&
    record.billingOwner === BILLING_OWNER &&
    Number.isInteger(record.confirmedAt) &&
    record.confirmedAt >= 0 &&
    hasSafeSegment(record.projectId) &&
    hasSafeSegment(record.jobId) &&
    record.evidencePath === `usage/${record.projectId}/${record.jobId}/${CONFIRMATION_FILENAME}`
  );
}

function productEvidencePath(recordPath) {
  const segments = recordPath.split(sep);
  const usageIndex = segments.lastIndexOf("usage");
  return usageIndex === -1 ? undefined : segments.slice(usageIndex).join("/");
}

function hasSafeSegment(value) {
  return (
    typeof value === "string" &&
    SAFE_SEGMENT.test(value) &&
    !FORBIDDEN_SEGMENTS.has(value.toLowerCase()) &&
    !SYNTHETIC_MARKERS.some((marker) => value.toLowerCase().includes(marker))
  );
}
