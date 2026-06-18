import { readFile } from "node:fs/promises";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export type JsonObject = { readonly [key: string]: JsonValue };
export type JsonArray = readonly JsonValue[];

export type StoredMetadataFile<TData extends JsonObject = JsonObject> = {
  readonly schemaVersion: number;
  readonly savedAt: number;
  readonly data: TData;
};

type LocalMetadataMigrationSchema<TData extends JsonObject> = {
  readonly currentVersion: number;
  readonly validate: (value: JsonValue) => value is TData;
  readonly migrations: readonly {
    readonly fromVersion: number;
    readonly toVersion: number;
    migrate(data: JsonObject): JsonObject;
  }[];
};

export function createStoredFile<TData extends JsonObject>(
  data: TData,
  schemaVersion: number,
  now: (() => number) | undefined,
): StoredMetadataFile<TData> {
  return {
    schemaVersion,
    savedAt: now ? now() : Date.now(),
    data,
  };
}

export async function readStoredFile(
  filePath: string,
): Promise<
  { readonly kind: "error" } | { readonly kind: "ok"; readonly value: StoredMetadataFile } | null
> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!isUnknownRecord(parsed)) return { kind: "error" };
    if (!isFiniteNumber(parsed.schemaVersion) || !isFiniteNumber(parsed.savedAt)) {
      return { kind: "error" };
    }
    if (!isJsonObject(parsed.data)) return { kind: "error" };
    return {
      kind: "ok",
      value: {
        schemaVersion: parsed.schemaVersion,
        savedAt: parsed.savedAt,
        data: parsed.data,
      },
    };
  } catch (error: unknown) {
    if (isNodeError(error, "ENOENT")) return null;
    if (error instanceof SyntaxError) return { kind: "error" };
    throw error;
  }
}

export function migrateStoredFile<TData extends JsonObject>(
  stored: StoredMetadataFile,
  schema: LocalMetadataMigrationSchema<TData>,
  now: (() => number) | undefined,
):
  | { readonly kind: "error"; readonly reason: "invalid_file" | "missing_migration" }
  | { readonly kind: "ok"; readonly value: StoredMetadataFile<TData> } {
  let version = stored.schemaVersion;
  let data = stored.data;
  while (version < schema.currentVersion) {
    const migration = schema.migrations.find((candidate) => candidate.fromVersion === version);
    if (!migration || migration.toVersion <= version) {
      return { kind: "error", reason: "missing_migration" };
    }
    data = migration.migrate(data);
    version = migration.toVersion;
  }
  if (!schema.validate(data)) return { kind: "error", reason: "invalid_file" };
  const migratedData = data;
  return {
    kind: "ok",
    value: createStoredFile(migratedData, version, now),
  };
}

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUnknownRecord(value: unknown): value is { readonly [key: string]: unknown } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNodeError(error: unknown, code: string): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === code;
}
