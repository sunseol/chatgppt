import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { frontendQaProject } from "./frontend-screen-qa-project.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_PORT = 8090;
const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 960 };
const PROJECT_STORAGE_KEY = "deckforge.projects.v1";

async function main() {
  const port = Number.parseInt(process.env.FRONTEND_QA_PORT ?? String(DEFAULT_PORT), 10);
  const baseUrl = `http://127.0.0.1:${port}/`;
  const outDir = path.resolve(
    ROOT,
    process.env.FRONTEND_QA_OUT_DIR ?? `.omx/artifacts/frontend-screen-qa-${Date.now()}`,
  );
  await mkdir(outDir, { recursive: true });
  const server = startDevServer(port);
  let browser;
  try {
    await waitForServer(baseUrl);
    browser = await chromium.launch();
    const page = await browser.newPage();
    await seedProject(page, baseUrl);
    const results = await runScreens(page, baseUrl, outDir);
    await writeFile(path.join(outDir, "summary.json"), JSON.stringify(results, null, 2));
    failOnHorizontalOverflow(results);
    console.log(`Frontend screen QA passed. Artifacts: ${outDir}`);
  } finally {
    await browser?.close();
    await stopServer(server);
  }
}

async function runScreens(page, baseUrl, outDir) {
  const results = [];
  await page.setViewportSize(MOBILE);
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  results.push(await inspect(page, "mobile-home", outDir));
  await page.getByLabel("새 프로젝트").click();
  results.push(await inspect(page, "mobile-new-project", outDir));
  await page.keyboard.press("Escape");
  await page.getByLabel("연결 및 실행 환경").click();
  results.push(await inspect(page, "mobile-settings", outDir));
  await page.keyboard.press("Escape");
  for (const step of ["generate", "editor"]) {
    await page.goto(`${baseUrl}project/${frontendQaProject.id}/${step}`, {
      waitUntil: "networkidle",
    });
    results.push(await inspect(page, `mobile-project-${step}`, outDir));
  }
  await page.setViewportSize(DESKTOP);
  for (const step of ["generate", "editor"]) {
    await page.goto(`${baseUrl}project/${frontendQaProject.id}/${step}`, {
      waitUntil: "networkidle",
    });
    results.push(await inspect(page, `desktop-project-${step}`, outDir));
  }
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByLabel("연결 및 실행 환경").click();
  results.push(await inspect(page, "desktop-settings", outDir));
  return results;
}

async function seedProject(page, baseUrl) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.evaluate(
    ([key, value]) => window.localStorage.setItem(key, JSON.stringify([value])),
    [PROJECT_STORAGE_KEY, frontendQaProject],
  );
}

async function inspect(page, name, outDir) {
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: false });
  const metrics = await page.evaluate(() => {
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const nodes = Array.from(
      document.querySelectorAll('button,a,input,textarea,select,summary,[role="button"]'),
    );
    const visible = nodes.flatMap((node) => {
      const rect = node.getBoundingClientRect();
      const style = window.getComputedStyle(node);
      if (style.visibility === "hidden" || style.display === "none") return [];
      if (rect.width <= 0 || rect.height <= 0) return [];
      const label =
        node.getAttribute("aria-label") ?? node.textContent ?? node.getAttribute("title");
      return [
        {
          text: (label ?? "").trim().replace(/\s+/g, " ").slice(0, 80),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          top: Math.round(rect.top),
          bottom: Math.round(rect.bottom),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
      ];
    });
    const horizontalOffscreen = visible.filter(
      (item) => item.left < -1 || item.right > viewport.width + 1,
    );
    return {
      viewport,
      overflowX: Math.max(0, document.documentElement.scrollWidth - viewport.width),
      horizontalOffscreen,
    };
  });
  return { name, ...metrics };
}

function startDevServer(port) {
  return spawn("bun", ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(port)], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function waitForServer(baseUrl) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 20_000) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch (error) {
      if (!(error instanceof Error)) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${baseUrl}`);
}

async function stopServer(server) {
  if (server.exitCode !== null) return;
  server.kill("SIGTERM");
  await new Promise((resolve) => server.once("exit", resolve));
}

function failOnHorizontalOverflow(results) {
  const failures = results.filter(
    (result) => result.overflowX > 0 || result.horizontalOffscreen.length > 0,
  );
  if (failures.length === 0) return;
  throw new Error(
    failures
      .map((result) => {
        const labels = result.horizontalOffscreen.map((item) => item.text || "[unlabelled]");
        return `${result.name}: overflowX=${result.overflowX}, offscreen=${labels.join(" | ")}`;
      })
      .join("\n"),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
