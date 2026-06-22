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
  "docs/live-evidence/codex-image/df244-generate-export-smoke-20260622/summary.json";
const DEFAULT_USAGE_SUMMARY_PATH =
  "docs/live-evidence/codex-image/df244-generate-export-usage-summary-20260622.json";
const DEFAULT_OUTPUT_PATH =
  "docs/live-evidence/release/df244-product-smoke-packaged-usage-candidate-20260622.json";
const DEFAULT_PACKAGE_SHA = "bdb64f343b721a435889377d6449d18d537fe27a11ac41be343c481c483688ee";

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
