import { describe, expect, test } from "bun:test";
import { selectProviderOptionsForRuntime } from "./provider-selection-policy";

describe("provider selection policy", () => {
  test("removes mock providers from production choices", () => {
    const options = selectProviderOptionsForRuntime({
      executionMode: "production",
      providers: [
        { providerId: "mock", providerKind: "mock", label: "Mock Provider" },
        { providerId: "codex", providerKind: "codex", label: "Codex" },
        { providerId: "openaiImage", providerKind: "openaiImage", label: "OpenAI Image" },
      ],
    });

    expect(options.map((option) => option.providerId)).toEqual(["codex", "openaiImage"]);
  });

  test("keeps mock providers selectable outside production", () => {
    const options = selectProviderOptionsForRuntime({
      executionMode: "development",
      providers: [{ providerId: "mock", providerKind: "mock", label: "Mock Provider" }],
    });

    expect(options).toEqual([{ providerId: "mock", providerKind: "mock", label: "Mock Provider" }]);
  });
});
