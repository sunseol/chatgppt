import { describe, expect, test } from "bun:test";
import {
  disconnectImageApiKeySecret,
  type LiveSecretReference,
  type LiveSecretStore,
} from "./live-auth-lifecycle";

describe("live auth secret disconnect store contract", () => {
  test("blocks deleting a secret reference with a different store kind", async () => {
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
      storeKind: "equivalent_secret_store",
      service: "deckforge.openai.image",
      account: "workspace@example.com",
      secretId: "secret-store://deckforge/openai-image",
      createdAt: 1_000,
    };

    let rejection: Error | undefined;
    try {
      await disconnectImageApiKeySecret({ store, reference });
    } catch (error) {
      if (error instanceof Error) {
        rejection = error;
      } else {
        throw error;
      }
    }

    expect(rejection?.message).toBe("Secret store returned an unsupported store kind.");
    expect(deletedSecretIds).toEqual([]);
  });
});
