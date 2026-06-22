export const DF245_BASE_FIXED_STRING_PATTERNS = [
  "mock-provider",
  "MOCK MODE",
  "mock_stage",
  ".omx",
  ".playwright-mcp",
  "CODEX_SESSION=",
  "OPENAI_API_KEY=",
  "auth.json",
  "sk-proj-",
  "sk-svcacct-",
];

export function normalizeDf245ScanPathMarker(workspacePath) {
  const normalized = workspacePath.trim().replaceAll("\\", "/").replace(/\/+$/u, "");
  if (!normalized) throw new Error("Workspace scan marker cannot be blank");
  return normalized;
}

export function buildDf245FixedStringPatterns(workspacePath) {
  return [
    ...new Set([...DF245_BASE_FIXED_STRING_PATTERNS, normalizeDf245ScanPathMarker(workspacePath)]),
  ];
}
