#!/usr/bin/env bun

import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GPPT_UI_CONTRACT, validateContractDefinition } from "./gppt-ui-contract/contract.mjs";
import { writeGpptUiContractVerification } from "./gppt-ui-contract/verification.mjs";
import { installProductionE2eBridge } from "./production-ui-e2e/desktop-bridge.mjs";
import { startServer, stopServer, waitForServer } from "./full-flow-visual-qa/server.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const port = Number.parseInt(process.env.DECKFORGE_UI_CONTRACT_PORT ?? "4195", 10);
  const externalBaseUrl = process.env.DECKFORGE_UI_CONTRACT_BASE_URL;
  const baseUrl = externalBaseUrl ?? `http://127.0.0.1:${port}/`;
  const outDir = path.resolve(
    ROOT,
    process.env.DECKFORGE_UI_CONTRACT_OUT_DIR ?? `.omx/artifacts/gppt-ui-contract-${Date.now()}`,
  );
  await mkdir(outDir, { recursive: true });

  const definitionIssues = validateContractDefinition(GPPT_UI_CONTRACT);
  const server = externalBaseUrl ? null : startServer({ root: ROOT, port, mode: "production" });
  let browser;
  let context;
  let summary;
  try {
    if (!externalBaseUrl) await waitForServer(baseUrl);
    browser = await chromium.launch();
    context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
    const page = await context.newPage();
    await installProductionE2eBridge(page, () => {});
    const results = definitionIssues.map((issue) => ({
      id: "GPPT-UI-CONTRACT",
      screen: "definition",
      role: "definition",
      name: issue,
      exact: true,
      expectedEnabled: true,
      count: 0,
      enabled: false,
      ok: false,
      error: issue,
    }));
    if (definitionIssues.length === 0) {
      try {
        await runContractFlow({ page, baseUrl, outDir, results });
      } catch (error) {
        const screenshot = path.join(outDir, "flow-error.png");
        await page.screenshot({ path: screenshot, fullPage: true });
        results.push({
          id: "GPPT-UI-FLOW",
          screen: "flow",
          role: "flow",
          name: error instanceof Error ? error.message : String(error),
          exact: true,
          expectedEnabled: true,
          count: 0,
          enabled: false,
          ok: false,
          error: error instanceof Error ? (error.stack ?? error.message) : String(error),
          screenshot,
        });
      }
    }
    summary = buildSummary({ baseUrl, outDir, results });
    await writeFile(path.join(outDir, "gppt-ui-contract-results.json"), toJson(summary));
    await writeFile(path.join(outDir, "gppt-ui-contract-results.md"), renderMarkdown(summary));
    const verification = await writeGpptUiContractVerification(outDir);
    console.log(JSON.stringify(summary, null, 2));
    if (!summary.ok || !verification.ok) process.exitCode = 1;
  } finally {
    await context?.close();
    await browser?.close();
    if (server) await stopServer(server);
  }
}

async function runContractFlow({ page, baseUrl, outDir, results }) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page
    .getByText("아직 프로젝트가 없습니다. 새 프로젝트를 만들면 인터뷰부터 시작됩니다.")
    .waitFor({ timeout: 5_000 });
  await verifyScreen({ page, screen: "home-empty", outDir, results });

  await openDialog(page, "연결 및 실행 환경");
  await verifyScreen({ page, screen: "settings-dialog", outDir, results });
  await closeDialog(page);

  await openDialog(page, "로컬 데이터");
  await verifyScreen({ page, screen: "local-data-empty", outDir, results });
  await closeDialog(page);

  await openDialog(page, "새 프로젝트");
  await verifyScreen({ page, screen: "new-project-dialog", outDir, results });
  await page.getByRole("button", { name: "AI 슬라이드 제작 시스템 피치덱", exact: true }).click();
  await page.getByRole("button", { name: "프로젝트 만들기", exact: true }).click();
  await page.waitForURL(/\/project\/[^/]+\/interview/, { timeout: 10_000 });
  await page.getByRole("button", { name: "라이브 인터뷰 실행", exact: true }).waitFor({
    timeout: 10_000,
  });

  await verifyScreen({ page, screen: "interview-initial", outDir, results });
  await page.getByRole("button", { name: "라이브 인터뷰 실행", exact: true }).click();
  await page.getByText("인터뷰 질문이 준비되었습니다").last().waitFor({ timeout: 10_000 });

  await verifyScreen({ page, screen: "interview-questions", outDir, results });
  await page
    .getByRole("textbox", { name: "이 덱으로 어떤 다음 행동을 유도하나요?", exact: true })
    .fill("후속 투자 미팅을 요청하도록 설득합니다.");
  await page.getByText("모든 필수 답변 입력 완료").waitFor({ timeout: 5_000 });

  await verifyScreen({ page, screen: "interview-answered", outDir, results });
  await page.getByRole("button", { name: "답변 제출하고 브리프 생성", exact: true }).click();
  await page.getByText("라이브 인터뷰 브리프가 준비되었습니다").last().waitFor({
    timeout: 10_000,
  });

  await verifyScreen({ page, screen: "interview-brief", outDir, results });
  await page.getByRole("button", { name: "Live brief 승인하고 조사로 이동", exact: true }).click();
  await page.waitForURL(/\/project\/[^/]+\/research/, { timeout: 10_000 });

  await verifyScreen({ page, screen: "research", outDir, results });
  await page.getByRole("link", { name: "프로젝트 목록", exact: true }).click();
  await page.waitForURL(baseUrl, { timeout: 10_000 });
  await verifyScreen({ page, screen: "home-project", outDir, results });
}

async function verifyScreen({ page, screen, outDir, results }) {
  const entries = GPPT_UI_CONTRACT.filter((entry) => entry.screen === screen);
  const screenResults = [];
  for (const entry of entries) {
    const locator = page.getByRole(entry.role, { name: entry.name, exact: entry.exact });
    const count = await locator.count();
    const enabled = count === 1 ? await locator.isEnabled() : false;
    const ok = count === 1 && enabled === entry.expectedEnabled;
    screenResults.push({ ...entry, count, enabled, ok });
  }
  const failures = screenResults.filter((result) => !result.ok);
  let screenshot = null;
  if (failures.length > 0) {
    screenshot = path.join(outDir, `${screen}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
  }
  for (const result of screenResults) results.push({ ...result, screenshot });
}

async function openDialog(page, name) {
  await page.getByRole("button", { name, exact: true }).click();
  await page.getByRole("dialog").waitFor({ timeout: 5_000 });
}

async function closeDialog(page) {
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden", timeout: 5_000 });
}

function buildSummary({ baseUrl, outDir, results }) {
  const failures = results.filter((result) => !result.ok);
  return {
    ok: failures.length === 0,
    baseUrl,
    outDir,
    total: results.length,
    passed: results.length - failures.length,
    failed: failures.length,
    results,
  };
}

function renderMarkdown(summary) {
  const lines = [
    "# GPPT UI Accessible-Name Contract",
    "",
    `- Result: ${summary.ok ? "PASS" : "FAIL"}`,
    `- Passed: ${summary.passed}/${summary.total}`,
    `- Base URL: ${summary.baseUrl}`,
    "",
    "| ID | Screen | Role | Exact accessible name | Expected enabled | Count | Enabled | Result |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const result of summary.results) {
    lines.push(
      `| ${result.id} | ${result.screen} | ${result.role} | ${result.name} | ${result.expectedEnabled} | ${result.count} | ${result.enabled} | ${result.ok ? "PASS" : "FAIL"} |`,
    );
  }
  return `${lines.join("\n")}\n`;
}

function toJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

main().catch((error) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exitCode = 1;
});
