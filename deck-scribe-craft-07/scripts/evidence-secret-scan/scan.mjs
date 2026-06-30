import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const TEXT_EXTENSIONS = new Set([
  ".csv",
  ".html",
  ".htm",
  ".json",
  ".jsonl",
  ".log",
  ".md",
  ".txt",
  ".xml",
  ".yaml",
  ".yml",
]);
const MAX_TEXT_FILE_BYTES = 5 * 1024 * 1024;

export async function scanEvidenceSecrets(targetPaths) {
  const targets = targetPaths.map((targetPath) => path.resolve(targetPath));
  const findings = [];
  let scannedFileCount = 0;
  let skippedBinaryCount = 0;
  let skippedLargeCount = 0;

  for (const targetPath of targets) {
    for await (const filePath of walkFiles(targetPath)) {
      const fileInfo = await stat(filePath);
      if (fileInfo.size > MAX_TEXT_FILE_BYTES) {
        skippedLargeCount += 1;
        continue;
      }
      if (!isTextEvidenceFile(filePath)) {
        skippedBinaryCount += 1;
        continue;
      }
      scannedFileCount += 1;
      const text = await readFile(filePath, "utf8");
      scanTextFile({ filePath, text, findings });
    }
  }

  return {
    ok: findings.length === 0,
    scannedAt: new Date().toISOString(),
    targets,
    scannedFileCount,
    skippedBinaryCount,
    skippedLargeCount,
    findings,
  };
}

function scanTextFile({ filePath, text, findings }) {
  const lines = text.split(/\r?\n/);
  for (const { code, pattern } of secretPatterns()) {
    lines.forEach((line, lineIndex) => {
      const match = pattern.exec(line);
      pattern.lastIndex = 0;
      if (!match) return;
      findings.push({
        code,
        filePath,
        line: lineIndex + 1,
        excerpt: redactExcerpt(line),
      });
    });
  }
}

async function* walkFiles(targetPath) {
  const info = await stat(targetPath);
  if (info.isFile()) {
    yield targetPath;
    return;
  }
  if (!info.isDirectory()) return;

  const entries = await readdir(targetPath, { withFileTypes: true });
  for (const entry of entries) {
    const childPath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      yield* walkFiles(childPath);
    } else if (entry.isFile()) {
      yield childPath;
    }
  }
}

function isTextEvidenceFile(filePath) {
  return TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function redactExcerpt(line) {
  return line
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, "Bearer [REDACTED]")
    .replace(/(^|[^A-Za-z0-9])sk-[A-Za-z0-9_-]{8,}/g, "$1sk-[REDACTED]")
    .replace(
      /(["']?\b[A-Z0-9_]*API_KEY\b["']?|["']?\bCODEX_SESSION\b["']?|["']?\btoken\b["']?|["']?\bpassword\b["']?|["']?\bsecret\b["']?|["']?\bsession\b["']?)(\s*[:=]\s*)("[^"]+"|'[^']+'|\S+)/gi,
      "$1$2[REDACTED]",
    )
    .replace(/set-cookie:\s*[^\n]+/gi, "set-cookie: [REDACTED]");
}

function secretPatterns() {
  return [
    {
      code: "unredacted_authorization_header",
      pattern: /Authorization\s*:\s*Bearer\s+(?!\[REDACTED\]|\[redacted\])[A-Za-z0-9._~+/=-]{12,}/i,
    },
    {
      code: "unredacted_bearer_token",
      pattern: /\bBearer\s+(?!\[REDACTED\]|\[redacted\])[A-Za-z0-9._~+/=-]{20,}/i,
    },
    {
      code: "unredacted_openai_key",
      pattern: /(^|[^A-Za-z0-9])sk-(?!\[REDACTED\]|\[redacted\])[A-Za-z0-9_-]{16,}/,
    },
    {
      code: "unredacted_secret_assignment",
      pattern:
        /["']?\b(?:[A-Z0-9_]*API_KEY|CODEX_SESSION|token|password|secret|session)\b["']?\s*[:=]\s*(?!\[REDACTED\]|\[redacted\])["']?[^\s"']{8,}/i,
    },
    {
      code: "unredacted_set_cookie",
      pattern: /set-cookie:(?!\s*\[(?:REDACTED|redacted)\])\s*[^\n]{12,}/i,
    },
  ];
}
