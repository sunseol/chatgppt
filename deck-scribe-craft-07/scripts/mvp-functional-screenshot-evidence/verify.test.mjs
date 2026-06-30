import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { verifyMvpFunctionalScreenshotEvidence } from "./verify.mjs";

describe("MVP functional screenshot evidence verifier", () => {
  test("passes when required working-feature interactions have before and after screenshots", async () => {
    const bundle = await createProductionE2eBundle();

    const result = await verifyMvpFunctionalScreenshotEvidence(bundle);

    expect(result.ok).toBe(true);
    expect(result.status).toBe("pass");
    expect(result.requiredFeatureCount).toBe(5);
    expect(result.passedFeatureCount).toBe(5);
    expect(result.localCandidate).toBe(true);
    expect(result.releaseReady).toBe(false);
    expect(result.screenshotEvidence).toHaveLength(5);
    expect(result.screenshotEvidence[0].after.sha256).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(result.screenshotEvidence[0].after.width).toBe(1440);
    expect(result.screenshotEvidence[0].after.height).toBe(960);
  });

  test("blocks missing screenshots for a required feature", async () => {
    const bundle = await createProductionE2eBundle({
      omitAfterScreenshotFor: "006-create-project",
    });

    const result = await verifyMvpFunctionalScreenshotEvidence(bundle);

    expect(result.ok).toBe(false);
    expect(result.status).toBe("blocked");
    expect(result.findings.some((finding) => finding.code === "missing_screenshot_file")).toBe(
      true,
    );
  });

  test("blocks screenshots that do not have matching functional state evidence", async () => {
    const bundle = await createProductionE2eBundle({
      afterStateTextById: {
        "009-generate-live-brief": "브리프가 아직 없습니다.",
      },
    });

    const result = await verifyMvpFunctionalScreenshotEvidence(bundle);

    expect(result.ok).toBe(false);
    expect(result.status).toBe("blocked");
    expect(result.findings.some((finding) => finding.code === "missing_state_text_evidence")).toBe(
      true,
    );
  });

  test("blocks non-PNG screenshot files", async () => {
    const bundle = await createProductionE2eBundle({
      corruptScreenshotFor: "010-approve-live-brief",
    });

    const result = await verifyMvpFunctionalScreenshotEvidence(bundle);

    expect(result.ok).toBe(false);
    expect(result.status).toBe("blocked");
    expect(result.findings.some((finding) => finding.code === "invalid_png_screenshot")).toBe(true);
  });

  test("blocks reused after screenshots across required features", async () => {
    const bundle = await createProductionE2eBundle({
      duplicateAfterScreenshotFrom: "006-create-project",
      duplicateAfterScreenshotTo: "007-run-live-interview",
    });

    const result = await verifyMvpFunctionalScreenshotEvidence(bundle);

    expect(result.ok).toBe(false);
    expect(result.status).toBe("blocked");
    expect(result.findings.some((finding) => finding.code === "reused_after_screenshot")).toBe(
      true,
    );
  });
});

async function createProductionE2eBundle({
  omitAfterScreenshotFor = "",
  corruptScreenshotFor = "",
  duplicateAfterScreenshotFrom = "",
  duplicateAfterScreenshotTo = "",
  afterStateTextById = {},
} = {}) {
  const bundle = await mkdtemp(path.join(os.tmpdir(), "deckforge-mvp-screenshots-"));
  const recordingDir = path.join(bundle, "recording");
  await mkdir(recordingDir, { recursive: true });

  const interactions = [];
  const afterScreenshots = new Map();
  for (const definition of interactionDefinitions()) {
    const dir = path.join(bundle, "interactions", definition.id);
    await mkdir(dir, { recursive: true });
    const files = {
      interaction: path.join(dir, "interaction.json"),
      beforeScreenshot: path.join(dir, "before.png"),
      afterScreenshot: path.join(dir, "after.png"),
      beforeState: path.join(dir, "before-state.json"),
      afterState: path.join(dir, "after-state.json"),
      network: path.join(dir, "network.jsonl"),
      ipc: path.join(dir, "ipc.jsonl"),
    };
    const interaction = {
      id: definition.id,
      label: definition.label,
      ok: true,
      error: null,
      files,
    };
    await writeFile(files.interaction, `${JSON.stringify(interaction)}\n`);
    await writeFile(files.beforeScreenshot, pngBytes(1440, 960, 1));
    if (definition.id !== omitAfterScreenshotFor) {
      const sourceDuplicate = afterScreenshots.get(duplicateAfterScreenshotFrom);
      const bytes =
        definition.id === corruptScreenshotFor
          ? "not a png"
          : definition.id === duplicateAfterScreenshotTo && sourceDuplicate
            ? sourceDuplicate
            : pngBytes(1440, 960, definition.ordinal + 1);
      await writeFile(files.afterScreenshot, bytes);
      afterScreenshots.set(definition.id, bytes);
    }
    await writeFile(
      files.beforeState,
      `${JSON.stringify({ url: "http://127.0.0.1:4185/", bodyTextSample: "before" })}\n`,
    );
    await writeFile(
      files.afterState,
      `${JSON.stringify({
        url: definition.afterUrl,
        bodyTextSample: afterStateTextById[definition.id] ?? definition.afterText,
      })}\n`,
    );
    await writeFile(files.network, "");
    await writeFile(files.ipc, "");
    interactions.push(interaction);
  }

  const recordingPath = path.join(recordingDir, "video.webm");
  await writeFile(recordingPath, "video");
  const summary = {
    status: "pass",
    ok: true,
    mode: "local-production-preview",
    uiCreatedProject: true,
    projectStateInjection: false,
    fixtureProjectLoaded: false,
    recordingPath,
    interactions,
    failures: [],
  };
  const manifest = {
    schemaVersion: 1,
    status: "pass",
    mode: "local-production-preview",
    localCandidate: true,
    uiCreatedProject: true,
    projectStateInjection: false,
    fixtureProjectLoaded: false,
    recordingPath,
    interactions,
    failures: [],
  };
  await writeFile(path.join(bundle, "summary.json"), `${JSON.stringify(summary)}\n`);
  await writeFile(path.join(bundle, "manifest.json"), `${JSON.stringify(manifest)}\n`);
  return bundle;
}

function interactionDefinitions() {
  return [
    {
      ordinal: 6,
      id: "006-create-project",
      label: "Create project",
      afterUrl: "http://127.0.0.1:4185/project/project-ui-created/interview",
      afterText: "라이브 인터뷰 실행",
    },
    {
      ordinal: 7,
      id: "007-run-live-interview",
      label: "Run live interview",
      afterUrl: "http://127.0.0.1:4185/project/project-ui-created/interview",
      afterText: "인터뷰 질문이 준비되었습니다",
    },
    {
      ordinal: 8,
      id: "008-answer-live-interview",
      label: "Answer live interview",
      afterUrl: "http://127.0.0.1:4185/project/project-ui-created/interview",
      afterText: "모든 필수 답변 입력 완료",
    },
    {
      ordinal: 9,
      id: "009-generate-live-brief",
      label: "Generate live brief",
      afterUrl: "http://127.0.0.1:4185/project/project-ui-created/interview",
      afterText: "라이브 인터뷰 브리프가 준비되었습니다",
    },
    {
      ordinal: 10,
      id: "010-approve-live-brief",
      label: "Approve live brief",
      afterUrl: "http://127.0.0.1:4185/project/project-ui-created/research",
      afterText: "조사팩 생성 시작",
    },
  ];
}

function pngBytes(width, height, marker) {
  const buffer = Buffer.alloc(33, marker);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer, 0);
  buffer.writeUInt32BE(13, 8);
  Buffer.from("IHDR").copy(buffer, 12);
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  buffer[24] = 8;
  buffer[25] = 2;
  buffer[26] = 0;
  buffer[27] = 0;
  buffer[28] = 0;
  return buffer;
}
