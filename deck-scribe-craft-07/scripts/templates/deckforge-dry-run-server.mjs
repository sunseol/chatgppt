#!/usr/bin/env bun

import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import server from "./server/server.js";

const CLIENT_ROOT = resolve(import.meta.dir, "client");
const ASSET_PREFIX = "/assets/";
const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";
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
  const assetResponse = await servePackagedAsset(request);
  if (assetResponse) return assetResponse;
  return server.fetch(request, env, ctx);
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

export default { fetch };
