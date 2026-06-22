import { describe, expect, test } from "bun:test";
import {
  buildDf245FixedStringPatterns,
  normalizeDf245ScanPathMarker,
} from "./df245-package-recheck-support.mjs";

const OLD_DEVELOPER_WORKSPACE = "/Users/jake/chatgppt-live-product-completion";

describe("DF-245 package recheck support", () => {
  test("derives the local workspace scan marker from the current workspace path", () => {
    // Given
    const workspacePath = "/tmp/release-worker/deck-scribe-craft-07/";

    // When
    const marker = normalizeDf245ScanPathMarker(workspacePath);
    const patterns = buildDf245FixedStringPatterns(workspacePath);

    // Then
    expect(marker).toBe("/tmp/release-worker/deck-scribe-craft-07");
    expect(patterns).toContain(marker);
    expect(patterns).not.toContain(OLD_DEVELOPER_WORKSPACE);
    expect(new Set(patterns).size).toBe(patterns.length);
  });
});
