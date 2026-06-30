import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

export async function buildPowerPointRoundTripManifest(options) {
  const rootDir = path.resolve(options.rootDir);
  await assertFilesExist(rootDir, [
    options.pptxPath,
    options.roundTrippedPptxPath,
    options.beforeObjectGraphPath,
    options.afterObjectGraphPath,
  ]);

  return {
    schemaVersion: 1,
    sourceDmgSha256: options.sourceDmgSha256,
    pptxPath: options.pptxPath,
    pptxSha256: await fileSha256(rootDir, options.pptxPath),
    roundTrippedPptxPath: options.roundTrippedPptxPath,
    roundTrippedPptxSha256: await fileSha256(rootDir, options.roundTrippedPptxPath),
    powerPointVersion: options.powerPointVersion,
    openedAt: options.openedAt,
    editedAt: options.editedAt,
    savedAt: options.savedAt,
    editedSlideId: options.editedSlideId,
    editedObjectId: options.editedObjectId,
    editDescription: options.editDescription,
    beforeObjectGraphPath: options.beforeObjectGraphPath,
    afterObjectGraphPath: options.afterObjectGraphPath,
    operator: {
      type: options.operatorType,
      name: options.operatorName,
    },
  };
}

async function assertFilesExist(rootDir, filePaths) {
  const missing = [];
  for (const filePath of filePaths) {
    try {
      const info = await stat(path.resolve(rootDir, filePath));
      if (!info.isFile()) missing.push(filePath);
    } catch {
      missing.push(filePath);
    }
  }
  if (missing.length > 0) {
    throw new Error(`Missing PowerPoint round-trip evidence file: ${missing.join(", ")}`);
  }
}

async function fileSha256(rootDir, filePath) {
  return createHash("sha256")
    .update(await readFile(path.resolve(rootDir, filePath)))
    .digest("hex");
}
