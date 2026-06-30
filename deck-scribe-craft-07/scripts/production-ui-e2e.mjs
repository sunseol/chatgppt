#!/usr/bin/env bun

import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildProductionE2eManifest,
  buildProductionE2eSummary,
} from "./production-ui-e2e/evidence-model.mjs";
import { readProductionE2eArtifactIdentity } from "./production-ui-e2e/artifact-identity.mjs";
import { collectGitEvidence } from "./production-ui-e2e/git-evidence.mjs";
import { writeProductionE2eVerification } from "./production-ui-e2e/evidence-validator.mjs";
import { installProductionE2eBridge } from "./production-ui-e2e/desktop-bridge.mjs";
import { InteractionRecorder, target } from "./production-ui-e2e/interaction-recorder.mjs";
import { runLiveTextEvidenceFlow } from "./production-ui-e2e/live-text-flow.mjs";
import { startServer, stopServer, waitForServer } from "./full-flow-visual-qa/server.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const port = Number.parseInt(process.env.DECKFORGE_PRODUCTION_E2E_PORT ?? "4185", 10);
  const externalBaseUrl = process.env.DECKFORGE_PRODUCTION_E2E_BASE_URL;
  const baseUrl = externalBaseUrl ?? `http://127.0.0.1:${port}/`;
  const mode = externalBaseUrl ? "external-packaged-or-preview-url" : "local-production-preview";
  const artifactIdentity = readProductionE2eArtifactIdentity();
  const outDir = path.resolve(
    ROOT,
    process.env.DECKFORGE_PRODUCTION_E2E_OUT_DIR ??
      `.omx/artifacts/production-ui-e2e-${Date.now()}`,
  );
  const recordingDir = path.join(outDir, "recording");
  await mkdir(recordingDir, { recursive: true });

  const server = externalBaseUrl ? null : startServer({ root: ROOT, port, mode: "production" });
  let browser;
  let context;
  let summary;
  try {
    if (!externalBaseUrl) await waitForServer(baseUrl);
    browser = await chromium.launch();
    context = await browser.newContext({
      viewport: { width: 1440, height: 960 },
      recordVideo: { dir: recordingDir, size: { width: 1440, height: 960 } },
    });
    const page = await context.newPage();
    const recorder = new InteractionRecorder({ page, outDir });
    recorder.attachNetworkCapture();
    await installProductionE2eBridge(page, (event) => recorder.recordIpc(event));

    const failures = [];
    try {
      await runFlow({ page, recorder, baseUrl });
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }

    const video = page.video();
    await context.close();
    context = null;
    const recordingPath = video ? await video.path() : null;
    summary = buildProductionE2eSummary({
      ok: failures.length === 0,
      mode,
      baseUrl,
      outDir,
      artifactIdentity,
      interactions: recorder.interactions,
      failures,
      recordingPath,
    });
    const manifest = buildProductionE2eManifest({
      summary,
      generatedAt: new Date().toISOString(),
      source: await collectGitEvidence(ROOT),
    });
    await writeFile(path.join(outDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
    await writeFile(path.join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    const verification = await writeProductionE2eVerification(outDir);
    console.log(JSON.stringify(summary, null, 2));
    if (!summary.ok || !verification.ok) process.exitCode = 1;
  } finally {
    await context?.close();
    await browser?.close();
    if (server) await stopServer(server);
  }
}

async function runFlow({ page, recorder, baseUrl }) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await expectEmptyHome(page);

  await recorder.capture(
    1,
    "Open settings",
    target(page.getByRole("button", { name: "연결 및 실행 환경", exact: true }), {
      role: "button",
      accessibleName: "연결 및 실행 환경",
      exact: true,
    }),
    async () => {
      await page.getByRole("button", { name: "연결 및 실행 환경", exact: true }).click();
      await page.getByRole("dialog").waitFor({ timeout: 5_000 });
    },
  );
  await recorder.capture(
    2,
    "Codex status check",
    target(page.getByRole("button", { name: "Codex 상태 확인", exact: true }), {
      role: "button",
      accessibleName: "Codex 상태 확인",
      exact: true,
    }),
    async () => {
      await page.getByRole("button", { name: "Codex 상태 확인", exact: true }).click();
      await page
        .getByText(/Logged in using ChatGPT|Codex CLI 로그인됨/)
        .waitFor({ timeout: 5_000 });
    },
  );
  await recorder.capture(
    3,
    "Codex login",
    target(page.getByRole("button", { name: "Codex 로그인", exact: true }), {
      role: "button",
      accessibleName: "Codex 로그인",
      exact: true,
    }),
    async () => {
      await page.getByRole("button", { name: "Codex 로그인", exact: true }).click();
      await page.getByText(/codex login|창을 열었습니다/).waitFor({ timeout: 5_000 });
    },
  );
  await page.keyboard.press("Escape");

  await recorder.capture(
    4,
    "Open new project",
    target(page.getByRole("button", { name: "새 프로젝트", exact: true }).first(), {
      role: "button",
      accessibleName: "새 프로젝트",
      exact: true,
    }),
    async () => {
      await page.getByRole("button", { name: "새 프로젝트", exact: true }).first().click();
      await page.getByRole("dialog").waitFor({ timeout: 5_000 });
    },
  );
  await recorder.capture(
    5,
    "Choose project preset",
    target(page.getByRole("button", { name: /AI 슬라이드 제작 시스템 피치덱/ }).first(), {
      role: "button",
      accessibleName: "AI 슬라이드 제작 시스템 피치덱",
      exact: false,
    }),
    async () => {
      await page
        .getByRole("button", { name: /AI 슬라이드 제작 시스템 피치덱/ })
        .first()
        .click();
    },
  );
  await recorder.capture(
    6,
    "Create project",
    target(page.getByRole("button", { name: "프로젝트 만들기", exact: true }), {
      role: "button",
      accessibleName: "프로젝트 만들기",
      exact: true,
    }),
    async () => {
      await page.getByRole("button", { name: "프로젝트 만들기", exact: true }).click();
      await page.waitForURL(/\/project\/[^/]+\/interview/, { timeout: 10_000 });
      await page.getByRole("button", { name: "라이브 인터뷰 실행", exact: true }).waitFor({
        timeout: 10_000,
      });
    },
  );
  await recorder.capture(
    7,
    "Run live interview",
    target(page.getByRole("button", { name: "라이브 인터뷰 실행", exact: true }), {
      role: "button",
      accessibleName: "라이브 인터뷰 실행",
      exact: true,
    }),
    async () => {
      await page.getByRole("button", { name: "라이브 인터뷰 실행", exact: true }).click();
      await page.getByText("인터뷰 질문이 준비되었습니다").last().waitFor({ timeout: 10_000 });
    },
  );
  await recorder.capture(
    8,
    "Answer live interview",
    target(page.getByRole("textbox").first(), {
      role: "textbox",
      accessibleName: "이 덱으로 어떤 다음 행동을 유도하나요?",
      exact: false,
    }),
    async () => {
      await page.getByRole("textbox").first().fill("후속 투자 미팅을 요청하도록 설득합니다.");
      await page.getByText("모든 필수 답변 입력 완료").waitFor({ timeout: 5_000 });
    },
  );
  await recorder.capture(
    9,
    "Generate live brief",
    target(page.getByRole("button", { name: "답변 제출하고 브리프 생성", exact: true }).last(), {
      role: "button",
      accessibleName: "답변 제출하고 브리프 생성",
      exact: true,
    }),
    async () => {
      await page
        .getByRole("button", { name: "답변 제출하고 브리프 생성", exact: true })
        .last()
        .click();
      await page
        .getByText("라이브 인터뷰 브리프가 준비되었습니다")
        .last()
        .waitFor({ timeout: 10_000 });
    },
  );
  await recorder.capture(
    10,
    "Approve live brief",
    target(page.getByRole("button", { name: "Live brief 승인하고 조사로 이동", exact: true }), {
      role: "button",
      accessibleName: "Live brief 승인하고 조사로 이동",
      exact: true,
    }),
    async () => {
      await page
        .getByRole("button", { name: "Live brief 승인하고 조사로 이동", exact: true })
        .click();
      await page.waitForURL(/\/project\/[^/]+\/research/, { timeout: 10_000 });
    },
  );
  await runLiveTextEvidenceFlow({ page, recorder });
}

async function expectEmptyHome(page) {
  await page
    .getByText("아직 프로젝트가 없습니다. 새 프로젝트를 만들면 인터뷰부터 시작됩니다.")
    .waitFor({
      timeout: 5_000,
    });
}

main().catch((error) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exitCode = 1;
});
