import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { produceDf244PackagedUsageEvidence } from "./df244-packaged-usage-evidence-producer";
import {
  buildDf244PackagedUsageInputFromProductSmoke,
  parseDf244ConfirmationRecordJson,
  parseDf244ProductRunSummaryJson,
  parseDf244ProductUsageSummaryJson,
} from "./df244-product-smoke-packaged-usage-ingestion";

const PACKAGE_SHA = "e6ed0e25791dd51a1c206247bd0faf5a1010aaee6c7b16e7256dfd25f74f47f6";
const PRODUCT_RUN_SUMMARY_PATH =
  "docs/live-evidence/codex-image/df244-generate-export-smoke-20260622/summary.json";
const USAGE_SUMMARY_PATH =
  "docs/live-evidence/codex-image/df244-generate-export-usage-summary-20260622.json";

describe("DF-244 product smoke packaged usage ingestion", () => {
  test("turns same-job product usage confirmation into a blocked packaged candidate", () => {
    // Given
    const productRunSummary = parseDf244ProductRunSummaryJson(
      readFileSync(PRODUCT_RUN_SUMMARY_PATH, "utf8"),
    );
    const usageSummary = parseDf244ProductUsageSummaryJson(
      readFileSync(USAGE_SUMMARY_PATH, "utf8"),
    );

    // When
    const input = buildDf244PackagedUsageInputFromProductSmoke({
      packageArchiveSha256: PACKAGE_SHA,
      productRunSummary,
      usageSummary,
      confirmationRecord: parseDf244ConfirmationRecordJson(
        readFileSync(usageSummary.confirmationRecordPath, "utf8"),
      ),
    });
    const evidence = produceDf244PackagedUsageEvidence(input);

    // Then
    expect(evidence.usageValidation).toEqual({ kind: "ready" });
    expect(evidence.status).toBe("blocked");
    expect(evidence.releaseBlockers).toEqual([
      "DF-244 product run was not captured from the packaged app surface",
      "DF-244 confirmation record was not copied into committed evidence bundle",
      "DF-244 packaged image artifact path is not committed evidence",
    ]);
  });
});
