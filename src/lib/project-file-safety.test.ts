import { describe, expect, test } from "bun:test";
import { mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import {
  acquireProjectLock,
  resolveProjectFilePath,
  writeProjectFileAtomically,
} from "./project-file-safety";

describe("project file safety", () => {
  test("resolves project-local paths and rejects traversal outside the root", async () => {
    await withTempDirectory(async (rootDirectory) => {
      expect(resolveProjectFilePath(rootDirectory, "metadata/project.json")).toEqual({
        kind: "resolved",
        absolutePath: join(rootDirectory, "metadata", "project.json"),
        relativePath: "metadata/project.json",
      });
      expect(resolveProjectFilePath(rootDirectory, "../outside.json")).toEqual({
        kind: "error",
        reason: "path_outside_project_root",
      });
    });
  });

  test("prevents concurrent writers with a project lock file", async () => {
    await withTempDirectory(async (rootDirectory) => {
      const first = await acquireProjectLock({
        projectRoot: rootDirectory,
        ownerId: "writer-a",
        now: () => 100,
      });

      expect(first.kind).toBe("acquired");
      if (first.kind !== "acquired") return;
      const second = await acquireProjectLock({
        projectRoot: rootDirectory,
        ownerId: "writer-b",
        now: () => 150,
      });

      expect(second).toEqual({
        kind: "busy",
        ownerId: "writer-a",
        acquiredAt: 100,
        lockFilePath: join(rootDirectory, ".deckforge-project.lock"),
      });
      await first.lock.release();
      const third = await acquireProjectLock({
        projectRoot: rootDirectory,
        ownerId: "writer-c",
        now: () => 200,
      });

      expect(third.kind).toBe("acquired");
      if (third.kind === "acquired") await third.lock.release();
    });
  });

  test("writes files atomically only while the project lock is active", async () => {
    await withTempDirectory(async (rootDirectory) => {
      const lockResult = await acquireProjectLock({
        projectRoot: rootDirectory,
        ownerId: "writer-a",
        now: () => 100,
      });

      expect(lockResult.kind).toBe("acquired");
      if (lockResult.kind !== "acquired") return;
      const firstWrite = await writeProjectFileAtomically({
        lock: lockResult.lock,
        relativeFilePath: "metadata/project.json",
        content: '{"ok":true}',
      });

      expect(firstWrite).toEqual({
        kind: "written",
        absolutePath: join(rootDirectory, "metadata", "project.json"),
        bytes: 11,
      });
      expect(readFileSync(join(rootDirectory, "metadata", "project.json"), "utf8")).toBe(
        '{"ok":true}',
      );
      expect(readdirSync(dirname(join(rootDirectory, "metadata", "project.json")))).toEqual([
        "project.json",
      ]);
      await lockResult.lock.release();
      const releasedWrite = await writeProjectFileAtomically({
        lock: lockResult.lock,
        relativeFilePath: "metadata/project.json",
        content: '{"ok":false}',
      });

      expect(releasedWrite).toEqual({
        kind: "error",
        reason: "lock_inactive",
      });
    });
  });
});

function createTempDirectory(): string {
  const directory = join(
    tmpdir(),
    `deckforge-project-file-safety-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );
  mkdirSync(directory, { recursive: true });
  return directory;
}

async function withTempDirectory(run: (directory: string) => Promise<void>): Promise<void> {
  const directory = createTempDirectory();
  try {
    await run(directory);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
}
