import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { hashContent } from "./artifacts";
import {
  CORE_PROMPT_IDS,
  PROMPT_ASSET_MANIFEST,
  createCorePromptUsageRecords,
  createPromptUsageRecord,
  formatPromptVersionsForReport,
  getPromptAsset,
} from "./prompt-assets";

describe("prompt asset manifest", () => {
  test("covers every required core prompt with one versioned file", () => {
    const manifestIds = PROMPT_ASSET_MANIFEST.map((asset) => asset.promptId);
    const uniqueIds = new Set(manifestIds);

    expect(manifestIds.length).toBe(CORE_PROMPT_IDS.length);
    expect(uniqueIds.size).toBe(CORE_PROMPT_IDS.length);
    expect(CORE_PROMPT_IDS.every((promptId) => uniqueIds.has(promptId))).toBe(true);
  });

  test("points to files whose hashes match the manifest", () => {
    for (const asset of PROMPT_ASSET_MANIFEST) {
      const filePath = join(process.cwd(), asset.filePath);
      const content = readFileSync(filePath, "utf8");

      expect(/^v\d+$/.test(asset.version)).toBe(true);
      expect(asset.filePath.startsWith("prompts/")).toBe(true);
      expect(asset.filePath.endsWith(`.${asset.version}.md`)).toBe(true);
      expect(existsSync(filePath)).toBe(true);
      expect(hashContent(content)).toBe(asset.contentHash);
    }
  });

  test("creates prompt usage records for execution logs", () => {
    const usage = createPromptUsageRecord({
      promptId: "html_layout_prototype",
      artifactId: "layout_001",
      jobId: "job_001",
      recordedAt: 123,
    });

    expect(usage).toEqual({
      promptId: "html_layout_prototype",
      promptVersion: "v1",
      promptHash: getPromptAsset("html_layout_prototype").contentHash,
      promptFilePath: "prompts/html_layout_prototype.v1.md",
      stage: "layout",
      artifactId: "layout_001",
      jobId: "job_001",
      recordedAt: 123,
    });
  });

  test("formats prompt versions for final reports", () => {
    const records = createCorePromptUsageRecords({ recordedAt: 123 });
    const report = formatPromptVersionsForReport(records);

    expect(report.includes("## 9. 사용된 프롬프트 버전")).toBe(true);
    expect(report.includes("slide_generation")).toBe(true);
    expect(report.includes("final_report")).toBe(true);
    expect(report.includes("v1")).toBe(true);
  });
});
