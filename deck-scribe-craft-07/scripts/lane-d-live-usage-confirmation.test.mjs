import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { resolveLaneDImageBillingConfirmation } from "./lane-d-live-usage-confirmation.mjs";

describe("lane D live usage confirmation evidence", () => {
  test("uses a persisted canonical Codex OAuth billing confirmation record", async () => {
    // Given
    const root = await mkdtemp(join(tmpdir(), "lane-d-confirmation-"));
    const evidencePath =
      "usage/df232_live_codex_batch/job_live_image/image-billing-confirmation.json";
    const recordPath = join(root, "projects/df232_live_codex_batch", evidencePath);
    await mkdir(join(recordPath, ".."), { recursive: true });
    await writeFile(
      recordPath,
      JSON.stringify(
        {
          type: "deckforge_live_image_billing_confirmation",
          version: 1,
          projectId: "df232_live_codex_batch",
          jobId: "job_live_image",
          providerId: "codex",
          evidencePath,
          label: "Codex image usage confirmed",
          apiKeyRequired: false,
          billingOwner: "codex_oauth_account",
          confirmedAt: 1781980800000,
        },
        null,
        2,
      ),
    );

    try {
      // When
      const result = await resolveLaneDImageBillingConfirmation({
        workspaceRoot: root,
        projectIds: ["df232_live_codex_batch"],
      });

      // Then
      expect(result.kind).toBe("confirmed");
      expect(result.summary).toEqual({
        userConfirmation: "confirmed_app_surface_pre_generation_codex_oauth",
        confirmationEvidencePath: evidencePath,
        confirmationRecordPath:
          "projects/df232_live_codex_batch/usage/df232_live_codex_batch/job_live_image/image-billing-confirmation.json",
        confirmationLabel: "Codex image usage confirmed",
        billingOwner: "codex_oauth_account",
        confirmedAt: 1781980800000,
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("keeps usage evidence blocked when the persisted record path is mismatched", async () => {
    // Given
    const root = await mkdtemp(join(tmpdir(), "lane-d-confirmation-"));
    const recordPath = join(
      root,
      "projects/df232_live_codex_batch/usage/df232_live_codex_batch/job_live_image/image-billing-confirmation.json",
    );
    await mkdir(join(recordPath, ".."), { recursive: true });
    await writeFile(
      recordPath,
      JSON.stringify(
        {
          type: "deckforge_live_image_billing_confirmation",
          version: 1,
          projectId: "df232_live_codex_batch",
          jobId: "job_other",
          providerId: "codex",
          evidencePath: "usage/df232_live_codex_batch/job_other/image-billing-confirmation.json",
          label: "Codex image usage confirmed",
          apiKeyRequired: false,
          billingOwner: "codex_oauth_account",
          confirmedAt: 1781980800000,
        },
        null,
        2,
      ),
    );

    try {
      // When
      const result = await resolveLaneDImageBillingConfirmation({
        workspaceRoot: root,
        projectIds: ["df232_live_codex_batch"],
      });

      // Then
      expect(result).toEqual({
        kind: "missing",
        summary: {
          userConfirmation: "missing_app_surface_pre_generation_confirmation",
        },
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
