import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const DOC = new URL("../../docs/live-image-path-decision.md", import.meta.url);

describe("image path decision documentation", () => {
  test("records slide-matched binary artifact evidence", () => {
    const text = readFileSync(DOC, "utf8");

    expect(text.includes("DF-230")).toBe(true);
    expect(text.includes("binary_artifact_slide_mismatch")).toBe(true);
    expect(text.includes("provenance_auth_mode_mismatch")).toBe(true);
    expect(text.includes("same slide as the successful artifact")).toBe(true);
  });
});
