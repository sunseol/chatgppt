import { createHash } from "node:crypto";
import { chmodSync, mkdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { createDeterministicTarGzipArchive } from "./package-dry-run.mjs";

describe("package dry-run archive", () => {
  test("creates stable archives when source mtimes change", () => {
    const root = join(tmpdir(), `deckforge-dry-run-${process.pid}-${Date.now()}`);
    const sourceDir = join(root, "source");
    const macosDir = join(sourceDir, "DeckForge.app", "Contents", "MacOS");
    const resourcesDir = join(sourceDir, "DeckForge.app", "Contents", "Resources", "client");
    const archiveA = join(root, "a.tgz");
    const archiveB = join(root, "b.tgz");

    try {
      mkdirSync(macosDir, { recursive: true });
      mkdirSync(resourcesDir, { recursive: true });
      writeFileSync(join(sourceDir, "DeckForge.app", "Contents", "Info.plist"), "<plist />\n");
      writeFileSync(join(macosDir, "deckforge"), "#!/bin/sh\nexit 0\n");
      chmodSync(join(macosDir, "deckforge"), 0o755);
      writeFileSync(join(resourcesDir, "index.html"), "<main>DeckForge</main>\n");
      writeFileSync(join(sourceDir, "README.md"), "# Dry Run\n");

      createDeterministicTarGzipArchive({
        sourceDir,
        archivePath: archiveA,
        entries: ["DeckForge.app", "README.md"],
      });

      utimesSync(
        join(resourcesDir, "index.html"),
        new Date("2030-01-01T00:00:00Z"),
        new Date("2030-01-01T00:00:00Z"),
      );

      createDeterministicTarGzipArchive({
        sourceDir,
        archivePath: archiveB,
        entries: ["DeckForge.app", "README.md"],
      });

      expect(sha256(archiveB)).toBe(sha256(archiveA));
      expect(readFileSync(archiveB).equals(readFileSync(archiveA))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}
