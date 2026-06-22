import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { parseDf235ReviewEvidenceJson } from "./df235-packaged-review-evidence-schema";
import { produceDf235PackagedReviewEvidence } from "./df235-packaged-review-evidence-producer";
import {
  buildDf235PackagedReviewInputFromProductSmokes,
  parseDf235ApprovalProductSmokeSummaryJson,
  parseDf235FailureProductSmokeSummaryJson,
} from "./df235-product-smoke-packaged-review-ingestion";

const DEFAULT_APPROVAL_SUMMARY_PATH =
  "docs/live-evidence/codex-image/df235-review-approval-evidence-20260622.json";
const DEFAULT_FAILURE_SUMMARY_PATH =
  "docs/live-evidence/codex-image/df235-review-failure-preservation-20260622.json";
const DEFAULT_OUTPUT_PATH =
  "docs/live-evidence/release/df235-product-smoke-packaged-review-candidate-20260622.json";
const DEFAULT_SESSION_ID = "df235_product_review_smoke_20260622";
const DEFAULT_PACKAGE_SHA = "e6ed0e25791dd51a1c206247bd0faf5a1010aaee6c7b16e7256dfd25f74f47f6";

const [
  approvalSummaryPath = DEFAULT_APPROVAL_SUMMARY_PATH,
  failureSummaryPath = DEFAULT_FAILURE_SUMMARY_PATH,
  outputPath = DEFAULT_OUTPUT_PATH,
] = process.argv.slice(2);

const approvalSummary = parseDf235ApprovalProductSmokeSummaryJson(
  await readFile(approvalSummaryPath, "utf8"),
);
const failureSummary = parseDf235FailureProductSmokeSummaryJson(
  await readFile(failureSummaryPath, "utf8"),
);
const input = buildDf235PackagedReviewInputFromProductSmokes({
  packageArchiveSha256: process.env.DF235_PACKAGE_SHA ?? DEFAULT_PACKAGE_SHA,
  sessionId: process.env.DF235_SESSION_ID ?? DEFAULT_SESSION_ID,
  approvalSummary,
  approvalReviewEvidence: parseDf235ReviewEvidenceJson(
    await readFile(approvalSummary.reviewEvidencePath, "utf8"),
  ),
  failureSummary,
  failureReviewEvidence: parseDf235ReviewEvidenceJson(
    await readFile(failureSummary.reviewEvidencePath, "utf8"),
  ),
});
const evidence = produceDf235PackagedReviewEvidence(input);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`${outputPath} ${evidence.status}`);
