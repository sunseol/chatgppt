import { describe, expect, test } from "bun:test";
import {
  connectImageApiKeySecret,
  disconnectImageApiKeySecret,
  type LiveSecretReference,
  type LiveSecretStore,
} from "./live-auth-lifecycle";

describe("live auth secret reference identity contract", () => {
  test("rejects blank secret reference ids before treating credentials as stored", async () => {
    // Given
    const store: LiveSecretStore = {
      kind: "os_keychain",
      saveSecret: async (input) => ({
        storeKind: "os_keychain",
        service: input.service,
        account: input.account,
        secretId: "   ",
        createdAt: input.createdAt,
      }),
      deleteSecret: async () => undefined,
    };

    // When
    const rejection = await captureError(() =>
      connectImageApiKeySecret({
        apiKey: "sk-live-secret-value",
        store,
        account: "workspace@example.com",
        now: () => 1_000,
      }),
    );

    // Then
    expect(rejection?.message).toBe("Secret store returned an invalid reference identity.");
  });

  test("rejects non-canonical secret reference ids before deleting credentials", async () => {
    // Given
    const deletedSecretIds: string[] = [];
    const store: LiveSecretStore = {
      kind: "os_keychain",
      saveSecret: async () => {
        throw new Error("saveSecret should not run during disconnect.");
      },
      deleteSecret: async (reference) => {
        deletedSecretIds.push(reference.secretId);
      },
    };
    const reference: LiveSecretReference = {
      storeKind: "os_keychain",
      service: "deckforge.openai.image",
      account: "workspace@example.com",
      secretId: " keychain://deckforge/openai-image ",
      createdAt: 1_000,
    };

    // When
    const rejection = await captureError(() => disconnectImageApiKeySecret({ store, reference }));

    // Then
    expect(rejection?.message).toBe("Secret store returned an invalid reference identity.");
    expect(deletedSecretIds).toEqual([]);
  });
});

async function captureError(run: () => Promise<unknown>): Promise<Error | undefined> {
  try {
    await run();
    return undefined;
  } catch (error) {
    if (error instanceof Error) return error;
    throw error;
  }
}
