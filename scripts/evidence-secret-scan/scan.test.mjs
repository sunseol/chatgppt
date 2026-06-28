import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { scanEvidenceSecrets } from "./scan.mjs";

describe("evidence secret scan", () => {
  test("passes a clean text evidence bundle and skips binary evidence", async () => {
    const bundle = await createBundle({
      "summary.json": '{"status":"pass","authorization":"Bearer [REDACTED]"}\n',
      "recording/video.webm": "\u0000\u0001binary",
    });

    const result = await scanEvidenceSecrets([bundle]);

    expect(result.ok).toBe(true);
    expect(result.scannedFileCount).toBe(1);
    expect(result.skippedBinaryCount).toBe(1);
    expect(result.findings).toEqual([]);
  });

  test("finds unredacted bearer, API key, assignment, and set-cookie values", async () => {
    const bundle = await createBundle({
      "network.jsonl":
        "Authorization: Bearer abcdefghijklmnopqrstuvwxyz\nset-cookie: cf=secretcookievalue\n",
      "state.json": '{"OPENAI_API_KEY":"sk-abcdefghijklmnopqrstuvwxyz","token":"secretvalue"}\n',
    });

    const result = await scanEvidenceSecrets([bundle]);

    expect(result.ok).toBe(false);
    expect(result.findings.map((finding) => finding.code)).toContain(
      "unredacted_authorization_header",
    );
    expect(result.findings.map((finding) => finding.code)).toContain("unredacted_openai_key");
    expect(result.findings.map((finding) => finding.code)).toContain(
      "unredacted_secret_assignment",
    );
    expect(result.findings.map((finding) => finding.code)).toContain("unredacted_set_cookie");
    expect(JSON.stringify(result.findings).includes("abcdefghijklmnopqrstuvwxyz")).toBe(false);
  });

  test("accepts individual evidence files as targets", async () => {
    const bundle = await createBundle({ "manifest.json": '{"ok":true}\n' });

    const result = await scanEvidenceSecrets([path.join(bundle, "manifest.json")]);

    expect(result.ok).toBe(true);
    expect(result.scannedFileCount).toBe(1);
  });
});

async function createBundle(files) {
  const bundle = await mkdtemp(path.join(os.tmpdir(), "deckforge-secret-scan-"));
  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = path.join(bundle, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, contents);
  }
  return bundle;
}
