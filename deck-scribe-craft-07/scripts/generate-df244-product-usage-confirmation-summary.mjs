import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { resolveLaneDImageBillingConfirmation } from "./lane-d-live-usage-confirmation.mjs";

const PROJECT_ID = "df244_generate_export_smoke_20260622";
const PRODUCT_RUN_SUMMARY_PATH =
  "docs/live-evidence/codex-image/df244-generate-export-smoke-20260622/summary.json";
const USAGE_SUMMARY_PATH =
  "docs/live-evidence/codex-image/df244-generate-export-usage-summary-20260622.json";

const productRun = JSON.parse(await readFile(PRODUCT_RUN_SUMMARY_PATH, "utf8"));
const confirmation = await resolveLaneDImageBillingConfirmation({
  workspaceRoot: ".",
  projectIds: [PROJECT_ID],
});

if (confirmation.kind !== "confirmed") {
  throw new Error("Expected product-run Codex OAuth image billing confirmation.");
}

const turn = firstAppServerTurn(productRun);
const imageCount = productRun.slides?.length;
if (imageCount !== 1) throw new Error(`Expected one generated image, got ${String(imageCount)}.`);

await writeJson(USAGE_SUMMARY_PATH, {
  capturedAt: new Date().toISOString(),
  evidenceKind: "df244-product-usage-confirmation-summary",
  projectId: PROJECT_ID,
  providerKind: "codex",
  imageCount,
  totalLatencyMs: turn.durationMs,
  costDisplay: "hidden_provider_did_not_supply_cost",
  productRunSummaryPath: PRODUCT_RUN_SUMMARY_PATH,
  productRunSummarySha256: await sha256File(PRODUCT_RUN_SUMMARY_PATH),
  ...confirmation.summary,
});

console.log(`${USAGE_SUMMARY_PATH} ${await sha256File(USAGE_SUMMARY_PATH)}`);

function firstAppServerTurn(productRun) {
  const turns = productRun.appServerTurns;
  if (!Array.isArray(turns) || turns.length === 0) {
    throw new Error("Expected at least one App Server turn.");
  }
  const turn = turns[0];
  if (turn === null || typeof turn !== "object" || !Number.isFinite(turn.durationMs)) {
    throw new Error("Expected App Server turn with finite duration.");
  }
  return turn;
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function sha256File(path) {
  return createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
}
