import { describe, expect, test } from "bun:test";
import { completeProductionPackagingEvidence } from "../src/lib/production-packaging-test-fixtures";
import {
  parseDf245ProductionPackagingInput,
  produceDf245ProductionPackagingEvidence,
} from "./df245-production-packaging-evidence-producer";

const CAPTURED_AT = "2026-06-22T07:05:00.000Z";

describe("DF-245 production packaging evidence producer", () => {
  test("produces ready production packaging evidence from a signed clean-machine package bundle", () => {
    // Given
    const packagingEvidence = completeProductionPackagingEvidence();
    const input = parseDf245ProductionPackagingInput({
      capturedAt: CAPTURED_AT,
      packageArchiveSha256: packagingEvidence.packageSha256,
      packagingEvidence,
    });

    // When
    const evidence = produceDf245ProductionPackagingEvidence(input);

    // Then
    expect(evidence.evidenceKind).toBe("df245-production-packaging-evidence");
    expect(evidence.status).toBe("ready");
    expect(evidence.packagingValidation).toEqual({ kind: "ready" });
    expect(evidence.releaseBlockers).toEqual([]);
  });

  test("keeps production packaging evidence blocked for a dry-run package", () => {
    // Given
    const packagingEvidence = completeProductionPackagingEvidence({
      packagePath: "dist/deckforge-macos-dry-run.tgz",
    });
    const input = parseDf245ProductionPackagingInput({
      capturedAt: CAPTURED_AT,
      packageArchiveSha256: packagingEvidence.packageSha256,
      packagingEvidence,
    });

    // When
    const evidence = produceDf245ProductionPackagingEvidence(input);

    // Then
    expect(evidence.status).toBe("blocked");
    expect(evidence.releaseBlockers).toContain("DF-245 production packaging validation is blocked");
  });

  test("keeps production packaging evidence blocked when package hash drifts", () => {
    // Given
    const packagingEvidence = completeProductionPackagingEvidence();
    const input = parseDf245ProductionPackagingInput({
      capturedAt: CAPTURED_AT,
      packageArchiveSha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      packagingEvidence,
    });

    // When
    const evidence = produceDf245ProductionPackagingEvidence(input);

    // Then
    expect(evidence.status).toBe("blocked");
    expect(evidence.releaseBlockers).toContain(
      "DF-245 packaging input package hash does not match the packaging evidence",
    );
  });

  test("rejects malformed production packaging input at the boundary", () => {
    // Given
    const malformedInput = {
      capturedAt: CAPTURED_AT,
    };

    // When / Then
    expect(() => parseDf245ProductionPackagingInput(malformedInput)).toThrow(
      "Invalid DF-245 production packaging input",
    );
  });
});
