import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const GOLDEN_PATH_E2E_DOC = new URL("../../docs/live-golden-path-e2e.md", import.meta.url);

describe("live golden path E2E documentation", () => {
  test("records the Live Golden Path E2E evidence contract", () => {
    const goldenPathE2E = readFileSync(GOLDEN_PATH_E2E_DOC, "utf8");

    expect(goldenPathE2E.includes("DF-241")).toBe(true);
    expect(goldenPathE2E.includes("live_e2e_report.md")).toBe(true);
    expect(goldenPathE2E.includes("missing_e2e_step")).toBe(true);
    expect(goldenPathE2E.includes("e2e_step_order_mismatch")).toBe(true);
    expect(goldenPathE2E.includes("canonical step order")).toBe(true);
    expect(goldenPathE2E.includes("report_digest_mismatch")).toBe(true);
    expect(goldenPathE2E.includes("parseable `signedAt` timestamp")).toBe(true);
    expect(goldenPathE2E.includes("live-golden-path-report-signature-timestamp.test.ts")).toBe(
      true,
    );
    expect(goldenPathE2E.includes("missing_step_screenshot")).toBe(true);
    expect(goldenPathE2E.includes("validation_bundle_report_digest_mismatch")).toBe(true);
    expect(goldenPathE2E.includes("validation_bundle_missing_image_artifact")).toBe(true);
    expect(goldenPathE2E.includes("validation_bundle_duplicate_reference")).toBe(true);
    expect(goldenPathE2E.includes("validation_bundle_unexpected_reference")).toBe(true);
    expect(goldenPathE2E.includes("missing_live_text_artifact")).toBe(true);
    expect(goldenPathE2E.includes("live-golden-path-text-lineage.test.ts")).toBe(true);
    expect(
      goldenPathE2E.includes("live-golden-path-validation-bundle-extra-reference.test.ts"),
    ).toBe(true);
    expect(goldenPathE2E.includes("observed, non-synthetic, non-local `live_e2e_report.md`")).toBe(
      true,
    );
    expect(goldenPathE2E.includes("observed, non-synthetic, non-local evidence paths")).toBe(true);
    expect(
      goldenPathE2E.includes("observed, non-synthetic, non-local `.zip` or `.json` path"),
    ).toBe(true);
    expect(goldenPathE2E.includes("synthetic, developer-local, and template/sample")).toBe(true);
    expect(goldenPathE2E.includes("live-golden-path-template-evidence.test.ts")).toBe(true);
    expect(goldenPathE2E.includes("insufficient_live_sources")).toBe(true);
    expect(goldenPathE2E.includes("placeholder/reserved/local/private source URL rejection")).toBe(
      true,
    );
    expect(goldenPathE2E.includes("normalized source URL duplicate rejection")).toBe(true);
    expect(goldenPathE2E.includes("live-golden-path-source-url-evidence.test.ts")).toBe(true);
    expect(goldenPathE2E.includes("api_key")).toBe(true);
    expect(goldenPathE2E.includes("model/runtime")).toBe(true);
    expect(goldenPathE2E.includes("prompt version")).toBe(true);
    expect(goldenPathE2E.includes("nonblank live image artifact ids")).toBe(true);
    expect(goldenPathE2E.includes("live-golden-path-image-model-evidence.test.ts")).toBe(true);
    expect(goldenPathE2E.includes("blank image artifact id rejection")).toBe(true);
    expect(goldenPathE2E.includes("insufficient_live_image_artifacts")).toBe(true);
    expect(goldenPathE2E.includes("missing_regenerated_live_image_artifact")).toBe(true);
    expect(goldenPathE2E.includes("five initial images")).toBe(true);
    expect(goldenPathE2E.includes("live-golden-path-regeneration-image.test.ts")).toBe(true);
    expect(goldenPathE2E.includes("missing_restart_reopen_evidence")).toBe(true);
  });
});
