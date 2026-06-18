import { describe, expect, test } from "bun:test";
import { assessReleaseReadiness } from "./release-readiness";

describe("release readiness", () => {
  test("separates internal dry-run readiness from public macOS blockers", () => {
    const assessments = assessReleaseReadiness({
      hasTauriManifest: true,
      hasRustManifest: true,
      dryRunPackageCreated: true,
      developerIdCertificate: false,
      hardenedRuntime: false,
      notarized: false,
      gatekeeperValidated: false,
      licenseReviewUpdated: true,
    });

    const internal = assessments.find((assessment) => assessment.target === "internal_dry_run");
    const publicMacos = assessments.find((assessment) => assessment.target === "public_macos");

    expect(internal?.status).toBe("ready");
    expect(publicMacos?.status).toBe("blocked");
    expect(publicMacos?.blockers.map((blocker) => blocker.code)).toEqual([
      "missing_developer_id",
      "missing_hardened_runtime",
      "missing_notarization",
      "missing_gatekeeper_validation",
    ]);
    expect(publicMacos?.verificationCommands.includes("bun run tauri:build")).toBe(true);
  });
});
