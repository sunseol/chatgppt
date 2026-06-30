import { describe, expect, test } from "bun:test";
import { finalizeGatekeeperMountCleanup } from "./cleanup.mjs";

describe("Gatekeeper assessment cleanup", () => {
  test("records cleanup warnings instead of masking Gatekeeper evidence when mount removal is busy", () => {
    const verification = {
      ok: false,
      status: "blocked",
      checks: {
        dmgGatekeeper: {
          ok: false,
          stderr: "rejected\nsource=no usable signature",
        },
      },
    };
    const detachCalls = [];
    const busyError = Object.assign(new Error("resource busy or locked"), { code: "EBUSY" });

    expect(() =>
      finalizeGatekeeperMountCleanup({
        verification,
        attachedByScript: true,
        mountDir: "/tmp/deckforge-gatekeeper-assessment-test",
        run(command, args) {
          detachCalls.push([command, args]);
          return { status: 0, stdout: "", stderr: "" };
        },
        removeMountDir() {
          throw busyError;
        },
      }),
    ).not.toThrow();

    expect(detachCalls).toEqual([
      ["hdiutil", ["detach", "/tmp/deckforge-gatekeeper-assessment-test"]],
    ]);
    expect(verification.status).toBe("blocked");
    expect(verification.checks.dmgGatekeeper.stderr).toContain("no usable signature");
    expect(verification.checks.cleanup).toEqual({
      ok: false,
      detach: { ok: true, status: 0, stdout: "", stderr: "" },
      remove: {
        ok: false,
        code: "EBUSY",
        message: "resource busy or locked",
      },
    });
  });
});
