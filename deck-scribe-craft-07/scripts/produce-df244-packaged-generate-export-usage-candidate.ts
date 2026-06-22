import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { produceDf244PackagedUsageEvidence } from "./df244-packaged-usage-evidence-producer";
import {
  buildDf244PackagedUsageInputFromProductSmoke,
  parseDf244ConfirmationRecordJson,
  parseDf244ProductRunSummaryJson,
  parseDf244ProductUsageSummaryJson,
} from "./df244-product-smoke-packaged-usage-ingestion";

const DEFAULT_PRODUCT_RUN_SUMMARY_PATH =
  "docs/live-evidence/codex-image/df244-packaged-generate-export-smoke-20260622/summary.json";
const DEFAULT_USAGE_SUMMARY_PATH =
  "docs/live-evidence/codex-image/df244-packaged-generate-export-smoke-20260622/usage-summary.json";
const DEFAULT_OUTPUT_PATH =
  "docs/live-evidence/release/df244-packaged-generate-export-usage-candidate-20260622.json";
const DEFAULT_PACKAGE_SHA = "79558b1114d295ddd80fa8068818aeb5bb6b74b4b4b0335981f057824e997163";

const [
  productRunSummaryPath = DEFAULT_PRODUCT_RUN_SUMMARY_PATH,
  usageSummaryPath = DEFAULT_USAGE_SUMMARY_PATH,
  outputPath = DEFAULT_OUTPUT_PATH,
] = process.argv.slice(2);

const productRunSummary = parseDf244ProductRunSummaryJson(
  await readFile(productRunSummaryPath, "utf8"),
);
const usageSummary = parseDf244ProductUsageSummaryJson(await readFile(usageSummaryPath, "utf8"));
const input = buildDf244PackagedUsageInputFromProductSmoke({
  packageArchiveSha256: process.env.DF244_PACKAGE_SHA ?? DEFAULT_PACKAGE_SHA,
  productRunSummary,
  usageSummary,
  confirmationRecord: parseDf244ConfirmationRecordJson(
    await readFile(usageSummary.confirmationRecordPath, "utf8"),
  ),
});
const evidence = produceDf244PackagedUsageEvidence(input);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`${outputPath} ${evidence.status}`);
