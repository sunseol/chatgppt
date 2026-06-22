#!/usr/bin/env bun

import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import server from "./server/server.js";

const CLIENT_ROOT = resolve(import.meta.dir, "client");
const ASSET_PREFIX = "/assets/";
const CODEX_SMOKE_ENDPOINT = "/api/codex/app-server/smoke";
const CODEX_STRUCTURED_TURN_ENDPOINT = "/api/codex/app-server/structured-turn";
const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";
const MAX_CODEX_BRIDGE_BODY_BYTES = 512 * 1024;
const CONTENT_TYPE_BY_EXTENSION = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
]);

async function fetch(request, env, ctx) {
  const codexBridgeResponse = await serveCodexAppServerBridge(request);
  if (codexBridgeResponse) return codexBridgeResponse;

  const faviconResponse = serveBrowserFavicon(request);
  if (faviconResponse) return faviconResponse;

  const assetResponse = await servePackagedAsset(request);
  if (assetResponse) return assetResponse;

  const fallbackResponse = await server.fetch(request, env, ctx);
  return injectDryRunCodexBridgeConfig(request, fallbackResponse);
}

async function serveCodexAppServerBridge(request) {
  const url = new URL(request.url);
  if (url.pathname !== CODEX_SMOKE_ENDPOINT && url.pathname !== CODEX_STRUCTURED_TURN_ENDPOINT) {
    return undefined;
  }

  if (!isLocalBridgeHost(url.hostname)) {
    return jsonResponse(
      { code: "forbidden_host", message: "Dry-run Codex bridge is only available on localhost." },
      403,
    );
  }
  if (request.method !== "POST") {
    return jsonResponse(
      { code: "method_not_allowed", message: "Dry-run Codex bridge requires POST." },
      405,
    );
  }

  try {
    const appServer = await import("./app-server/live-app-server-json-rpc.ts");
    if (url.pathname === CODEX_SMOKE_ENDPOINT) {
      return jsonResponse(await appServer.runSmoke());
    }

    const payload = await readJsonBody(request);
    const turnRequest = isRecord(payload) ? payload.request : undefined;
    if (!isRecord(turnRequest)) {
      return jsonResponse(
        { code: "invalid_structured_turn_request", message: "request must be a JSON object." },
        400,
      );
    }
    return jsonResponse(await appServer.runStructuredTurn(turnRequest));
  } catch (error) {
    return jsonResponse(codexBridgeError(error), 500);
  }
}

function isLocalBridgeHost(hostname) {
  return (
    hostname === "127.0.0.1" ||
    hostname === "localhost" ||
    hostname === "::1" ||
    hostname === "[::1]"
  );
}

async function readJsonBody(request) {
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > MAX_CODEX_BRIDGE_BODY_BYTES) {
    throw { code: "request_too_large", message: "Dry-run Codex bridge request body is too large." };
  }
  if (text.trim().length === 0) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw { code: "invalid_json", message: "Dry-run Codex bridge request body must be JSON." };
    }
    throw error;
  }
}

function codexBridgeError(error) {
  if (isRecord(error) && typeof error.code === "string" && typeof error.message === "string") {
    return { code: error.code, message: error.message };
  }
  if (error instanceof Error) {
    return { code: "codex_bridge_failed", message: error.message };
  }
  return { code: "codex_bridge_failed", message: "Dry-run Codex bridge failed." };
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function injectDryRunCodexBridgeConfig(request, response) {
  if (request.method !== "GET") return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) return response;

  const bridgeScript = `<script>window.__DECKFORGE_DRY_RUN_CODEX_BRIDGE__=${JSON.stringify({
    enabled: true,
    smokeEndpoint: CODEX_SMOKE_ENDPOINT,
    structuredTurnEndpoint: CODEX_STRUCTURED_TURN_ENDPOINT,
  })};</script>`;
  const html = await response.text();
  const body = html.includes("</head>")
    ? html.replace("</head>", `${bridgeScript}</head>`)
    : `${bridgeScript}${html}`;
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function serveBrowserFavicon(request) {
  if (request.method !== "GET" && request.method !== "HEAD") return undefined;
  const pathname = decodeURIComponent(new URL(request.url).pathname);
  if (pathname !== "/favicon.ico") return undefined;
  return new Response(null, { status: 204, headers: { "cache-control": IMMUTABLE_CACHE } });
}

async function servePackagedAsset(request) {
  if (request.method !== "GET" && request.method !== "HEAD") return undefined;

  const pathname = decodeURIComponent(new URL(request.url).pathname);
  if (!pathname.startsWith(ASSET_PREFIX)) return undefined;

  const filePath = resolve(CLIENT_ROOT, `.${pathname}`);
  if (!isInsideClientRoot(filePath)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) return undefined;

    const headers = new Headers({
      "cache-control": IMMUTABLE_CACHE,
      "content-length": String(fileStat.size),
      "content-type": contentType(filePath),
    });
    if (request.method === "HEAD") return new Response(null, { status: 200, headers });

    return new Response(await readFile(filePath), { status: 200, headers });
  } catch (error) {
    if (isMissingFile(error)) return undefined;
    throw error;
  }
}

function isInsideClientRoot(filePath) {
  const rootPrefix = CLIENT_ROOT.endsWith(sep) ? CLIENT_ROOT : `${CLIENT_ROOT}${sep}`;
  return filePath.startsWith(rootPrefix);
}

function contentType(filePath) {
  return CONTENT_TYPE_BY_EXTENSION.get(extname(filePath)) ?? "application/octet-stream";
}

function isMissingFile(error) {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function isRecord(value) {
  return typeof value === "object" && value !== null;
}

export default { fetch };
