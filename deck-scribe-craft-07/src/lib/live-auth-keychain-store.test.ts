import { describe, expect, test } from "bun:test";
import { connectImageApiKeySecret, type LiveSecretStore } from "./live-auth-lifecycle";

describe("live auth image secret store kind", () => {
  test("blocks equivalent secret stores for image API key persistence", async () => {
    // Given
    const store: LiveSecretStore = {
      kind: "equivalent_secret_store",
      saveSecret: async (input) => ({
        storeKind: "equivalent_secret_store",
        service: input.service,
        account: input.account,
        secretId: "secret-store://deckforge/openai-image",
        createdAt: input.createdAt,
      }),
      deleteSecret: async () => undefined,
    };

    // When
    let rejection: Error | undefined;
    try {
      await connectImageApiKeySecret({
        apiKey: "test-live-secret-value",
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
    expect(rejection?.message).toBe("Secret store returned an unsupported store kind.");
  });
});
