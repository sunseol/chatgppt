import { describe, expect, test } from "bun:test";
import {
  evaluateProductionPackagingEvidence,
  formatProductionPackagingEvidenceSummary,
} from "./production-packaging-evidence";
import {
  completeProductionPackagingEvidence,
  VALID_RELEASE_TRUST_EVIDENCE_PATH,
} from "./production-packaging-test-fixtures";

describe("production packaging evidence", () => {
  test("passes clean production package evidence with clean-machine runbook coverage", () => {
    // Given
    const evidence = completeProductionPackagingEvidence();

    // When
    const result = evaluateProductionPackagingEvidence(evidence);

    // Then
    expect(result).toEqual({ kind: "ready" });
  });

  test("summarizes package path, content scan, runtime remediation, and clean-machine steps", () => {
    // Given
    const evidence = completeProductionPackagingEvidence();

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
    const evidence = completeProductionPackagingEvidence({
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
      ...completeProductionPackagingEvidence(),
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

  test("blocks package artifact, native bundle, and runbook file URL evidence paths", () => {
    // Given
    const evidence = completeProductionPackagingEvidence({
      packagePath: "file:///Users/jake/chatgppt/dist/deckforge-macos-dry-run.tgz",
      nativeMacosBundlePath: "file:///Users/jake/chatgppt/release-artifacts/DeckForge.dmg",
      runbookPath: "file:///Users/jake/chatgppt/docs/production-clean-machine-runbook.md",
    });

    // When
    const result = evaluateProductionPackagingEvidence(evidence);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "missing_production_package",
      "missing_native_macos_bundle",
      "missing_clean_machine_runbook",
    ]);
  });

  test("blocks non-canonical clean-machine runbook paths", () => {
    // Given
    const evidence = completeProductionPackagingEvidence({
      runbookPath: "release-evidence/production-clean-machine-runbook.md",
    });

    // When
    const result = evaluateProductionPackagingEvidence(evidence);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["missing_clean_machine_runbook"]);
  });

  test("blocks native macOS release trust evidence that is unsigned or unnotarized", () => {
    // Given
    const evidence = completeProductionPackagingEvidence({
      nativeMacosReleaseTrust: {
        signature: "adhoc",
        teamIdentifier: "",
        notarized: false,
        stapled: false,
        gatekeeperAccepted: false,
        releaseTrustEvidencePath: VALID_RELEASE_TRUST_EVIDENCE_PATH,
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

  test("blocks Developer ID trust evidence with a placeholder TeamIdentifier", () => {
    // Given
    const evidence = completeProductionPackagingEvidence({
      nativeMacosReleaseTrust: {
        signature: "developer_id",
        teamIdentifier: "not set",
        notarized: true,
        stapled: true,
        gatekeeperAccepted: true,
        releaseTrustEvidencePath: VALID_RELEASE_TRUST_EVIDENCE_PATH,
      },
    });

    // When
    const result = evaluateProductionPackagingEvidence(evidence);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["missing_developer_id_signature"]);
    expect(result.issues[0]?.refs).toEqual(["developer_id", "not set"]);
  });

  test("blocks Developer ID TeamIdentifier evidence that only becomes valid after trimming", () => {
    // Given
    const evidence = completeProductionPackagingEvidence({
      nativeMacosReleaseTrust: {
        signature: "developer_id",
        teamIdentifier: " TEAMID1234 ",
        notarized: true,
        stapled: true,
        gatekeeperAccepted: true,
        releaseTrustEvidencePath: VALID_RELEASE_TRUST_EVIDENCE_PATH,
      },
    });

    // When
    const result = evaluateProductionPackagingEvidence(evidence);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["missing_developer_id_signature"]);
  });

  test("blocks release trust claims without persisted assessment evidence", () => {
    // Given
    const evidence = completeProductionPackagingEvidence({
      nativeMacosReleaseTrust: {
        signature: "developer_id",
        teamIdentifier: "TEAMID1234",
        notarized: true,
        stapled: true,
        gatekeeperAccepted: true,
        releaseTrustEvidencePath: "test-fixtures/release-trust.json",
      },
    });

    // When
    const result = evaluateProductionPackagingEvidence(evidence);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["missing_release_trust_evidence"]);
  });

  test("blocks release trust claims backed only by developer-local assessment evidence", () => {
    // Given
    const evidence = completeProductionPackagingEvidence({
      nativeMacosReleaseTrust: {
        signature: "developer_id",
        teamIdentifier: "TEAMID1234",
        notarized: true,
        stapled: true,
        gatekeeperAccepted: true,
        releaseTrustEvidencePath: "/Users/jake/chatgppt/release-evidence/macos-release-trust.json",
      },
    });

    // When
    const result = evaluateProductionPackagingEvidence(evidence);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["missing_release_trust_evidence"]);
  });

  test("blocks release trust evidence paths that rely on boundary whitespace", () => {
    // Given
    const evidence = completeProductionPackagingEvidence({
      nativeMacosReleaseTrust: {
        signature: "developer_id",
        teamIdentifier: "TEAMID1234",
        notarized: true,
        stapled: true,
        gatekeeperAccepted: true,
        releaseTrustEvidencePath: ` ${VALID_RELEASE_TRUST_EVIDENCE_PATH} `,
      },
    });

    // When
    const result = evaluateProductionPackagingEvidence(evidence);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["missing_release_trust_evidence"]);
  });

  test("blocks release trust evidence paths that are not release-trust bundles", () => {
    // Given
    const evidence = completeProductionPackagingEvidence({
      nativeMacosReleaseTrust: {
        signature: "developer_id",
        teamIdentifier: "TEAMID1234",
        notarized: true,
        stapled: true,
        gatekeeperAccepted: true,
        releaseTrustEvidencePath: "release-evidence/notarization-notes.json",
      },
    });

    // When
    const result = evaluateProductionPackagingEvidence(evidence);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["missing_release_trust_evidence"]);
  });

  test("blocks generic release trust bundle paths without assessment markers", () => {
    // Given
    const evidence = completeProductionPackagingEvidence({
      nativeMacosReleaseTrust: {
        signature: "developer_id",
        teamIdentifier: "TEAMID1234",
        notarized: true,
        stapled: true,
        gatekeeperAccepted: true,
        releaseTrustEvidencePath: "release-evidence/macos-release-trust.json",
      },
    });

    // When
    const result = evaluateProductionPackagingEvidence(evidence);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["missing_release_trust_evidence"]);
  });
});
