import { describe, expect, test } from "bun:test";
import { connectImageApiKeySecret, type LiveSecretStore } from "./live-auth-lifecycle";

describe("live auth secret reference scope contract", () => {
  test("rejects secret references that drift from the saved image key scope", async () => {
    const store: LiveSecretStore = {
      kind: "os_keychain",
      saveSecret: async (input) => ({
        storeKind: "os_keychain",
        service: "deckforge.codex.session",
        account: "other-workspace@example.com",
        secretId: "keychain://deckforge/openai-image",
        createdAt: input.createdAt,
      }),
      deleteSecret: async () => undefined,
    };

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

    expect(rejection?.message).toBe("Secret store returned a reference for the wrong scope.");
  });
});
