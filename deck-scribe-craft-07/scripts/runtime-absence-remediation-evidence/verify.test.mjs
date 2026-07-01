import { describe, expect, test } from "bun:test";
import { verifyRuntimeAbsenceRemediationEvidence } from "./verify.mjs";

describe("runtime absence remediation evidence", () => {
  test("proves missing-runtime remediation is visible and live actions stay locked", async () => {
    const verification = await verifyRuntimeAbsenceRemediationEvidence({
      checkedAt: "2026-06-25T12:00:00.000Z",
    });

    expect(verification.ok).toBe(true);
    expect(verification.status).toBe("pass");
    expect(verification.supportedRange).toEqual({
      minInclusive: "1.0.0",
      maxExclusive: "2.0.0",
    });
    expect(verification.checks.map((check) => check.key).sort()).toEqual([
      "install_remediation_present",
      "live_text_action_locked_without_runtime_bridge",
      "missing_cli_user_copy_visible",
      "no_mock_fallback_in_runtime_absence_ui",
      "permission_remediation_present",
      "runtime_status_missing",
      "supported_runtime_range_visible",
    ]);
    expect(verification.checks.every((check) => check.ok)).toBe(true);
  });
});
