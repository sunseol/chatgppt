import { describe, expect, test } from "bun:test";
import { evaluateProductionPackagingEvidence } from "./production-packaging-evidence";
import {
  completeProductionPackagingEvidence,
  productionPackagingEvidencePayloads,
} from "./production-packaging-test-fixtures";

describe("production packaging artifact paths", () => {
  test("blocks transient package and native bundle artifact paths", () => {
    // Given
    const payloads = productionPackagingEvidencePayloads();
    const evidence = completeProductionPackagingEvidence({
      packagePath: "tmp/deckforge-macos-release.tgz",
      nativeMacosBundlePath: "tmp/DeckForge_0.1.0_aarch64.dmg",
      evidencePayloads: {
        ...payloads,
        releaseTrust: {
          ...payloads.releaseTrust,
          packagePath: "tmp/deckforge-macos-release.tgz",
          nativeMacosBundlePath: "tmp/DeckForge_0.1.0_aarch64.dmg",
        },
      },
    });

    // When
    const result = evaluateProductionPackagingEvidence(evidence);

    // Then
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "missing_production_package",
      "missing_native_macos_bundle",
    ]);
  });
});
