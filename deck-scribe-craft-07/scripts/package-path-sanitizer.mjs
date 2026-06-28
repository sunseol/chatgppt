import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";

const TEXT_EXTENSIONS = new Set([".css", ".html", ".js", ".json", ".mjs", ".txt"]);

export function sanitizePackageBuildDirectory(directory, workspaceRoot) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      sanitizePackageBuildDirectory(path, workspaceRoot);
      continue;
    }
    if (!TEXT_EXTENSIONS.has(extname(path))) continue;
    const original = readFileSync(path, "utf8");
    const sanitized = sanitizePackageBuildText(original, workspaceRoot);
    if (sanitized !== original) writeFileSync(path, sanitized, "utf8");
  }
}

export function sanitizePackageBuildText(text, workspaceRoot) {
  const normalizedRoot = workspaceRoot.replaceAll("\\", "/").replace(/\/+$/, "");
  return text.replaceAll(`file://${normalizedRoot}/`, "").replaceAll(`${normalizedRoot}/`, "");
}
