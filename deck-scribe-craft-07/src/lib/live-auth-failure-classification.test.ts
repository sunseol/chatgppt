import { describe, expect, test } from "bun:test";
import { classifyLiveAuthFailure } from "./live-auth-lifecycle";

describe("live auth failure classification evidence", () => {
  test("keeps expired login distinct when the provider reports expiry in message text", () => {
    // Given
    const expiredByMessage = {
      statusCode: 401,
      providerMessage: "Session expired. Sign in again before starting live jobs.",
    };
    const expiredByReason = {
      statusCode: 401,
      reason: "login_expired",
    };

    // When
    const byMessage = classifyLiveAuthFailure(expiredByMessage);
    const byReason = classifyLiveAuthFailure(expiredByReason);

    // Then
    expect(byMessage.kind).toBe("login_expired");
    expect(byReason.kind).toBe("login_expired");
  });

  test("keeps organization verification distinct from generic permission failures", () => {
    // Given
    const failure = {
      statusCode: 403,
      providerMessage: "Please verify your organization before using this live model.",
    };

    // When
    const classified = classifyLiveAuthFailure(failure);

    // Then
    expect(classified.kind).toBe("organization_verification_required");
  });
});
