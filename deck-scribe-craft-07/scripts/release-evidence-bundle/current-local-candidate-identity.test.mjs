import path from "node:path";
import { describe, expect, test } from "bun:test";
import { buildLocalArtifactIdentity } from "./current-local-candidate-identity.mjs";

describe("current local candidate artifact identity", () => {
  test("uses checksum evidence and BUILD_VERSION instead of hardcoded release fields", () => {
    const root = path.resolve("/tmp/deckforge");
    const identity = buildLocalArtifactIdentity({
      root,
      releaseArtifact: {
        dmgPath: path.join(root, "release-artifacts", "DeckForge_0.0.15_aarch64.dmg"),
        actualHash: "a".repeat(64),
      },
      buildVersionText: "0.0.15\n",
      gitHead: "2b9b6915c1b9036733a619abf153c0b258d7d1d8\n",
      gitStatusPorcelain: "",
    });

    expect(identity).toEqual({
      gitCommit: "2b9b6915c1b9036733a619abf153c0b258d7d1d8",
      dirtyWorktree: false,
      version: "0.0.15",
      buildNumber: "15",
      dmgPath: "release-artifacts/DeckForge_0.0.15_aarch64.dmg",
      dmgSha256: "a".repeat(64),
    });
  });

  test("marks dirty candidates when git reports local changes", () => {
    const identity = buildLocalArtifactIdentity({
      root: "/tmp/deckforge",
      releaseArtifact: {
        dmgPath: "release-artifacts/DeckForge_0.0.16_aarch64.dmg",
        actualHash: "b".repeat(64),
      },
      buildVersionText: "",
      gitHead: "abc123\n",
      gitStatusPorcelain: " M src/example.ts\n",
    });

    expect(identity.dirtyWorktree).toBe(true);
    expect(identity.version).toBe("0.0.16");
    expect(identity.buildNumber).toBe("16");
  });

  test("falls back to the expected checksum when the actual hash is unavailable", () => {
    const identity = buildLocalArtifactIdentity({
      root: "/tmp/deckforge",
      releaseArtifact: {
        dmgPath: "release-artifacts/DeckForge_0.0.17_aarch64.dmg",
        expectedHash: "c".repeat(64),
      },
      buildVersionText: "0.0.17",
      gitHead: "",
      gitStatusPorcelain: "",
    });

    expect(identity.gitCommit).toBe("unknown");
    expect(identity.dirtyWorktree).toBe(true);
    expect(identity.dmgSha256).toBe("c".repeat(64));
  });
});
