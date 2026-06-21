import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const IMAGE_QUEUE_CONTROLS_DOC = new URL(
  "../../docs/live-image-queue-controls.md",
  import.meta.url,
);

describe("live image queue controls documentation", () => {
  test("records the provider failure evidence gate", () => {
    // Given
    const imageQueueControls = readFileSync(IMAGE_QUEUE_CONTROLS_DOC, "utf8");

    // When
    const hasProviderFailureGate =
      imageQueueControls.includes("failure_job_not_found") &&
      imageQueueControls.includes("failure_prompt_usage_missing") &&
      imageQueueControls.includes("failed provider job");

    // Then
    expect(hasProviderFailureGate).toBe(true);
  });
});
