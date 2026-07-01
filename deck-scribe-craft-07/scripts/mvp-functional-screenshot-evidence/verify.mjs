import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const REQUIRED_FEATURES = [
  {
    id: "create_project",
    interactionId: "006-create-project",
    label: "Create project",
    afterText: "라이브 인터뷰 실행",
    afterUrlPattern: /\/project\/[^/]+\/interview/,
  },
  {
    id: "run_live_interview",
    interactionId: "007-run-live-interview",
    label: "Run live interview",
    afterText: "인터뷰 질문이 준비되었습니다",
    afterUrlPattern: /\/project\/[^/]+\/interview/,
  },
  {
    id: "answer_live_interview",
    interactionId: "008-answer-live-interview",
    label: "Answer live interview",
    afterText: "모든 필수 답변 입력 완료",
    afterUrlPattern: /\/project\/[^/]+\/interview/,
  },
  {
    id: "generate_live_brief",
    interactionId: "009-generate-live-brief",
    label: "Generate live brief",
    afterText: "라이브 인터뷰 브리프가 준비되었습니다",
    afterUrlPattern: /\/project\/[^/]+\/interview/,
  },
  {
    id: "approve_live_brief",
    interactionId: "010-approve-live-brief",
    label: "Approve live brief",
    afterText: "조사팩 생성 시작",
    afterUrlPattern: /\/project\/[^/]+\/research/,
  },
];

export async function verifyMvpFunctionalScreenshotEvidence(bundleDir) {
  const absoluteBundleDir = path.resolve(bundleDir);
  const findings = [];
  const manifest = await readJson(path.join(absoluteBundleDir, "manifest.json"), findings);
  const summary = await readJson(path.join(absoluteBundleDir, "summary.json"), findings);
  const screenshotEvidence = [];

  if (!manifest || !summary) {
    return result({ bundleDir: absoluteBundleDir, findings, screenshotEvidence });
  }

  validateEnvelope({ manifest, summary, findings });
  const interactions = Array.isArray(manifest.interactions) ? manifest.interactions : [];
  const interactionsById = new Map(
    interactions.map((interaction) => [interaction.id, interaction]),
  );
  const seenAfterHashes = new Map();

  for (const feature of REQUIRED_FEATURES) {
    const interaction = interactionsById.get(feature.interactionId);
    if (!interaction) {
      pushFinding(findings, "missing_required_interaction", feature.interactionId, feature.id);
      continue;
    }
    if (interaction.ok !== true) {
      pushFinding(findings, "interaction_not_ok", feature.interactionId, interaction.error ?? "");
    }

    const before = await readScreenshot(interaction.files?.beforeScreenshot, "before", findings);
    const after = await readScreenshot(interaction.files?.afterScreenshot, "after", findings);
    const state = await readJson(interaction.files?.afterState, findings, "afterState");
    if (state) validateAfterState({ feature, state, findings });

    if (after?.sha256) {
      const firstFeature = seenAfterHashes.get(after.sha256);
      if (firstFeature) {
        pushFinding(
          findings,
          "reused_after_screenshot",
          interaction.files?.afterScreenshot ?? feature.interactionId,
          `${feature.id} reuses ${firstFeature}`,
        );
      } else {
        seenAfterHashes.set(after.sha256, feature.id);
      }
    }

    if (before && after) {
      screenshotEvidence.push({
        featureId: feature.id,
        interactionId: feature.interactionId,
        label: feature.label,
        before,
        after,
        afterStatePath: interaction.files?.afterState ?? null,
      });
    }
  }

  return result({ bundleDir: absoluteBundleDir, findings, screenshotEvidence });
}

export async function writeMvpFunctionalScreenshotEvidenceVerification(
  bundleDir,
  outDir = bundleDir,
) {
  const verification = await verifyMvpFunctionalScreenshotEvidence(bundleDir);
  const outputPath = path.join(path.resolve(outDir), "mvp-functional-screenshot-verification.json");
  await writeFile(outputPath, `${JSON.stringify(verification, null, 2)}\n`);
  return { ...verification, outputPath };
}

function validateEnvelope({ manifest, summary, findings }) {
  if (manifest.status !== "pass") pushFinding(findings, "manifest_not_passed", "manifest.status");
  if (summary.status !== "pass" && summary.ok !== true) {
    pushFinding(findings, "summary_not_passed", "summary.status");
  }
  if (manifest.projectStateInjection !== false || summary.projectStateInjection !== false) {
    pushFinding(findings, "project_state_injection", "projectStateInjection");
  }
  if (manifest.fixtureProjectLoaded !== false || summary.fixtureProjectLoaded !== false) {
    pushFinding(findings, "fixture_project_loaded", "fixtureProjectLoaded");
  }
  if (manifest.uiCreatedProject !== true || summary.uiCreatedProject !== true) {
    pushFinding(findings, "ui_created_project_not_proven", "uiCreatedProject");
  }
}

function validateAfterState({ feature, state, findings }) {
  const text = typeof state.bodyTextSample === "string" ? state.bodyTextSample : "";
  const url = typeof state.url === "string" ? state.url : "";
  if (!text.includes(feature.afterText)) {
    pushFinding(
      findings,
      "missing_state_text_evidence",
      `${feature.interactionId}:after-state.json`,
      feature.afterText,
    );
  }
  if (!feature.afterUrlPattern.test(url)) {
    pushFinding(
      findings,
      "missing_state_url_evidence",
      `${feature.interactionId}:after-state.json`,
      feature.afterUrlPattern.source,
    );
  }
}

async function readScreenshot(filePath, role, findings) {
  if (typeof filePath !== "string" || filePath.length === 0) {
    pushFinding(findings, "missing_screenshot_reference", role);
    return null;
  }
  if (!(await fileExists(filePath))) {
    pushFinding(findings, "missing_screenshot_file", filePath);
    return null;
  }
  const bytes = await readFile(filePath);
  const dimensions = parsePngDimensions(bytes);
  if (!dimensions) {
    pushFinding(findings, "invalid_png_screenshot", filePath);
    return null;
  }
  return {
    path: filePath,
    sha256: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
    width: dimensions.width,
    height: dimensions.height,
    bytes: bytes.length,
  };
}

function parsePngDimensions(bytes) {
  if (bytes.length < 29) return null;
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!signature.every((value, index) => bytes[index] === value)) return null;
  if (bytes.toString("ascii", 12, 16) !== "IHDR") return null;
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

async function readJson(filePath, findings, label = "json") {
  if (typeof filePath !== "string" || filePath.length === 0) {
    pushFinding(findings, "missing_json_reference", label);
    return null;
  }
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    pushFinding(
      findings,
      "invalid_json",
      filePath,
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}

async function fileExists(filePath) {
  try {
    const info = await stat(filePath);
    return info.isFile();
  } catch {
    return false;
  }
}

function result({ bundleDir, findings, screenshotEvidence }) {
  const passedFeatureCount = screenshotEvidence.length;
  return {
    schemaVersion: 1,
    ok: findings.length === 0,
    status: findings.length === 0 ? "pass" : "blocked",
    checkedAt: new Date().toISOString(),
    bundleDir,
    localCandidate: true,
    releaseReady: false,
    requiredFeatureCount: REQUIRED_FEATURES.length,
    passedFeatureCount,
    screenshotEvidence,
    findings,
  };
}

function pushFinding(findings, code, pathValue, detail = "") {
  findings.push({ code, path: pathValue, detail });
}
