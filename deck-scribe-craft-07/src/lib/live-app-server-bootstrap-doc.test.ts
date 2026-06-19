import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const DOCS = {
  textSmoke: new URL("../../docs/live_text_smoke_report.md", import.meta.url),
  progress: new URL("../../docs/live-issue-progress.md", import.meta.url),
  decision: new URL("../../docs/live-release-decision.md", import.meta.url),
} as const;

const STDIO_SHUTDOWN_DIGEST = "f35e49556578ced8eedb4f6fbe5dcdf8ee742863037c7787166cd1d4232eb1cd";

describe("live App Server bootstrap documentation", () => {
  test("records the DF-210 stdio shutdown and channel cleanup probe", () => {
    const textSmoke = readDoc(DOCS.textSmoke);
    const progress = readDoc(DOCS.progress);
    const decision = readDoc(DOCS.decision);

    expect(textSmoke.includes("Stdio Shutdown and Channel Cleanup Recheck")).toBe(true);
    expect(textSmoke.includes("3 parseable stdout protocol JSON lines")).toBe(true);
    expect(textSmoke.includes("stderr contained 0 lines")).toBe(true);
    expect(textSmoke.includes("protocolLineCount")).toBe(true);
    expect(textSmoke.includes("stderrLogLineCount")).toBe(true);
    expect(textSmoke.includes("shutdown after stdin close took 4 ms")).toBe(true);
    expect(textSmoke.includes(STDIO_SHUTDOWN_DIGEST)).toBe(true);

    expect(progress.includes("DF-210 live update")).toBe(true);
    expect(progress.includes("The child exited with code `0`, signal `null`")).toBe(true);
    expect(progress.includes("protocolLineCount")).toBe(true);
    expect(progress.includes("stderrLogLineCount")).toBe(true);
    expect(progress.includes(STDIO_SHUTDOWN_DIGEST)).toBe(true);

    expect(decision.includes("DF-210 stdio shutdown/channel cleanup probe")).toBe(true);
    expect(decision.includes("clean macOS account reproduction")).toBe(true);
    expect(decision.includes("protocolLineCount")).toBe(true);
    expect(decision.includes("stderrLogLineCount")).toBe(true);
    expect(decision.includes(STDIO_SHUTDOWN_DIGEST)).toBe(true);
  });
});

function readDoc(url: URL): string {
  return readFileSync(url, "utf8");
}
