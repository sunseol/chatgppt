import {
  acquireProjectLock,
  resolveProjectFilePath,
  writeProjectFileAtomically,
} from "./project-file-safety";
import {
  createStoredFile,
  migrateStoredFile,
  readStoredFile,
  type JsonObject,
  type JsonValue,
  type StoredMetadataFile,
} from "./local-metadata-store";

export type { JsonArray, JsonObject, JsonPrimitive, JsonValue } from "./local-metadata-store";

export type LocalMetadataDbMigration = {
  readonly fromVersion: number;
  readonly toVersion: number;
  migrate(data: JsonObject): JsonObject;
};

export type LocalMetadataDbSchema<TData extends JsonObject> = {
  readonly currentVersion: number;
  readonly defaultData: () => TData;
  readonly validate: (value: JsonValue) => value is TData;
  readonly migrations: readonly LocalMetadataDbMigration[];
};

export type LocalMetadataDbOptions<TData extends JsonObject> = {
  readonly projectRoot: string;
  readonly relativeFilePath: string;
  readonly lockOwnerId: string;
  readonly schema: LocalMetadataDbSchema<TData>;
  readonly now?: () => number;
};

export type LocalMetadataDbReadResult<TData extends JsonObject> =
  | {
      readonly kind: "initialized";
      readonly data: TData;
      readonly schemaVersion: number;
      readonly savedAt: number;
      readonly filePath: string;
    }
  | {
      readonly kind: "loaded";
      readonly data: TData;
      readonly schemaVersion: number;
      readonly savedAt: number;
      readonly filePath: string;
    }
  | {
      readonly kind: "migrated";
      readonly data: TData;
      readonly fromVersion: number;
      readonly schemaVersion: number;
      readonly savedAt: number;
      readonly filePath: string;
    }
  | {
      readonly kind: "error";
      readonly reason:
        | "busy"
        | "invalid_file"
        | "missing_migration"
        | "path_not_relative"
        | "path_outside_project_root"
        | "unsupported_schema_version";
      readonly filePath: string;
      readonly schemaVersion?: number;
      readonly ownerId?: string | null;
      readonly acquiredAt?: number | null;
    };

export type LocalMetadataDbWriteResult<TData extends JsonObject> =
  | {
      readonly kind: "saved";
      readonly data: TData;
      readonly schemaVersion: number;
      readonly savedAt: number;
      readonly filePath: string;
    }
  | LocalMetadataDbReadResult<TData>;

export function createLocalMetadataDb<TData extends JsonObject>(
  options: LocalMetadataDbOptions<TData>,
): {
  read(): Promise<LocalMetadataDbReadResult<TData>>;
  write(data: TData): Promise<LocalMetadataDbWriteResult<TData>>;
} {
  return {
    read: () => readLocalMetadataDb(options),
    write: (data) => writeLocalMetadataDb(options, data),
  };
}

async function readLocalMetadataDb<TData extends JsonObject>(
  options: LocalMetadataDbOptions<TData>,
): Promise<LocalMetadataDbReadResult<TData>> {
  const resolution = resolveProjectFilePath(options.projectRoot, options.relativeFilePath);
  if (resolution.kind === "error") {
    return { kind: "error", reason: resolution.reason, filePath: joinFilePath(options) };
  }
  const lock = await acquireProjectLock({
    projectRoot: options.projectRoot,
    ownerId: options.lockOwnerId,
    now: options.now,
  });
  if (lock.kind === "busy") {
    return {
      kind: "error",
      reason: "busy",
      filePath: resolution.absolutePath,
      ownerId: lock.ownerId,
      acquiredAt: lock.acquiredAt,
    };
  }
  try {
    const stored = await readStoredFile(resolution.absolutePath);
    if (stored === null) {
      const initialData = options.schema.defaultData();
      const initialized = createStoredFile(initialData, options.schema.currentVersion, options.now);
      await persistStoredFile(lock.lock, options.relativeFilePath, initialized);
      return {
        kind: "initialized",
        data: initialized.data,
        schemaVersion: initialized.schemaVersion,
        savedAt: initialized.savedAt,
        filePath: resolution.absolutePath,
      };
    }
    if (stored.kind === "error") {
      return { kind: "error", reason: "invalid_file", filePath: resolution.absolutePath };
    }
    if (stored.value.schemaVersion > options.schema.currentVersion) {
      return {
        kind: "error",
        reason: "unsupported_schema_version",
        schemaVersion: stored.value.schemaVersion,
        filePath: resolution.absolutePath,
      };
    }
    if (stored.value.schemaVersion === options.schema.currentVersion) {
      const loadedData = stored.value.data;
      if (!options.schema.validate(loadedData)) {
        return { kind: "error", reason: "invalid_file", filePath: resolution.absolutePath };
      }
      return {
        kind: "loaded",
        data: loadedData,
        schemaVersion: stored.value.schemaVersion,
        savedAt: stored.value.savedAt,
        filePath: resolution.absolutePath,
      };
    }
    const migrated = migrateStoredFile(stored.value, options.schema, options.now);
    if (migrated.kind === "error") {
      return {
        kind: "error",
        reason: migrated.reason,
        filePath: resolution.absolutePath,
        schemaVersion: stored.value.schemaVersion,
      };
    }
    await persistStoredFile(lock.lock, options.relativeFilePath, migrated.value);
    return {
      kind: "migrated",
      data: migrated.value.data,
      fromVersion: stored.value.schemaVersion,
      schemaVersion: migrated.value.schemaVersion,
      savedAt: migrated.value.savedAt,
      filePath: resolution.absolutePath,
    };
  } finally {
    await lock.lock.release();
  }
}

async function writeLocalMetadataDb<TData extends JsonObject>(
  options: LocalMetadataDbOptions<TData>,
  data: TData,
): Promise<LocalMetadataDbWriteResult<TData>> {
  const resolution = resolveProjectFilePath(options.projectRoot, options.relativeFilePath);
  if (resolution.kind === "error") {
    return { kind: "error", reason: resolution.reason, filePath: joinFilePath(options) };
  }
  const lock = await acquireProjectLock({
    projectRoot: options.projectRoot,
    ownerId: options.lockOwnerId,
    now: options.now,
  });
  if (lock.kind === "busy") {
    return {
      kind: "error",
      reason: "busy",
      filePath: resolution.absolutePath,
      ownerId: lock.ownerId,
      acquiredAt: lock.acquiredAt,
    };
  }
  try {
    const stored = createStoredFile(data, options.schema.currentVersion, options.now);
    await persistStoredFile(lock.lock, options.relativeFilePath, stored);
    return {
      kind: "saved",
      data,
      schemaVersion: stored.schemaVersion,
      savedAt: stored.savedAt,
      filePath: resolution.absolutePath,
    };
  } finally {
    await lock.lock.release();
  }
}

async function persistStoredFile(
  lock: Parameters<typeof writeProjectFileAtomically>[0]["lock"],
  relativeFilePath: string,
  stored: StoredMetadataFile,
): Promise<void> {
  const writeResult = await writeProjectFileAtomically({
    lock,
    relativeFilePath,
    content: JSON.stringify(stored, null, 2),
  });
  if (writeResult.kind === "error") throw new Error(`Metadata write failed: ${writeResult.reason}`);
}

function joinFilePath<TData extends JsonObject>(options: LocalMetadataDbOptions<TData>): string {
  return `${options.projectRoot}/${options.relativeFilePath}`;
}
