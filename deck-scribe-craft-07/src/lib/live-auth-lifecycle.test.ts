import { describe, expect, test } from "bun:test";
import {
  cancelLiveJobsForAuthLogout,
  classifyLiveAuthFailure,
  connectImageApiKeySecret,
  createLiveAuthLogoutLockState,
  disconnectImageApiKeySecret,
  type LiveSecretStore,
} from "./live-auth-lifecycle";
import { createProviderJobManager } from "./provider-job-manager";

describe("live auth and secret lifecycle", () => {
  test("stores an image API key through a secret store and returns only a reference", async () => {
    const writes: string[] = [];
    const store: LiveSecretStore = {
      kind: "os_keychain",
      saveSecret: async (input) => {
        writes.push(input.secretValue);
        return {
          storeKind: "os_keychain",
          service: input.service,
          account: input.account,
          secretId: "keychain://deckforge/openai-image",
          createdAt: input.createdAt,
        };
      },
      deleteSecret: async () => undefined,
    };

    const state = await connectImageApiKeySecret({
      apiKey: "test-live-secret-value",
      store,
      account: "workspace@example.com",
      now: () => 1_000,
    });

    expect(writes).toEqual(["test-live-secret-value"]);
    expect(state.credentialState).toBe("stored");
    expect(state.secretReference.storeKind).toBe("os_keychain");
    expect(JSON.stringify(state).includes("test-live-secret-value")).toBe(false);
  });

  test("rejects secret store references that echo the raw image API key", async () => {
    const store: LiveSecretStore = {
      kind: "os_keychain",
      saveSecret: async (input) => ({
        storeKind: "os_keychain",
        service: input.service,
        account: input.account,
        secretId: `keychain://deckforge/${input.secretValue}`,
        createdAt: input.createdAt,
      }),
      deleteSecret: async () => undefined,
    };

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

    expect(rejection?.message).toBe(
      "Secret store returned a reference containing raw secret material.",
    );
  });

  test("rejects secret store references that echo URL-encoded image API keys", async () => {
    // Given
    const store: LiveSecretStore = {
      kind: "os_keychain",
      saveSecret: async (input) => ({
        storeKind: "os_keychain",
        service: input.service,
        account: input.account,
        secretId: `keychain://deckforge/${encodeURIComponent(input.secretValue)}`,
        createdAt: input.createdAt,
      }),
      deleteSecret: async () => undefined,
    };

    // When
    let rejection: Error | undefined;
    try {
      await connectImageApiKeySecret({
        apiKey: "sk-live-secret/123+abc=",
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
    expect(rejection?.message).toBe(
      "Secret store returned a reference containing raw secret material.",
    );
  });

  test("disconnects an image API key without returning a secret reference", async () => {
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

    const state = await disconnectImageApiKeySecret({
      store,
      reference: {
        storeKind: "os_keychain",
        service: "deckforge.openai.image",
        account: "workspace@example.com",
        secretId: "keychain://deckforge/openai-image",
        createdAt: 1_000,
      },
    });

    expect(deletedSecretIds).toEqual(["keychain://deckforge/openai-image"]);
    expect(state.credentialState).toBe("missing");
    expect(JSON.stringify(state).includes("keychain://deckforge/openai-image")).toBe(false);
  });

  test("classifies live auth failures without collapsing them into one unavailable state", () => {
    expect(classifyLiveAuthFailure({ statusCode: 401, reason: "session_expired" }).kind).toBe(
      "login_expired",
    );
    expect(classifyLiveAuthFailure({ statusCode: 401 }).kind).toBe("unauthorized");
    expect(
      classifyLiveAuthFailure({
        statusCode: 403,
        providerMessage: "organization verification required",
      }).kind,
    ).toBe("organization_verification_required");
    expect(classifyLiveAuthFailure({ statusCode: 403 }).kind).toBe("insufficient_permission");
  });

  test("requests cancellation for active live jobs when auth is disconnected", () => {
    const manager = createProviderJobManager({ createId: queueIds(), now: () => 1_000 });
    const codexJob = manager.enqueue({
      providerId: "codex",
      capability: "deckPlan",
      description: "Live deck plan",
    });
    manager.enqueue({
      providerId: "mock",
      capability: "deckPlan",
      description: "Development mock job",
    });

    const result = cancelLiveJobsForAuthLogout({
      manager,
      providerIds: ["codex", "openaiImage"],
    });

    expect(result.cancelledJobIds).toEqual([codexJob.id]);
    expect(manager.get(codexJob.id)?.cancelRequested).toBe(true);
  });

  test("returns locked provider statuses when auth logout disconnects live providers", () => {
    const manager = createProviderJobManager({ createId: queueIds(), now: () => 1_000 });
    const codexJob = manager.enqueue({
      providerId: "codex",
      capability: "research",
      description: "Live research",
    });

    const result = createLiveAuthLogoutLockState({
      manager,
      providerIds: ["codex", "openaiImage"],
      message: "Live auth disconnected. Sign in again before continuing.",
    });

    expect(result.uiLocked).toBe(true);
    expect(result.cancelledJobIds).toEqual([codexJob.id]);
    expect(result.providerStatuses).toEqual([
      {
        kind: "requiresAuth",
        providerId: "codex",
        message: "Live auth disconnected. Sign in again before continuing.",
      },
      {
        kind: "requiresAuth",
        providerId: "openaiImage",
        message: "Live auth disconnected. Sign in again before continuing.",
      },
    ]);
  });
});

function queueIds(): () => string {
  let next = 0;
  return () => {
    next += 1;
    return `job_${next}`;
  };
}
