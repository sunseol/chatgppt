import { describe, expect, test } from "bun:test";
import { disconnectImageApiKeySecret, type LiveSecretStore } from "./live-auth-lifecycle";

describe("live auth disconnect scope", () => {
  test("rejects disconnect references outside the image credential scope", async () => {
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

    // When
    let rejection: Error | undefined;
    try {
      await disconnectImageApiKeySecret({
        store,
        reference: {
          storeKind: "os_keychain",
          service: "deckforge.other.secret",
          account: "workspace@example.com",
          secretId: "keychain://deckforge/other-secret",
          createdAt: 1_000,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        rejection = error;
      } else {
        throw error;
      }
    }

    // Then
    expect(rejection?.message).toBe("Secret store returned a reference for the wrong scope.");
    expect(deletedSecretIds).toEqual([]);
  });
});
