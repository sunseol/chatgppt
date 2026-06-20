import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const DOC = new URL("../../docs/live-image-artifact-storage.md", import.meta.url);

describe("image artifact storage documentation", () => {
  test("records prompt and layout lineage requirements", () => {
    const text = readFileSync(DOC, "utf8");

    expect(text.includes("DF-231")).toBe(true);
    expect(text.includes("prompt id/version/hash")).toBe(true);
    expect(text.includes("layout reference")).toBe(true);
    expect(text.includes("trim-only prompt/layout lineage")).toBe(true);
    expect(text.includes("canonical provider request metadata")).toBe(true);
    expect(text.includes("usage evidence")).toBe(true);
    expect(text.includes("image-artifact-store-lineage.test.ts")).toBe(true);
    expect(text.includes("image-artifact-store-request-metadata.test.ts")).toBe(true);
  });
});
