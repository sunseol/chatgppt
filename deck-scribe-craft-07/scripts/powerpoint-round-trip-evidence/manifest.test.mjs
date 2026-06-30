import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import { buildPowerPointRoundTripManifest } from "./manifest.mjs";
import { verifyPowerPointRoundTripManifest } from "./verify.mjs";

describe("PowerPoint round-trip manifest builder", () => {
  test("builds a verifier-ready manifest with computed PPTX hashes", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "deckforge-ppt-manifest-"));
    await writeFixtureFile(root, "powerpoint-round-trip/deckforge-before.pptx", "before bytes");
    await writeFixtureFile(root, "powerpoint-round-trip/deckforge-after.pptx", "after bytes");
    await writeJson(root, "powerpoint-round-trip/before-object-graph.json", objectGraph());
    await writeJson(root, "powerpoint-round-trip/after-object-graph.json", objectGraph());

    const manifest = await buildPowerPointRoundTripManifest({
      rootDir: root,
      sourceDmgSha256: "a".repeat(64),
      pptxPath: "powerpoint-round-trip/deckforge-before.pptx",
      roundTrippedPptxPath: "powerpoint-round-trip/deckforge-after.pptx",
      powerPointVersion: "Microsoft PowerPoint 16.98",
      openedAt: "2026-06-30T05:00:00.000Z",
      editedAt: "2026-06-30T05:01:00.000Z",
      savedAt: "2026-06-30T05:02:00.000Z",
      editedSlideId: "slide-1",
      editedObjectId: "title-1",
      editDescription: "Changed the title text in PowerPoint and saved the document.",
      beforeObjectGraphPath: "powerpoint-round-trip/before-object-graph.json",
      afterObjectGraphPath: "powerpoint-round-trip/after-object-graph.json",
      operatorType: "human",
      operatorName: "QA Operator",
    });

    expect(manifest.pptxSha256).toBe(
      await fileSha256(path.join(root, "powerpoint-round-trip/deckforge-before.pptx")),
    );
    expect(manifest.roundTrippedPptxSha256).toBe(
      await fileSha256(path.join(root, "powerpoint-round-trip/deckforge-after.pptx")),
    );
    expect(manifest.operator).toEqual({ type: "human", name: "QA Operator" });

    const manifestPath = path.join(root, "powerpoint-round-trip-manifest.json");
    await writeJsonFile(manifestPath, manifest);
    const verification = await verifyPowerPointRoundTripManifest(manifestPath, {
      expectedDmgSha256: "a".repeat(64),
    });

    expect(verification.ok).toBe(true);
    expect(verification.status).toBe("pass");
    expect(verification.findings).toEqual([]);
  });

  test("fails before writing when a required round-trip file is missing", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "deckforge-ppt-manifest-"));
    await writeFixtureFile(root, "powerpoint-round-trip/deckforge-before.pptx", "before bytes");

    await expect(
      buildPowerPointRoundTripManifest({
        rootDir: root,
        sourceDmgSha256: "b".repeat(64),
        pptxPath: "powerpoint-round-trip/deckforge-before.pptx",
        roundTrippedPptxPath: "powerpoint-round-trip/deckforge-after.pptx",
        powerPointVersion: "Microsoft PowerPoint 16.98",
        openedAt: "2026-06-30T05:00:00.000Z",
        editedAt: "2026-06-30T05:01:00.000Z",
        savedAt: "2026-06-30T05:02:00.000Z",
        editedSlideId: "slide-1",
        editedObjectId: "title-1",
        editDescription: "Changed the title text in PowerPoint and saved the document.",
        beforeObjectGraphPath: "powerpoint-round-trip/before-object-graph.json",
        afterObjectGraphPath: "powerpoint-round-trip/after-object-graph.json",
        operatorType: "human",
        operatorName: "QA Operator",
      }),
    ).rejects.toThrow("Missing PowerPoint round-trip evidence file");
  });
});

function objectGraph() {
  return {
    schemaVersion: 1,
    slideCount: 1,
    editableObjectCount: 2,
    objects: [
      { slideId: "slide-1", objectId: "title-1", type: "text" },
      { slideId: "slide-1", objectId: "shape-1", type: "shape" },
    ],
  };
}

async function writeFixtureFile(root, relativePath, contents) {
  const absolutePath = path.join(root, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, contents);
  const info = await stat(absolutePath);
  expect(info.isFile()).toBe(true);
}

async function writeJson(root, relativePath, value) {
  await writeJsonFile(path.join(root, relativePath), value);
}

async function writeJsonFile(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function fileSha256(filePath) {
  return createHash("sha256")
    .update(await readFile(filePath))
    .digest("hex");
}
