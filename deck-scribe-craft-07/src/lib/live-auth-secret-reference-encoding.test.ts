import { describe, expect, test } from "bun:test";
import { connectImageApiKeySecret, type LiveSecretStore } from "./live-auth-lifecycle";

describe("live auth secret reference encoding contract", () => {
  test("rejects secret store references that echo base64-encoded image API keys", async () => {
    const apiKey = "sk-live-secret/123+abc=";
    const encodedApiKey = btoa(apiKey).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
    const store: LiveSecretStore = {
      kind: "os_keychain",
      saveSecret: async (input) => ({
        storeKind: "os_keychain",
        service: input.service,
        account: input.account,
        secretId: `keychain://deckforge/${encodedApiKey}`,
        createdAt: input.createdAt,
      }),
      deleteSecret: async () => undefined,
    };

    let rejection: Error | undefined;
    try {
      await connectImageApiKeySecret({
        apiKey,
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

    expect(rejection?.message).toBe(
      "Secret store returned a reference containing raw secret material.",
    );
  });

  test("rejects secret store references that echo hex-encoded image API keys", async () => {
    const apiKey = "sk-live-secret/123+abc=";
    const encodedApiKey = Array.from(new TextEncoder().encode(apiKey), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    const store: LiveSecretStore = {
      kind: "os_keychain",
      saveSecret: async (input) => ({
        storeKind: "os_keychain",
        service: input.service,
        account: input.account,
        secretId: `keychain://deckforge/${encodedApiKey}`,
        createdAt: input.createdAt,
      }),
      deleteSecret: async () => undefined,
    };

    let rejection: Error | undefined;
    try {
      await connectImageApiKeySecret({
        apiKey,
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

    expect(rejection?.message).toBe(
      "Secret store returned a reference containing raw secret material.",
    );
  });
});
