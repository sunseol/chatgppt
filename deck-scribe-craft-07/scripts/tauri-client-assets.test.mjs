import { describe, expect, test } from "bun:test";

import {
  findTauriAbsoluteAssetPaths,
  normalizeTauriClientAssetPaths,
} from "./tauri-client-assets.mjs";

describe("tauri client asset paths", () => {
  test("normalizes absolute Vite asset URLs for packaged WebViews", () => {
    const html = [
      '<link rel="stylesheet" href="/assets/app.css">',
      '<link rel="modulepreload" href="/./assets/app.js">',
      '<script>import("/./assets/entry.js")</script>',
      '<script>window.__routeId = "__root__\0"</script>',
    ].join("");

    const normalized = normalizeTauriClientAssetPaths(html);

    expect(normalized).toContain('href="./assets/app.css"');
    expect(normalized).toContain('href="./assets/app.js"');
    expect(normalized).toContain('import("./assets/entry.js")');
    expect(normalized).toContain('"__root__\\u0000"');
    expect(normalized).not.toContain("\0");
    expect(findTauriAbsoluteAssetPaths(normalized)).toEqual([]);
  });
});
