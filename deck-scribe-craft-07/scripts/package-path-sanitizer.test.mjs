import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "bun:test";
import { sanitizePackageBuildText } from "./package-path-sanitizer.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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

  test("routes native package builds through the sanitizer", () => {
    const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    const tauriConfig = JSON.parse(readFileSync(join(root, "src-tauri/tauri.conf.json"), "utf8"));

    expect(packageJson.scripts["build:package"]).toContain("scripts/sanitize-package-build.mjs");
    expect(tauriConfig.build.beforeBuildCommand).toBe("bun run build:package");
  });
});
