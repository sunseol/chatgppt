import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import { verifyPowerPointRoundTripManifest } from "./verify.mjs";

describe("PowerPoint round-trip evidence verification", () => {
  test("passes when the manifest proves a human PowerPoint open-edit-save round-trip", async () => {
    const fixture = await createFixture();

    const result = await verifyPowerPointRoundTripManifest(fixture.manifestPath);

    expect(result.ok).toBe(true);
    expect(result.status).toBe("pass");
    expect(result.findings).toEqual([]);
    expect(result.checkedFileCount).toBe(4);
    expect(result.pptxSha256).toBe(fixture.pptxSha256);
    expect(result.roundTrippedPptxSha256).toBe(fixture.roundTrippedPptxSha256);
  });

  test("blocks when no manifest is provided", async () => {
    const result = await verifyPowerPointRoundTripManifest(null);

    expect(result.ok).toBe(false);
    expect(result.status).toBe("blocked");
    expect(result.findings).toContainEqual({
      code: "missing_manifest",
      path: "manifestPath",
      detail: "",
    });
  });

  test("blocks when a PPTX hash does not match the referenced file", async () => {
    const fixture = await createFixture({
      manifestPatch: { pptxSha256: "b".repeat(64) },
    });

    const result = await verifyPowerPointRoundTripManifest(fixture.manifestPath);

    expect(result.ok).toBe(false);
    expect(result.findings.map((finding) => finding.code)).toContain("file_hash_mismatch");
    expect(result.findings.map((finding) => finding.path)).toContain("pptxSha256");
  });

  test("blocks when the manifest lacks PowerPoint edit proof", async () => {
    const fixture = await createFixture({
      manifestPatch: {
        powerPointVersion: "",
        editDescription: "",
        operator: { type: "ai-agent-only", name: "Codex" },
      },
    });

    const result = await verifyPowerPointRoundTripManifest(fixture.manifestPath);

    expect(result.ok).toBe(false);
    expect(result.findings.map((finding) => finding.code)).toContain("missing_powerpoint_version");
    expect(result.findings.map((finding) => finding.code)).toContain("missing_edit_proof");
    expect(result.findings.map((finding) => finding.code)).toContain("invalid_operator_type");
  });

  test("blocks when the round-tripped object graph loses editable content", async () => {
    const fixture = await createFixture({
      afterGraphPatch: { slideCount: 1, editableObjectCount: 1 },
    });

    const result = await verifyPowerPointRoundTripManifest(fixture.manifestPath);

    expect(result.ok).toBe(false);
    expect(result.findings).toContainEqual({
      code: "object_graph_regression",
      path: "afterObjectGraphPath.editableObjectCount",
      detail: "1 < 2",
    });
  });
});

async function createFixture(options = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "deckforge-ppt-round-trip-"));
  const pptxPath = path.join(root, "deckforge-before.pptx");
  const roundTrippedPptxPath = path.join(root, "deckforge-after.pptx");
  const beforeObjectGraphPath = path.join(root, "before-object-graph.json");
  const afterObjectGraphPath = path.join(root, "after-object-graph.json");
  await mkdir(root, { recursive: true });
  await writeFile(pptxPath, "before pptx bytes");
  await writeFile(roundTrippedPptxPath, "after pptx bytes");
  await writeJson(beforeObjectGraphPath, objectGraph());
  await writeJson(afterObjectGraphPath, {
    ...objectGraph(),
    ...options.afterGraphPatch,
  });
  const pptxSha256 = await fileSha256(pptxPath);
  const roundTrippedPptxSha256 = await fileSha256(roundTrippedPptxPath);
  const manifest = {
    schemaVersion: 1,
    sourceDmgSha256: "a".repeat(64),
    pptxPath,
    pptxSha256,
    roundTrippedPptxPath,
    roundTrippedPptxSha256,
    powerPointVersion: "Microsoft PowerPoint 16.98",
    openedAt: "2026-06-25T09:00:00.000Z",
    editedAt: "2026-06-25T09:01:00.000Z",
    savedAt: "2026-06-25T09:02:00.000Z",
    editedSlideId: "slide-1",
    editedObjectId: "title-1",
    editDescription: "Changed the title text in PowerPoint and saved the document.",
    beforeObjectGraphPath,
    afterObjectGraphPath,
    operator: {
      type: "human",
      name: "QA Operator",
    },
    ...options.manifestPatch,
  };
  const manifestPath = path.join(root, "manifest.json");
  await writeJson(manifestPath, manifest);
  return {
    manifestPath,
    pptxSha256,
    roundTrippedPptxSha256,
  };
}

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

async function fileSha256(filePath) {
  return createHash("sha256")
    .update(await readFile(filePath))
    .digest("hex");
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
