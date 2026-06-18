import { mkdir, open, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

const LOCK_FILE_NAME = ".deckforge-project.lock";

export type ProjectFilePathResolution =
  | {
      readonly kind: "resolved";
      readonly absolutePath: string;
      readonly relativePath: string;
    }
  | {
      readonly kind: "error";
      readonly reason: "path_not_relative" | "path_outside_project_root";
    };

export type ProjectLockHandle = {
  readonly projectRoot: string;
  readonly lockFilePath: string;
  readonly ownerId: string;
  readonly acquiredAt: number;
  release(): Promise<void>;
};

export type ProjectLockAcquisitionResult =
  | {
      readonly kind: "acquired";
      readonly lock: ProjectLockHandle;
    }
  | {
      readonly kind: "busy";
      readonly lockFilePath: string;
      readonly ownerId: string | null;
      readonly acquiredAt: number | null;
    };

export type ProjectFileWriteResult =
  | {
      readonly kind: "written";
      readonly absolutePath: string;
      readonly bytes: number;
    }
  | {
      readonly kind: "error";
      readonly reason: "lock_inactive" | "path_not_relative" | "path_outside_project_root";
    };

export type AcquireProjectLockOptions = {
  readonly projectRoot: string;
  readonly ownerId: string;
  readonly now?: () => number;
};

export type WriteProjectFileAtomicallyOptions = {
  readonly lock: ProjectLockHandle;
  readonly relativeFilePath: string;
  readonly content: string;
};

type LockFileContents = {
  readonly ownerId: string;
  readonly acquiredAt: number;
};

export function resolveProjectFilePath(
  projectRoot: string,
  relativeFilePath: string,
): ProjectFilePathResolution {
  if (relativeFilePath.trim().length === 0 || isAbsolute(relativeFilePath)) {
    return { kind: "error", reason: "path_not_relative" };
  }
  const absoluteRoot = resolve(projectRoot);
  const absolutePath = resolve(absoluteRoot, relativeFilePath);
  const normalizedRelativePath = relative(absoluteRoot, absolutePath);
  if (
    normalizedRelativePath === "" ||
    normalizedRelativePath === "." ||
    normalizedRelativePath === ".."
  ) {
    return { kind: "error", reason: "path_outside_project_root" };
  }
  if (normalizedRelativePath.startsWith(`..${sep}`)) {
    return { kind: "error", reason: "path_outside_project_root" };
  }
  return {
    kind: "resolved",
    absolutePath,
    relativePath: normalizedRelativePath,
  };
}

export async function acquireProjectLock(
  options: AcquireProjectLockOptions,
): Promise<ProjectLockAcquisitionResult> {
  const projectRoot = resolve(options.projectRoot);
  const lockFilePath = join(projectRoot, LOCK_FILE_NAME);
  const lockContents: LockFileContents = {
    ownerId: options.ownerId,
    acquiredAt: options.now ? options.now() : Date.now(),
  };
  await mkdir(projectRoot, { recursive: true });
  let fileHandle: Awaited<ReturnType<typeof open>> | null = null;
  try {
    fileHandle = await open(lockFilePath, "wx");
    await fileHandle.writeFile(JSON.stringify(lockContents), "utf8");
    await fileHandle.close();
    return {
      kind: "acquired",
      lock: createProjectLockHandle(projectRoot, lockFilePath, lockContents),
    };
  } catch (error: unknown) {
    if (fileHandle !== null) {
      await fileHandle.close().catch(() => undefined);
      await rm(lockFilePath, { force: true }).catch(() => undefined);
    }
    if (isNodeError(error, "EEXIST")) {
      const existing = await readLockFile(lockFilePath);
      return {
        kind: "busy",
        lockFilePath,
        ownerId: existing?.ownerId ?? null,
        acquiredAt: existing?.acquiredAt ?? null,
      };
    }
    throw error;
  }
}

export async function writeProjectFileAtomically(
  options: WriteProjectFileAtomicallyOptions,
): Promise<ProjectFileWriteResult> {
  const resolution = resolveProjectFilePath(options.lock.projectRoot, options.relativeFilePath);
  if (resolution.kind === "error") return resolution;
  const lockIsActive = await hasActiveLock(options.lock);
  if (!lockIsActive) return { kind: "error", reason: "lock_inactive" };
  await mkdir(dirname(resolution.absolutePath), { recursive: true });
  const tempPath = join(
    dirname(resolution.absolutePath),
    `.${resolution.relativePath.replaceAll("/", "_")}.${sanitizeOwnerId(options.lock.ownerId)}.${options.lock.acquiredAt}.tmp`,
  );
  await writeFile(tempPath, options.content, "utf8");
  try {
    await rename(tempPath, resolution.absolutePath);
    return {
      kind: "written",
      absolutePath: resolution.absolutePath,
      bytes: new TextEncoder().encode(options.content).length,
    };
  } finally {
    await rm(tempPath, { force: true }).catch(() => undefined);
  }
}

function createProjectLockHandle(
  projectRoot: string,
  lockFilePath: string,
  lockContents: LockFileContents,
): ProjectLockHandle {
  return {
    projectRoot,
    lockFilePath,
    ownerId: lockContents.ownerId,
    acquiredAt: lockContents.acquiredAt,
    async release() {
      const activeContents = await readLockFile(lockFilePath);
      if (
        activeContents?.ownerId === lockContents.ownerId &&
        activeContents.acquiredAt === lockContents.acquiredAt
      ) {
        await rm(lockFilePath, { force: true });
      }
    },
  };
}

async function hasActiveLock(lock: ProjectLockHandle): Promise<boolean> {
  const activeContents = await readLockFile(lock.lockFilePath);
  return activeContents?.ownerId === lock.ownerId && activeContents.acquiredAt === lock.acquiredAt;
}

async function readLockFile(lockFilePath: string): Promise<LockFileContents | null> {
  try {
    const raw = await readFile(lockFilePath, "utf8");
    return parseLockFileContents(raw);
  } catch (error: unknown) {
    if (isNodeError(error, "ENOENT")) return null;
    throw error;
  }
}

function parseLockFileContents(raw: string): LockFileContents | null {
  try {
    const parsed = JSON.parse(raw);
    if (!isUnknownRecord(parsed)) return null;
    if (typeof parsed.ownerId !== "string") return null;
    if (typeof parsed.acquiredAt !== "number" || !Number.isFinite(parsed.acquiredAt)) return null;
    return {
      ownerId: parsed.ownerId,
      acquiredAt: parsed.acquiredAt,
    };
  } catch (error: unknown) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
}

function sanitizeOwnerId(ownerId: string): string {
  const sanitized = ownerId.replace(/[^a-zA-Z0-9_-]+/g, "-");
  return sanitized.length > 0 ? sanitized : "writer";
}

function isUnknownRecord(value: unknown): value is { readonly [key: string]: unknown } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNodeError(error: unknown, code: string): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === code;
}
