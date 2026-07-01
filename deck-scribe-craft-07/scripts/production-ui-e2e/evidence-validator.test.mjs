import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { validateProductionE2eBundle } from "./evidence-validator.mjs";

describe("production UI E2E evidence validator", () => {
  test("passes when the manifest indexes every required interaction file", async () => {
    const bundle = await createBundle({ networkText: "" });

    const result = await validateProductionE2eBundle(bundle);

    expect(result.ok).toBe(true);
    expect(result.interactionCount).toBe(1);
    expect(result.checkedFileCount).toBe(10);
  });

  test("fails when text evidence contains an unredacted secret", async () => {
    const bundle = await createBundle({
      networkText: "Authorization: Bearer abcdefghijklmnopqrstuvwxyz",
    });

    const result = await validateProductionE2eBundle(bundle);

    expect(result.ok).toBe(false);
    expect(result.findings.some((finding) => finding.code === "unredacted_bearer_token")).toBe(
      true,
    );
  });

  test("fails when a packaged candidate has no DMG identity", async () => {
    const bundle = await createBundle({
      networkText: "",
      manifestPatch: {
        mode: "external-packaged-or-preview-url",
        packagedCandidate: true,
        artifactIdentity: null,
      },
      summaryPatch: {
        mode: "external-packaged-or-preview-url",
        artifactIdentity: null,
      },
    });

    const result = await validateProductionE2eBundle(bundle);

    expect(result.ok).toBe(false);
    expect(
      result.findings.some((finding) => finding.code === "missing_packaged_artifact_identity"),
    ).toBe(true);
  });

  test("fails when summary and manifest artifact identity diverge", async () => {
    const identity = artifactIdentity("a".repeat(64));
    const bundle = await createBundle({
      networkText: "",
      manifestPatch: {
        mode: "external-packaged-or-preview-url",
        packagedCandidate: true,
        artifactIdentity: identity,
      },
      summaryPatch: {
        mode: "external-packaged-or-preview-url",
        artifactIdentity: artifactIdentity("b".repeat(64)),
      },
    });

    const result = await validateProductionE2eBundle(bundle);

    expect(result.ok).toBe(false);
    expect(result.findings.some((finding) => finding.code === "artifact_identity_mismatch")).toBe(
      true,
    );
  });

  test("fails when packaged artifact identity disagrees with release manifest", async () => {
    const bundle = await createBundle({
      networkText: "",
      packagedDmgSha256: "a".repeat(64),
      releaseManifestDmgSha256: "b".repeat(64),
    });

    const result = await validateProductionE2eBundle(bundle);

    expect(result.ok).toBe(false);
    expect(
      result.findings.some((finding) => finding.code === "release_manifest_dmg_sha256_mismatch"),
    ).toBe(true);
  });

  test("passes a packaged candidate with matching DMG identity", async () => {
    const bundle = await createBundle({
      networkText: "",
      packagedDmgSha256: "a".repeat(64),
    });

    const result = await validateProductionE2eBundle(bundle);

    expect(result.ok).toBe(true);
    expect(result.checkedFileCount).toBe(11);
  });
});

async function createBundle({
  networkText,
  manifestPatch = {},
  summaryPatch = {},
  packagedDmgSha256 = "",
  releaseManifestDmgSha256 = packagedDmgSha256,
}) {
  const bundle = await mkdtemp(path.join(os.tmpdir(), "deckforge-evidence-"));
  const interactionDir = path.join(bundle, "interactions", "001-create-project");
  const recordingDir = path.join(bundle, "recording");
  await mkdir(interactionDir, { recursive: true });
  await mkdir(recordingDir, { recursive: true });

  const files = {
    interaction: path.join(interactionDir, "interaction.json"),
    beforeScreenshot: path.join(interactionDir, "before.png"),
    afterScreenshot: path.join(interactionDir, "after.png"),
    beforeState: path.join(interactionDir, "before-state.json"),
    afterState: path.join(interactionDir, "after-state.json"),
    network: path.join(interactionDir, "network.jsonl"),
    ipc: path.join(interactionDir, "ipc.jsonl"),
  };
  await writeFile(files.interaction, "{}\n");
  await writeFile(files.beforeScreenshot, "");
  await writeFile(files.afterScreenshot, "");
  await writeFile(files.beforeState, "{}\n");
  await writeFile(files.afterState, "{}\n");
  await writeFile(files.network, networkText);
  await writeFile(files.ipc, "");

  const recordingPath = path.join(recordingDir, "video.webm");
  await writeFile(recordingPath, "");
  const interactions = [{ id: "001-create-project", ok: true, files }];
  const packagedIdentity = packagedDmgSha256
    ? artifactIdentity(packagedDmgSha256, "release-manifest.json")
    : null;
  if (packagedIdentity) {
    await writeFile(
      path.join(bundle, packagedIdentity.releaseManifestPath),
      `${JSON.stringify({
        artifactIdentity: {
          dmgSha256: releaseManifestDmgSha256,
        },
      })}\n`,
    );
  }
  const summary = {
    status: "pass",
    mode: packagedIdentity ? "external-packaged-or-preview-url" : "local-production-preview",
    interactions,
    recordingPath,
    artifactIdentity: packagedIdentity,
    ...summaryPatch,
  };
  const manifest = {
    status: "pass",
    mode: packagedIdentity ? "external-packaged-or-preview-url" : "local-production-preview",
    packagedCandidate: Boolean(packagedIdentity),
    projectStateInjection: false,
    fixtureProjectLoaded: false,
    uiCreatedProject: true,
    interactions,
    recordingPath,
    artifactIdentity: packagedIdentity,
    ...manifestPatch,
  };
  await writeFile(path.join(bundle, "summary.json"), `${JSON.stringify(summary)}\n`);
  await writeFile(path.join(bundle, "manifest.json"), `${JSON.stringify(manifest)}\n`);
  return bundle;
}

function artifactIdentity(
  dmgSha256,
  releaseManifestPath = "release-artifacts/release-evidence.json",
) {
  return {
    dmgPath: "release-artifacts/DeckForge_0.0.0.15_aarch64.dmg",
    dmgSha256,
    releaseManifestPath,
  };
}
