import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const SLIDE_REGENERATION_DOC = new URL("../../docs/live-slide-regeneration.md", import.meta.url);

describe("live full-slide regeneration documentation", () => {
  test("records the DF-235 regeneration request and candidate blockers", () => {
    const slideRegeneration = readFileSync(SLIDE_REGENERATION_DOC, "utf8");

    expect(slideRegeneration.includes("DF-235")).toBe(true);
    expect(slideRegeneration.includes("deckContextId")).toBe(true);
    expect(slideRegeneration.includes("designSystemId")).toBe(true);
    expect(slideRegeneration.includes("missing_must_keep_targets")).toBe(true);
    expect(slideRegeneration.includes("missing_must_change_targets")).toBe(true);
    expect(slideRegeneration.includes("revision_targets_overlap")).toBe(true);
    expect(slideRegeneration.includes("background_artifact_not_new")).toBe(true);
    expect(slideRegeneration.includes("background_artifact_version_mismatch")).toBe(true);
    expect(slideRegeneration.includes("mock_background_artifact")).toBe(true);
    expect(slideRegeneration.includes("regeneration_request_provenance_mismatch")).toBe(true);
    expect(slideRegeneration.includes("preserved approved slide")).toBe(true);
  });
});
