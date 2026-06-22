import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, test } from "bun:test";
import { createDeterministicTarGzipArchive, launcherScript } from "./package-dry-run.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const dryRunServerTemplate = join(here, "templates", "deckforge-dry-run-server.mjs");

describe("package dry-run archive", () => {
  test("runs the packaged server from the Resources directory", () => {
    const script = launcherScript();

    expect(script).toContain('cd "$RESOURCE_DIR"');
    expect(script).toContain("exec bun dry-run-server.mjs");
  });

  test("serves packaged client assets before the SSR fallback", async () => {
    const root = join(tmpdir(), `deckforge-dry-run-server-${process.pid}-${Date.now()}`);

    try {
      mkdirSync(join(root, "client", "assets"), { recursive: true });
      mkdirSync(join(root, "server"), { recursive: true });
      copyFileSync(dryRunServerTemplate, join(root, "dry-run-server.mjs"));
      writeFileSync(join(root, "client", "assets", "app.js"), "console.log('asset');\n");
      writeFileSync(
        join(root, "server", "server.js"),
        "export default { fetch() { return new Response('fallback', { status: 299 }); } };\n",
      );

      const wrapper = await import(
        `${pathToFileURL(join(root, "dry-run-server.mjs")).href}?t=${Date.now()}`
      );
      const asset = await wrapper.default.fetch(
        new Request("http://127.0.0.1/assets/app.js"),
        {},
        {},
      );
      const fallback = await wrapper.default.fetch(
        new Request("http://127.0.0.1/project/demo/deck-plan"),
        {},
        {},
      );

      expect(asset.status).toBe(200);
      expect(asset.headers.get("content-type")).toBe("text/javascript; charset=utf-8");
      expect(await asset.text()).toBe("console.log('asset');\n");
      expect(fallback.status).toBe(299);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("handles browser favicon probes without a packaged 404", async () => {
    const root = join(tmpdir(), `deckforge-dry-run-favicon-${process.pid}-${Date.now()}`);

    try {
      mkdirSync(join(root, "client"), { recursive: true });
      mkdirSync(join(root, "server"), { recursive: true });
      copyFileSync(dryRunServerTemplate, join(root, "dry-run-server.mjs"));
      writeFileSync(
        join(root, "server", "server.js"),
        "export default { fetch() { return new Response('fallback', { status: 299 }); } };\n",
      );

      const wrapper = await import(
        `${pathToFileURL(join(root, "dry-run-server.mjs")).href}?t=${Date.now()}`
      );
      const favicon = await wrapper.default.fetch(
        new Request("http://127.0.0.1/favicon.ico"),
        {},
        {},
      );

      expect(favicon.status).toBe(204);
      expect(await favicon.text()).toBe("");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("injects dry-run Codex bridge configuration into packaged HTML", async () => {
    const root = join(tmpdir(), `deckforge-dry-run-html-${process.pid}-${Date.now()}`);

    try {
      mkdirSync(join(root, "client"), { recursive: true });
      mkdirSync(join(root, "server"), { recursive: true });
      copyFileSync(dryRunServerTemplate, join(root, "dry-run-server.mjs"));
      writeFileSync(
        join(root, "server", "server.js"),
        [
          "export default {",
          "  fetch() {",
          "    return new Response('<html><head><title>DeckForge</title></head><body></body></html>', {",
          "      headers: { 'content-type': 'text/html; charset=utf-8' },",
          "    });",
          "  },",
          "};",
          "",
        ].join("\n"),
      );

      const wrapper = await import(
        `${pathToFileURL(join(root, "dry-run-server.mjs")).href}?t=${Date.now()}`
      );
      const response = await wrapper.default.fetch(new Request("http://127.0.0.1/"), {}, {});
      const html = await response.text();

      expect(html).toContain("window.__DECKFORGE_DRY_RUN_CODEX_BRIDGE__");
      expect(html).toContain("/api/codex/app-server/smoke");
      expect(html).toContain("/api/codex/app-server/structured-turn");
      expect(response.headers.get("content-length")).toBe(null);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("serves Codex app-server dry-run endpoints from localhost only", async () => {
    const root = join(tmpdir(), `deckforge-dry-run-codex-${process.pid}-${Date.now()}`);

    try {
      mkdirSync(join(root, "client"), { recursive: true });
      mkdirSync(join(root, "server"), { recursive: true });
      mkdirSync(join(root, "app-server"), { recursive: true });
      copyFileSync(dryRunServerTemplate, join(root, "dry-run-server.mjs"));
      writeFileSync(
        join(root, "server", "server.js"),
        "export default { fetch() { return new Response('fallback', { status: 299 }); } };\n",
      );
      writeFileSync(
        join(root, "app-server", "live-app-server-json-rpc.ts"),
        [
          "export async function runSmoke() {",
          "  return {",
          "    initOk: true,",
          "    accountType: 'chatgpt',",
          "    threadId: 'thread_pkg',",
          "    turnId: 'turn_pkg',",
          "    turnCompleted: true,",
          "    protocolLineCount: 4,",
          "    stderrLogLineCount: 0,",
          "    eventMethods: ['turn/completed'],",
          '    finalText: \'{"status":"ok"}\',',
          "  };",
          "}",
          "export async function runStructuredTurn(request) {",
          "  return {",
          "    runtime: 'codex app-server --stdio',",
          "    threadId: request.prompt,",
          "    turnId: 'turn_pkg_structured',",
          "    turnCompleted: true,",
          "    durationMs: 42,",
          "    protocolLineCount: 5,",
          "    stderrLogLineCount: 0,",
          "    eventMethods: ['turn/completed'],",
          "    notifications: [{ method: 'turn/completed' }],",
          "  };",
          "}",
          "",
        ].join("\n"),
      );

      const wrapper = await import(
        `${pathToFileURL(join(root, "dry-run-server.mjs")).href}?t=${Date.now()}`
      );
      const forbidden = await wrapper.default.fetch(
        new Request("http://example.com/api/codex/app-server/smoke", { method: "POST" }),
        {},
        {},
      );
      const smoke = await wrapper.default.fetch(
        new Request("http://127.0.0.1/api/codex/app-server/smoke", { method: "POST" }),
        {},
        {},
      );
      const structured = await wrapper.default.fetch(
        new Request("http://127.0.0.1/api/codex/app-server/structured-turn", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ request: { prompt: "thread_from_request" } }),
        }),
        {},
        {},
      );

      expect(forbidden.status).toBe(403);
      expect(smoke.status).toBe(200);
      expect(await smoke.json()).toMatchObject({
        accountType: "chatgpt",
        threadId: "thread_pkg",
      });
      expect(structured.status).toBe(200);
      expect(await structured.json()).toMatchObject({
        runtime: "codex app-server --stdio",
        threadId: "thread_from_request",
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("creates stable archives when source mtimes change", () => {
    const root = join(tmpdir(), `deckforge-dry-run-${process.pid}-${Date.now()}`);
    const sourceDir = join(root, "source");
    const macosDir = join(sourceDir, "DeckForge.app", "Contents", "MacOS");
    const resourcesDir = join(sourceDir, "DeckForge.app", "Contents", "Resources", "client");
    const archiveA = join(root, "a.tgz");
    const archiveB = join(root, "b.tgz");

    try {
      mkdirSync(macosDir, { recursive: true });
      mkdirSync(resourcesDir, { recursive: true });
      writeFileSync(join(sourceDir, "DeckForge.app", "Contents", "Info.plist"), "<plist />\n");
      writeFileSync(join(macosDir, "deckforge"), "#!/bin/sh\nexit 0\n");
      chmodSync(join(macosDir, "deckforge"), 0o755);
      writeFileSync(join(resourcesDir, "index.html"), "<main>DeckForge</main>\n");
      writeFileSync(join(sourceDir, "README.md"), "# Dry Run\n");

      createDeterministicTarGzipArchive({
        sourceDir,
        archivePath: archiveA,
        entries: ["DeckForge.app", "README.md"],
      });

      utimesSync(
        join(resourcesDir, "index.html"),
        new Date("2030-01-01T00:00:00Z"),
        new Date("2030-01-01T00:00:00Z"),
      );

      createDeterministicTarGzipArchive({
        sourceDir,
        archivePath: archiveB,
        entries: ["DeckForge.app", "README.md"],
      });

      expect(sha256(archiveB)).toBe(sha256(archiveA));
      expect(readFileSync(archiveB).equals(readFileSync(archiveA))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}
