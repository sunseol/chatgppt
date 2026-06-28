import { describe, expect, test } from "bun:test";

import config from "./vite.config";

describe("vite tauri packaging config", () => {
  test("emits relative asset paths for packaged desktop builds", async () => {
    const resolvedConfig = await config({
      command: "build",
      mode: "production",
      isPreview: false,
      isSsrBuild: false,
    });

    expect(resolvedConfig.base).toBe("./");
  });
});
