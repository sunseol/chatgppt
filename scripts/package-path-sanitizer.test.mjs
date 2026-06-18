import { describe, expect, test } from "bun:test";
import { sanitizePackageBuildText } from "./package-path-sanitizer.mjs";

describe("package path sanitizer", () => {
  test("rewrites workspace absolute paths in generated manifests", () => {
    // Given
    const root = "/Users/jake/chatgppt/deck-scribe-craft-07";
    const manifest = 'filePath: "/Users/jake/chatgppt/deck-scribe-craft-07/src/routes/__root.tsx"';

    // When
    const sanitized = sanitizePackageBuildText(manifest, root);

    // Then
    expect(sanitized).toBe('filePath: "src/routes/__root.tsx"');
    expect(sanitized.includes("/Users/jake")).toBe(false);
  });
});
