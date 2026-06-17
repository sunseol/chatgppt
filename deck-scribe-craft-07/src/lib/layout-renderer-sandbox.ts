export type LayoutRendererSandboxIssueCode =
  | "external-url"
  | "tauri-api"
  | "script-execution"
  | "inline-event-handler"
  | "blocked-element"
  | "css-import"
  | "css-url"
  | "css-property"
  | "sensitive-file-path";

export type LayoutRendererSandboxIssue = {
  readonly code: LayoutRendererSandboxIssueCode;
  readonly message: string;
};

export type LayoutRendererSandboxResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly issues: readonly LayoutRendererSandboxIssue[] };

type SandboxRule = {
  readonly code: LayoutRendererSandboxIssueCode;
  readonly message: string;
  readonly patterns: readonly RegExp[];
};

const SANDBOX_RULES: readonly SandboxRule[] = [
  {
    code: "external-url",
    message: "Layout renderer output must not contain external URL request surfaces.",
    patterns: [
      /\b(?:https?:)?\/\/[^\s"'<>)]/i,
      /\b(?:src|href|poster|action|formaction|xlink:href)\s*=\s*["']?\s*(?:https?:|\/\/|data:|blob:|file:)/i,
      /\burl\s*\(\s*["']?\s*(?:https?:|\/\/|data:|blob:|file:)/i,
    ],
  },
  {
    code: "tauri-api",
    message: "Layout renderer output must not expose Tauri API access surfaces.",
    patterns: [
      /__TAURI__/i,
      /__TAURI_IPC__/i,
      /__TAURI_INTERNALS__/i,
      /@tauri-apps\/api/i,
      /\btauri:\/\//i,
      /\bwindow\s*\.\s*ipc\b/i,
    ],
  },
  {
    code: "script-execution",
    message: "Layout renderer output must not contain script execution surfaces.",
    patterns: [/<\s*script\b/i, /\bjavascript\s*:/i],
  },
  {
    code: "inline-event-handler",
    message: "Layout renderer output must not contain inline event handlers.",
    patterns: [/<[^>]+\s+on[a-z][\w:-]*\s*=/i],
  },
  {
    code: "blocked-element",
    message: "Layout renderer output must not contain embeddable or metadata elements.",
    patterns: [
      /<\s*(?:iframe|object|embed)\b/i,
      /<\s*link\b[^>]*\brel\s*=\s*["']?stylesheet/i,
      /<\s*meta\b[^>]*http-equiv\s*=\s*["']?refresh/i,
    ],
  },
  {
    code: "sensitive-file-path",
    message: "Layout renderer output must not contain sensitive local auth file paths.",
    patterns: [
      /(?:~|\/(?:Users|home)\/[^\s"'<>]+)\/\.codex\/auth\.json/i,
      /[A-Za-z]:\\Users\\[^\s"'<>]+\\\.codex\\auth\.json/i,
    ],
  },
];

const ALLOWED_CSS_PROPERTIES = new Set([
  "background",
  "border",
  "bottom",
  "box-sizing",
  "height",
  "left",
  "margin",
  "overflow",
  "position",
  "right",
  "top",
  "width",
]);

export class LayoutRendererSandboxError extends Error {
  readonly issues: readonly LayoutRendererSandboxIssue[];

  constructor(issues: readonly LayoutRendererSandboxIssue[]) {
    super(issues.map((issue) => issue.message).join(" "));
    this.name = "LayoutRendererSandboxError";
    this.issues = issues;
  }
}

export function validateLayoutRendererSandbox(html: string): LayoutRendererSandboxResult {
  const issues = [
    ...SANDBOX_RULES.filter((rule) => matchesAny(html, rule.patterns)).map((rule) => ({
      code: rule.code,
      message: rule.message,
    })),
    ...cssWhitelistIssues(html),
  ];
  return issues.length === 0 ? { ok: true } : { ok: false, issues };
}

export function enforceLayoutRendererSandbox(html: string): string {
  const result = validateLayoutRendererSandbox(html);
  if (!result.ok) {
    throw new LayoutRendererSandboxError(result.issues);
  }
  return html;
}

function matchesAny(value: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

function cssWhitelistIssues(html: string): readonly LayoutRendererSandboxIssue[] {
  const css = cssTexts(html).join("\n");
  if (css.length === 0) return [];
  const issues: LayoutRendererSandboxIssue[] = [];
  if (/@import\b/i.test(css)) {
    issues.push({ code: "css-import", message: "CSS imports are not allowed." });
  }
  if (/\burl\s*\(/i.test(css)) {
    issues.push({ code: "css-url", message: "CSS URL references are not allowed." });
  }
  if (hasDisallowedCssProperty(css)) {
    issues.push({ code: "css-property", message: "CSS contains a non-whitelisted property." });
  }
  return issues;
}

function cssTexts(html: string): readonly string[] {
  const texts: string[] = [];
  for (const match of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    const css = match[1];
    if (css) texts.push(css);
  }
  for (const match of html.matchAll(/\sstyle\s*=\s*["']([^"']*)["']/gi)) {
    const css = match[1];
    if (css) texts.push(css);
  }
  return texts;
}

function hasDisallowedCssProperty(css: string): boolean {
  for (const match of css.matchAll(/(?:^|[;{])\s*([a-z-]+)\s*:\s*([^;{}]+)/gi)) {
    const property = match[1]?.toLowerCase();
    const value = match[2]?.toLowerCase() ?? "";
    if (!property || !ALLOWED_CSS_PROPERTIES.has(property)) return true;
    if (property === "position" && /\b(?:fixed|sticky)\b/.test(value)) return true;
  }
  return false;
}
