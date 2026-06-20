import { describe, expect, test } from "bun:test";
import { classifyImageProviderFailure, ImageProviderRequestError } from "./image-provider-errors";

describe("image provider error classification", () => {
  test("distinguishes live provider failures and retries only transient classes", () => {
    // Given
    const cases = [
      { kind: "auth", retryable: false },
      { kind: "quota", retryable: false },
      { kind: "rate_limit", retryable: true },
      { kind: "content_policy", retryable: false },
      { kind: "server", retryable: true },
    ] as const;

    // When
    const classifications = cases.map((item) =>
      classifyImageProviderFailure(new ImageProviderRequestError(item.kind, `${item.kind} failed`)),
    );

    // Then
    expect(classifications.map((item) => item.kind)).toEqual(cases.map((item) => item.kind));
    expect(classifications.map((item) => item.retryable)).toEqual(
      cases.map((item) => item.retryable),
    );
  });
});
