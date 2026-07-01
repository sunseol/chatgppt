import { chromium } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STEPS, VIEWPORTS, visualQaProject } from "./full-flow-visual-qa/project.mjs";
import { installDesktopBridge, seedProject } from "./full-flow-visual-qa/browser-fixtures.mjs";
import {
  collectFailures,
  inspect,
  wirePageDiagnostics,
  writeSummary,
} from "./full-flow-visual-qa/inspect.mjs";
import {
  exercisePrimaryInteractions,
  inspectStep,
  runHomeDialogs,
} from "./full-flow-visual-qa/flows.mjs";
import { startServer, stopServer, waitForServer } from "./full-flow-visual-qa/server.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const mode = process.env.FULL_FLOW_QA_MODE ?? "production";
  const port = Number.parseInt(process.env.FULL_FLOW_QA_PORT ?? "4182", 10);
  const baseUrl = `http://127.0.0.1:${port}/`;
  const outDir = path.resolve(
    ROOT,
    process.env.FULL_FLOW_QA_OUT_DIR ?? `.omx/artifacts/full-flow-visual-qa-${mode}-${Date.now()}`,
  );

  const server = startServer({ root: ROOT, port, mode });
  let browser;
  try {
    await waitForServer(baseUrl);
    browser = await chromium.launch();
    const page = await browser.newPage();
    const diagnostics = wirePageDiagnostics(page);
    if (mode !== "development") await installDesktopBridge(page);
    await seedProject(page, visualQaProject);

    const results = [];
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport.size);
      await runHomeDialogs({ page, baseUrl, outDir, viewportName: viewport.name, results });
      for (const step of STEPS) {
        results.push(await inspectStep({ page, outDir, viewportName: viewport.name, step }));
      }
    }
    await exercisePrimaryInteractions({ page, baseUrl, outDir, results });

    const diagnosticsSnapshot = diagnostics.snapshot();
    const failures = collectFailures(results, diagnosticsSnapshot);
    const summary = {
      ok: failures.length === 0,
      mode,
      baseUrl,
      outDir,
      projectId: visualQaProject.id,
      diagnostics: diagnosticsSnapshot,
      results,
      failures,
    };
    await writeSummary(outDir, summary);
    console.log(JSON.stringify(summary, null, 2));
    if (!summary.ok) process.exitCode = 1;
  } finally {
    await browser?.close();
    await stopServer(server);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exitCode = 1;
});
