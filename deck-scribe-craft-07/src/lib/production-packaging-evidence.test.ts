import { describe, expect, test } from "bun:test";
import {
  CLEAN_MACHINE_STEPS,
  evaluateProductionPackagingEvidence,
  formatProductionPackagingEvidenceSummary,
  type ProductionPackagingEvidence,
} from "./production-packaging-evidence";

describe("production packaging evidence", () => {
  test("passes clean production package evidence with clean-machine runbook coverage", () => {
    // Given
    const evidence = completeEvidence();

    // When
    const result = evaluateProductionPackagingEvidence(evidence);

    // Then
    expect(result).toEqual({ kind: "ready" });
  });

  test("summarizes package path, content scan, runtime remediation, and clean-machine steps", () => {
    // Given
    const evidence = completeEvidence();

    // When
    const summary = formatProductionPackagingEvidenceSummary(evidence);

    // Then
    expect(summary.includes("DF-245 Production Packaging")).toBe(true);
    expect(summary.includes("dist/deckforge-macos-dry-run.tgz")).toBe(true);
    expect(
      summary.includes("Native macOS bundle: release-artifacts/DeckForge_0.1.0_aarch64.dmg"),
    ).toBe(true);
    expect(
      summary.includes(
        "macOS release trust: developer_id | TEAMID1234 | notarized | stapled | gatekeeper-accepted",
      ),
    ).toBe(true);
    expect(summary.includes("content scan: passed")).toBe(true);
    expect(summary.includes("runtime absence remediation: present")).toBe(true);
  });

  test("blocks missing package, content contamination, runbook gaps, and missing remediation", () => {
    // Given
    const evidence = completeEvidence({
      packagePath: "",
      packageSha256: "",
      nativeMacosBundlePath: "",
      nativeMacosBundleSha256: "",
      productionMode: false,
      contentScan: {
        mockResourceHits: ["mock-provider"],
        fixtureHits: ["fixtures/example.json"],
        secretHits: ["OPENAI_API_KEY"],
        testFileHits: ["src/lib/foo.test.ts"],
        localPathHits: ["/Users/jake/chatgppt/deck-scribe-craft-07/src/routes/__root.tsx"],
      },
      cleanMachineSteps: ["install_app", "codex_login"],
      runtimeAbsenceRemediationShown: false,
      runbookPath: "",
    });

    // When
    const result = evaluateProductionPackagingEvidence(evidence);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "missing_production_package",
      "missing_package_hash",
      "missing_native_macos_bundle",
      "package_not_production_mode",
      "package_content_contaminated",
      "missing_clean_machine_step",
      "missing_runtime_absence_remediation",
      "missing_clean_machine_runbook",
    ]);
  });

  test("blocks local developer path leakage in package content", () => {
    // Given
    const evidence = {
      ...completeEvidence(),
      contentScan: {
        mockResourceHits: [],
        fixtureHits: [],
        secretHits: [],
        testFileHits: [],
        localPathHits: ["/Users/jake/chatgppt/deck-scribe-craft-07/src/routes/__root.tsx"],
      },
    };

    // When
    const result = evaluateProductionPackagingEvidence(evidence);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["package_content_contaminated"]);
    expect(result.issues[0]?.refs).toEqual([
      "/Users/jake/chatgppt/deck-scribe-craft-07/src/routes/__root.tsx",
    ]);
  });

  test("blocks native macOS release trust evidence that is unsigned or unnotarized", () => {
    // Given
    const evidence = completeEvidence({
      nativeMacosReleaseTrust: {
        signature: "adhoc",
        teamIdentifier: "",
        notarized: false,
        stapled: false,
        gatekeeperAccepted: false,
      },
    });

    // When
    const result = evaluateProductionPackagingEvidence(evidence);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "missing_developer_id_signature",
      "missing_notarization",
      "missing_gatekeeper_acceptance",
    ]);
  });
});

function completeEvidence(
  patch: Partial<ProductionPackagingEvidence> = {},
): ProductionPackagingEvidence {
  return {
    packagePath: "dist/deckforge-macos-dry-run.tgz",
    packageSha256: "3c15121b7fd11559b98c4ba751ccdac89a9990a669b7612e95b3cdfd94d0edf3",
    nativeMacosBundlePath: "release-artifacts/DeckForge_0.1.0_aarch64.dmg",
    nativeMacosBundleSha256: "ad8b11dee61a15c193fabfc3a7bf85110b116db65098bd2a845c2533a25dae5d",
    nativeMacosReleaseTrust: {
      signature: "developer_id",
      teamIdentifier: "TEAMID1234",
      notarized: true,
      stapled: true,
      gatekeeperAccepted: true,
    },
    productionMode: true,
    contentScan: {
      mockResourceHits: [],
      fixtureHits: [],
      secretHits: [],
      testFileHits: [],
      localPathHits: [],
    },
    cleanMachineSteps: CLEAN_MACHINE_STEPS,
    runtimeAbsenceRemediationShown: true,
    runbookPath: "docs/production-clean-machine-runbook.md",
    ...patch,
  };
}
