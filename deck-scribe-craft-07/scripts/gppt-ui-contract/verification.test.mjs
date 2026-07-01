import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { GPPT_UI_CONTRACT } from "./contract.mjs";
import { validateGpptUiContractBundle } from "./verification.mjs";

describe("GPPT UI contract bundle verification", () => {
  test("passes for a complete 40 item contract result bundle", async () => {
    const bundle = await createBundle({
      results: GPPT_UI_CONTRACT.map((entry) => passingResult(entry)),
    });

    const verification = await validateGpptUiContractBundle(bundle);

    expect(verification.ok).toBe(true);
    expect(verification.checkedResultCount).toBe(40);
    expect(verification.findings).toEqual([]);
  });

  test("fails when a contract result is skipped instead of actually checked", async () => {
    const results = GPPT_UI_CONTRACT.map((entry) => passingResult(entry));
    results[0] = { ...results[0], skipped: true };
    const bundle = await createBundle({ results });

    const verification = await validateGpptUiContractBundle(bundle);

    expect(verification.ok).toBe(false);
    expect(
      verification.findings.some((finding) => finding.code === "contract_result_skip_marker"),
    ).toBe(true);
  });

  test("fails when the markdown evidence table omits an item", async () => {
    const bundle = await createBundle({
      results: GPPT_UI_CONTRACT.map((entry) => passingResult(entry)),
      omitMarkdownId: "GPPT-UI-040",
    });

    const verification = await validateGpptUiContractBundle(bundle);

    expect(verification.ok).toBe(false);
    expect(verification.findings.some((finding) => finding.code === "missing_markdown_row")).toBe(
      true,
    );
  });
});

async function createBundle({ results, omitMarkdownId = null }) {
  const bundle = await mkdtemp(path.join(os.tmpdir(), "deckforge-ui-contract-"));
  await mkdir(bundle, { recursive: true });
  const summary = {
    ok: true,
    baseUrl: "http://127.0.0.1:4195/",
    outDir: bundle,
    total: 40,
    passed: 40,
    failed: 0,
    results,
  };
  await writeFile(
    path.join(bundle, "gppt-ui-contract-results.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  await writeFile(path.join(bundle, "gppt-ui-contract-results.md"), renderMarkdown(omitMarkdownId));
  return bundle;
}

function passingResult(entry) {
  return {
    ...entry,
    count: 1,
    enabled: entry.expectedEnabled,
    ok: true,
    screenshot: null,
  };
}

function renderMarkdown(omitId) {
  const rows = GPPT_UI_CONTRACT.filter((entry) => entry.id !== omitId).map(
    (entry) => `| ${entry.id} | ${entry.screen} | ${entry.role} | ${entry.name} | PASS |`,
  );
  return `# GPPT UI Accessible-Name Contract\n\n${rows.join("\n")}\n`;
}
