import { describe, expect, test } from "bun:test";
import {
  createBrowserImageArtifactStore,
  readBrowserImageArtifactWrites,
} from "./browser-image-artifact-store";
import { readBrowserStoredImageArtifactEvidence } from "./browser-image-artifact-evidence";

describe("browser image artifact store", () => {
  test("persists text and binary image artifact writes by path", async () => {
    // Given
    const storage = new MemoryStorage();
    const store = createBrowserImageArtifactStore(storage);

    // When
    await store.write({
      path: "projects/project_001/slides/images/slide_001.v1.png",
      content: new Uint8Array([1, 2, 3]),
    });
    await store.write({
      path: "projects/project_001/slides/images/slide_001.v1.metadata.json",
      content: '{"ok":true}',
    });

    // Then
    expect(readBrowserImageArtifactWrites(storage).map((write) => write.path)).toEqual([
      "projects/project_001/slides/images/slide_001.v1.png",
      "projects/project_001/slides/images/slide_001.v1.metadata.json",
    ]);
    expect(readBrowserImageArtifactWrites(storage)[0]?.content).toEqual({
      kind: "base64",
      value: "AQID",
    });
    expect(readBrowserImageArtifactWrites(storage)[1]?.content).toEqual({
      kind: "text",
      value: '{"ok":true}',
    });
  });

  test("replaces duplicate paths and reports storage failures through the artifact boundary", async () => {
    // Given
    const storage = new MemoryStorage();
    const store = createBrowserImageArtifactStore(storage);

    // When
    await store.write({
      path: "projects/project_001/slides/images/slide_001.v1.png",
      content: "a",
    });
    await store.write({
      path: "projects/project_001/slides/images/slide_001.v1.png",
      content: "b",
    });

    // Then
    expect(readBrowserImageArtifactWrites(storage)).toEqual([
      {
        path: "projects/project_001/slides/images/slide_001.v1.png",
        content: { kind: "text", value: "b" },
      },
    ]);
    let thrownMessage = "";
    try {
      await createBrowserImageArtifactStore(new ThrowingStorage()).write({
        path: "projects/project_001/slides/images/slide_001.v1.png",
        content: "x",
      });
    } catch (error) {
      thrownMessage = error instanceof Error ? error.message : String(error);
    }
    expect(thrownMessage).toBe("Browser image artifact storage failed: quota");
  });

  test("reads provider evidence for a stored Codex image artifact", async () => {
    // Given
    const storage = new MemoryStorage();
    const store = createBrowserImageArtifactStore(storage);
    await store.write({
      path: "projects/project_001/slides/images/slide_001.v1.png",
      content: new Uint8Array([1, 2, 3]),
    });
    await store.write({
      path: "projects/project_001/slides/images/slide_001.v1.metadata.json",
      content: JSON.stringify({
        path: "projects/project_001/slides/images/slide_001.v1.metadata.json",
        providerId: "codex",
        slideNumber: 1,
        request: { model: "gpt-image-2", turnId: "turn_codex_image_001" },
      }),
    });
    await store.write({
      path: "projects/project_001/slides/images/slide_001.v1.provenance.json",
      content: JSON.stringify({
        path: "projects/project_001/slides/images/slide_001.v1.provenance.json",
        artifactId: "project_001_image_slide_001_v1",
        providerKind: "codex",
        turnId: "turn_codex_image_001",
      }),
    });

    // When
    const evidence = readBrowserStoredImageArtifactEvidence(
      "projects/project_001/slides/images/slide_001.v1.png",
      storage,
    );

    // Then
    expect(evidence).toEqual({
      kind: "ready",
      evidence: {
        artifactId: "project_001_image_slide_001_v1",
        binaryPath: "projects/project_001/slides/images/slide_001.v1.png",
        metadataPath: "projects/project_001/slides/images/slide_001.v1.metadata.json",
        provenancePath: "projects/project_001/slides/images/slide_001.v1.provenance.json",
        providerId: "codex",
        providerRunId: "turn_codex_image_001",
        slideNumber: 1,
        version: 1,
      },
    });
  });

  test("blocks stored Codex image evidence with padded turn ids", async () => {
    // Given
    const storage = new MemoryStorage();
    const store = createBrowserImageArtifactStore(storage);
    await store.write({
      path: "projects/project_001/slides/images/slide_001.v1.png",
      content: new Uint8Array([1, 2, 3]),
    });
    await store.write({
      path: "projects/project_001/slides/images/slide_001.v1.metadata.json",
      content: JSON.stringify({
        path: "projects/project_001/slides/images/slide_001.v1.metadata.json",
        providerId: "codex",
        slideNumber: 1,
        request: { model: "gpt-image-2", turnId: " turn_codex_image_001 " },
      }),
    });
    await store.write({
      path: "projects/project_001/slides/images/slide_001.v1.provenance.json",
      content: JSON.stringify({
        path: "projects/project_001/slides/images/slide_001.v1.provenance.json",
        artifactId: "project_001_image_slide_001_v1",
        providerKind: "codex",
        turnId: " turn_codex_image_001 ",
      }),
    });

    // When
    const evidence = readBrowserStoredImageArtifactEvidence(
      "projects/project_001/slides/images/slide_001.v1.png",
      storage,
    );

    // Then
    expect(evidence).toEqual({
      kind: "blocked",
      issues: ["Stored image provider run id is missing."],
    });
  });
});

class MemoryStorage implements Storage {
  readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    let currentIndex = 0;
    for (const key of this.values.keys()) {
      if (currentIndex === index) return key;
      currentIndex += 1;
    }
    return null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

class ThrowingStorage extends MemoryStorage {
  setItem(): void {
    throw new Error("quota");
  }
}
