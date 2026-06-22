import { describe, expect, test } from "bun:test";
import { connectImageApiKeySecret, type LiveSecretStore } from "./live-auth-lifecycle";

describe("live auth secret reference timestamp contract", () => {
  test("rejects secret references whose created timestamp drifts from the save request", async () => {
    // Given
    const store: LiveSecretStore = {
      kind: "os_keychain",
      saveSecret: async (input) => ({
        storeKind: "os_keychain",
        service: input.service,
        account: input.account,
        secretId: "keychain://deckforge/openai-image",
        createdAt: input.createdAt + 1,
      }),
      deleteSecret: async () => undefined,
    };

    // When
    let rejection: Error | undefined;
    try {
      await connectImageApiKeySecret({
        apiKey: "sk-live-secret-value",
        store,
        account: "workspace@example.com",
        now: () => 1_000,
      });
    } catch (error) {
      if (error instanceof Error) {
        rejection = error;
      } else {
        throw error;
      }
    }

    // Then
    expect(rejection?.message).toBe("Secret store returned a reference with drifted timestamp.");
  });
});
