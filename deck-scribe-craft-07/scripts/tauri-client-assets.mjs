#!/usr/bin/env bun

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultIndexPath = join(root, "dist", "client", "index.html");

export function normalizeTauriClientAssetPaths(html) {
  return html.replaceAll("\0", "\\u0000").replace(/(["'(])\/(?:\.\/)?assets\//g, "$1./assets/");
}

export function findTauriAbsoluteAssetPaths(html) {
  return [...html.matchAll(/(["'(])\/(?:\.\/)?assets\/[^"'()<>\\\s]+/g)].map((match) =>
    match[0].slice(1),
  );
}

export function patchTauriClientIndex(indexPath = defaultIndexPath) {
  if (!existsSync(indexPath)) {
    throw new Error(`Missing Tauri client index: ${indexPath}`);
  }

  const html = readFileSync(indexPath, "utf8");
  const patchedHtml = normalizeTauriClientAssetPaths(html);
  if (patchedHtml !== html) {
    writeFileSync(indexPath, patchedHtml, "utf8");
  }

  const remaining = findTauriAbsoluteAssetPaths(patchedHtml);
  if (remaining.length > 0) {
    throw new Error(`Tauri client still has absolute asset paths: ${remaining.join(", ")}`);
  }

  return { changed: patchedHtml !== html };
}

if (import.meta.main) {
  const result = patchTauriClientIndex();
  console.log(
    result.changed
      ? "Patched Tauri client asset paths to relative URLs."
      : "Tauri client asset paths already relative.",
  );
}
