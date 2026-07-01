import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { GPPT_UI_CONTRACT } from "./contract.mjs";

const RESULT_JSON = "gppt-ui-contract-results.json";
const RESULT_MARKDOWN = "gppt-ui-contract-results.md";

export async function validateGpptUiContractBundle(bundleDir) {
  const findings = [];
  const resultsPath = path.join(bundleDir, RESULT_JSON);
  const markdownPath = path.join(bundleDir, RESULT_MARKDOWN);
  const summary = await readJson(resultsPath, findings);
  const markdown = await readText(markdownPath, findings);

  if (summary) validateSummary(summary, findings, resultsPath);
  if (markdown) validateMarkdown(markdown, findings, markdownPath);

  return {
    ok: findings.length === 0,
    bundleDir,
    checkedAt: new Date().toISOString(),
    expectedCount: GPPT_UI_CONTRACT.length,
    checkedResultCount: Array.isArray(summary?.results) ? summary.results.length : 0,
    findings,
  };
}

export async function writeGpptUiContractVerification(bundleDir) {
  const verification = await validateGpptUiContractBundle(bundleDir);
  await writeFile(
    path.join(bundleDir, "verification.json"),
    `${JSON.stringify(verification, null, 2)}\n`,
  );
  return verification;
}

function validateSummary(summary, findings, filePath) {
  if (summary.ok !== true) pushFinding(findings, "summary_not_ok", filePath);
  if (summary.total !== GPPT_UI_CONTRACT.length)
    pushFinding(findings, "unexpected_total", filePath);
  if (summary.passed !== GPPT_UI_CONTRACT.length) {
    pushFinding(findings, "unexpected_passed_count", filePath);
  }
  if (summary.failed !== 0) pushFinding(findings, "unexpected_failed_count", filePath);
  if (!Array.isArray(summary.results)) {
    pushFinding(findings, "missing_results_array", filePath);
    return;
  }

  const seen = new Set();
  for (const expected of GPPT_UI_CONTRACT) {
    const result = summary.results.find((entry) => entry.id === expected.id);
    if (!result) {
      pushFinding(findings, "missing_contract_result", filePath, expected.id);
      continue;
    }
    if (seen.has(result.id))
      pushFinding(findings, "duplicate_contract_result", filePath, result.id);
    seen.add(result.id);
    validateResult(expected, result, findings, filePath);
  }
  for (const result of summary.results) {
    if (!GPPT_UI_CONTRACT.some((entry) => entry.id === result.id)) {
      pushFinding(findings, "unexpected_contract_result", filePath, result.id ?? "unknown");
    }
  }
}

function validateResult(expected, result, findings, filePath) {
  for (const key of ["screen", "role", "name", "exact", "expectedEnabled"]) {
    if (result[key] !== expected[key]) {
      pushFinding(findings, "contract_result_mismatch", filePath, `${expected.id}.${key}`);
    }
  }
  if (result.ok !== true) pushFinding(findings, "contract_result_not_ok", filePath, expected.id);
  if (result.count !== 1)
    pushFinding(findings, "contract_result_not_unique", filePath, expected.id);
  if (result.enabled !== expected.expectedEnabled) {
    pushFinding(findings, "contract_result_enabled_mismatch", filePath, expected.id);
  }
  if (result.skipped === true || result.expectedFailure === true) {
    pushFinding(findings, "contract_result_skip_marker", filePath, expected.id);
  }
}

function validateMarkdown(markdown, findings, filePath) {
  for (const expected of GPPT_UI_CONTRACT) {
    if (!markdown.includes(`| ${expected.id} |`)) {
      pushFinding(findings, "missing_markdown_row", filePath, expected.id);
    }
  }
}

async function readJson(filePath, findings) {
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

async function readText(filePath, findings) {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    pushFinding(
      findings,
      "missing_text_file",
      filePath,
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}

function pushFinding(findings, code, filePath, detail = "") {
  findings.push({ code, filePath, detail });
}
