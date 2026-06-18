import { describe, expect, test } from "bun:test";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  createLocalMetadataDb,
  type JsonValue,
  type LocalMetadataDbSchema,
} from "./local-metadata-db";

type MetadataState = {
  readonly recentProjectIds: readonly string[];
};

describe("local metadata db", () => {
  test("initializes missing metadata files with the current schema", async () => {
    await withTempDirectory(async (rootDirectory) => {
      const db = createLocalMetadataDb({
        projectRoot: rootDirectory,
        relativeFilePath: "metadata/local-db.json",
        lockOwnerId: "test-owner",
        now: () => 200,
        schema: metadataSchema(),
      });

      const result = await db.read();

      expect(result.kind).toBe("initialized");
      if (result.kind !== "initialized") return;
      expect(result.data).toEqual({ recentProjectIds: [] });
      expect(readStoredFile(rootDirectory)).toEqual({
        schemaVersion: 2,
        savedAt: 200,
        data: { recentProjectIds: [] },
      });
    });
  });

  test("migrates older metadata files and rewrites them in place", async () => {
    await withTempDirectory(async (rootDirectory) => {
      const filePath = join(rootDirectory, "metadata", "local-db.json");
      mkdirSync(join(rootDirectory, "metadata"), { recursive: true });
      writeFileSync(
        filePath,
        JSON.stringify({
          schemaVersion: 1,
          savedAt: 100,
          data: { lastProjectId: "project_002" },
        }),
        "utf8",
      );
      const db = createLocalMetadataDb({
        projectRoot: rootDirectory,
        relativeFilePath: "metadata/local-db.json",
        lockOwnerId: "test-owner",
        now: () => 250,
        schema: metadataSchema(),
      });

      const result = await db.read();

      expect(result.kind).toBe("migrated");
      if (result.kind !== "migrated") return;
      expect(result.fromVersion).toBe(1);
      expect(result.data).toEqual({ recentProjectIds: ["project_002"] });
      expect(readStoredFile(rootDirectory)).toEqual({
        schemaVersion: 2,
        savedAt: 250,
        data: { recentProjectIds: ["project_002"] },
      });
    });
  });

  test("reports unsupported future schema versions without overwriting the file", async () => {
    await withTempDirectory(async (rootDirectory) => {
      const filePath = join(rootDirectory, "metadata", "local-db.json");
      mkdirSync(join(rootDirectory, "metadata"), { recursive: true });
      writeFileSync(
        filePath,
        JSON.stringify({
          schemaVersion: 3,
          savedAt: 100,
          data: { recentProjectIds: [] },
        }),
        "utf8",
      );
      const db = createLocalMetadataDb({
        projectRoot: rootDirectory,
        relativeFilePath: "metadata/local-db.json",
        lockOwnerId: "test-owner",
        now: () => 250,
        schema: metadataSchema(),
      });

      const result = await db.read();

      expect(result).toEqual({
        kind: "error",
        reason: "unsupported_schema_version",
        schemaVersion: 3,
        filePath,
      });
      expect(readStoredFile(rootDirectory)).toEqual({
        schemaVersion: 3,
        savedAt: 100,
        data: { recentProjectIds: [] },
      });
    });
  });
});

function metadataSchema(): LocalMetadataDbSchema<MetadataState> {
  return {
    currentVersion: 2,
    defaultData: () => ({ recentProjectIds: [] }),
    validate: isMetadataState,
    migrations: [
      {
        fromVersion: 1,
        toVersion: 2,
        migrate: (data) => {
          const lastProjectId = readStringProperty(data, "lastProjectId");
          return {
            recentProjectIds: lastProjectId ? [lastProjectId] : [],
          };
        },
      },
    ],
  };
}

function isMetadataState(value: JsonValue): value is MetadataState {
  return (
    isJsonObject(value) &&
    Array.isArray(value.recentProjectIds) &&
    value.recentProjectIds.every((item) => typeof item === "string")
  );
}

function isJsonObject(value: JsonValue): value is { readonly [key: string]: JsonValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStringProperty(
  value: { readonly [key: string]: JsonValue },
  key: string,
): string | null {
  const candidate = value[key];
  return typeof candidate === "string" ? candidate : null;
}

function readStoredFile(rootDirectory: string): unknown {
  return JSON.parse(readFileSync(join(rootDirectory, "metadata", "local-db.json"), "utf8"));
}

function createTempDirectory(): string {
  const directory = join(
    tmpdir(),
    `deckforge-local-metadata-${Date.now()}-${Math.random().toString(16).slice(2)}`,
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
