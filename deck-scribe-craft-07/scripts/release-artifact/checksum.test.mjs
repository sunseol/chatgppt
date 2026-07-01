import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { parseSha256File, verifyDmgSha256File } from "./checksum.mjs";

describe("release artifact checksum verification", () => {
  test("parses sha256 files that contain release-artifacts relative paths", () => {
    const parsed = parseSha256File(`${"a".repeat(64)}  release-artifacts/DeckForge.dmg\n`);

    expect(parsed.expectedHash).toBe("a".repeat(64));
    expect(parsed.checksumPath).toBe("release-artifacts/DeckForge.dmg");
    expect(parsed.checksumBasename).toBe("DeckForge.dmg");
  });

  test("verifies the checksum by explicit DMG path regardless of process cwd", () => {
    const fixture = createDmgFixture("fixture bytes", "release-artifacts/DeckForge_0.0.0.99.dmg");
    const previousCwd = process.cwd();
    process.chdir(fixture.otherCwd);
    try {
      const verification = verifyDmgSha256File(fixture.dmgPath);

      expect(verification.ok).toBe(true);
      expect(verification.checksumPathEntry).toBe("release-artifacts/DeckForge_0.0.0.99.dmg");
      expect(verification.expectedHash).toBe(verification.actualHash);
    } finally {
      process.chdir(previousCwd);
    }
  });

  test("fails when the checksum file points at a different DMG basename", () => {
    const fixture = createDmgFixture("fixture bytes", "release-artifacts/Other.dmg");

    expect(() => verifyDmgSha256File(fixture.dmgPath)).toThrow("Checksum file points to Other.dmg");
  });
});

function createDmgFixture(contents, checksumPathEntry) {
  const root = mkdtempSync(path.join(os.tmpdir(), "deckforge-release-artifact-"));
  const artifacts = path.join(root, "release-artifacts");
  const otherCwd = path.join(root, "elsewhere");
  mkdirSync(artifacts, { recursive: true });
  mkdirSync(otherCwd, { recursive: true });
  const dmgPath = path.join(artifacts, "DeckForge_0.0.0.99.dmg");
  writeFileSync(dmgPath, contents);
  const digest = createHash("sha256").update(readFileSync(dmgPath)).digest("hex");
  writeFileSync(`${dmgPath}.sha256`, `${digest}  ${checksumPathEntry}\n`);
  return { dmgPath, otherCwd };
}
