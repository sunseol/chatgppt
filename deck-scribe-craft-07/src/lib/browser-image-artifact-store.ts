import { z } from "zod";
import { ImageArtifactStoreError, type ImageArtifactStore } from "./image-artifact-store";

const STORAGE_KEY = "deckforge.image-artifacts.v1";
const STORAGE_VERSION = 1;

const BrowserImageArtifactContentSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("base64"), value: z.string() }).strict(),
  z.object({ kind: z.literal("text"), value: z.string() }).strict(),
]);

const BrowserImageArtifactWriteSchema = z
  .object({
    path: z.string().min(1),
    content: BrowserImageArtifactContentSchema,
  })
  .strict();

const BrowserImageArtifactStoreSchema = z
  .object({
    version: z.literal(STORAGE_VERSION),
    writes: z.array(BrowserImageArtifactWriteSchema),
  })
  .strict();

export type BrowserImageArtifactWrite = Readonly<z.infer<typeof BrowserImageArtifactWriteSchema>>;

type BrowserImageArtifactStoreFile = Readonly<z.infer<typeof BrowserImageArtifactStoreSchema>>;

export function createBrowserImageArtifactStore(
  storage: Storage | undefined = getBrowserStorage(),
): ImageArtifactStore {
  return {
    async write(entry) {
      if (storage === undefined) {
        throw new ImageArtifactStoreError("Browser image artifact storage is unavailable.");
      }
      const current = readStoreFile(storage);
      const write: BrowserImageArtifactWrite = {
        path: entry.path,
        content: contentForStorage(entry.content),
      };
      try {
        storage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            version: STORAGE_VERSION,
            writes: [...current.writes.filter((stored) => stored.path !== write.path), write],
          }),
        );
      } catch (error) {
        throw toStorageError(error);
      }
    },
  };
}

export function readBrowserImageArtifactWrites(
  storage: Storage | undefined = getBrowserStorage(),
): readonly BrowserImageArtifactWrite[] {
  return storage === undefined ? [] : readStoreFile(storage).writes;
}

function readStoreFile(storage: Storage): BrowserImageArtifactStoreFile {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return emptyStoreFile();
  try {
    const parsed = BrowserImageArtifactStoreSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : emptyStoreFile();
  } catch (error) {
    if (error instanceof Error) return emptyStoreFile();
    throw error;
  }
}

function emptyStoreFile(): BrowserImageArtifactStoreFile {
  return { version: STORAGE_VERSION, writes: [] };
}

function contentForStorage(content: string | Uint8Array): BrowserImageArtifactWrite["content"] {
  return typeof content === "string"
    ? { kind: "text", value: content }
    : { kind: "base64", value: bytesToBase64(content) };
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function getBrowserStorage(): Storage | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

function toStorageError(error: unknown): ImageArtifactStoreError {
  const message = error instanceof Error ? error.message : "unknown storage error";
  return new ImageArtifactStoreError(`Browser image artifact storage failed: ${message}`);
}
