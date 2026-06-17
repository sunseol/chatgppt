import { describe, expect, test } from "bun:test";
import {
  enforceLayoutRendererSandbox,
  LayoutRendererSandboxError,
  validateLayoutRendererSandbox,
} from "./layout-renderer-sandbox";
import { createLayoutIrFromPlan, renderLayoutIrToPrototype } from "./layout-ir";
import { mockBrief, mockDesign, mockPlan, mockResearch } from "./mock-ai";

describe("renderer sandbox minimum", () => {
  test("allows deterministic Layout IR renderer output", () => {
    const { plan, design } = approvedFixtures();
    const layout = renderLayoutIrToPrototype(createLayoutIrFromPlan({ plan, design }));

    expect(layout.slides.every((slide) => validateLayoutRendererSandbox(slide.html).ok)).toBe(true);
  });

  test("blocks external URL request surfaces", () => {
    const result = validateLayoutRendererSandbox(
      '<section><img src="https://example.com/chart.png"><div style="background:url(//cdn.test/a.png)"></div></section>',
    );

    expect(result.ok).toBe(false);
    expect(blockedIssueCodes(result).includes("external-url")).toBe(true);
  });

  test("blocks Tauri API access surfaces", () => {
    const result = validateLayoutRendererSandbox(
      "<section><script>window.__TAURI__.invoke('read_file')</script></section>",
    );

    expect(result.ok).toBe(false);
    expect(blockedIssueCodes(result).includes("tauri-api")).toBe(true);
  });

  test("blocks script execution and inline event handlers", () => {
    const result = validateLayoutRendererSandbox(
      '<section onclick="alert(1)"><script>alert(1)</script></section>',
    );

    expect(result.ok).toBe(false);
    expect(blockedIssueCodes(result).includes("script-execution")).toBe(true);
    expect(blockedIssueCodes(result).includes("inline-event-handler")).toBe(true);
  });

  test("blocks forbidden HTML embed elements", () => {
    const result = validateLayoutRendererSandbox(
      '<section><iframe srcdoc="<p>x</p>"></iframe><object data="/local.svg"></object><link rel="stylesheet" href="/deck.css"></section>',
    );

    expect(result.ok).toBe(false);
    expect(blockedIssueCodes(result).includes("blocked-element")).toBe(true);
  });

  test("blocks CSS imports URLs and non-whitelisted properties", () => {
    const result = validateLayoutRendererSandbox(
      '<style>@import "/theme.css";.x{filter:blur(2px);position:fixed;background:url(/a.png)}</style><section style="zoom:1"></section>',
    );

    expect(result.ok).toBe(false);
    expect(blockedIssueCodes(result).includes("css-import")).toBe(true);
    expect(blockedIssueCodes(result).includes("css-url")).toBe(true);
    expect(blockedIssueCodes(result).includes("css-property")).toBe(true);
  });

  test("blocks sensitive Codex auth file paths", () => {
    const result = validateLayoutRendererSandbox(
      '<section data-debug-path="/Users/jake/.codex/auth.json">auth path</section>',
    );

    expect(result.ok).toBe(false);
    expect(blockedIssueCodes(result).includes("sensitive-file-path")).toBe(true);
  });

  test("fails layout rendering when sandbox enforcement fails", () => {
    const error = captureError(() =>
      enforceLayoutRendererSandbox('<section onload="window.__TAURI__.invoke()">unsafe</section>'),
    );

    expect(error instanceof LayoutRendererSandboxError).toBe(true);
  });
});

function approvedFixtures() {
  const brief = mockBrief("검증 가능한 AI 슬라이드 제작 시스템", 8, "16:9");
  const research = mockResearch(brief);
  const plan = { ...mockPlan(brief, research), approvedHash: "sha256:approved-plan" };
  const design = { ...mockDesign(brief, plan), approvedHash: "sha256:approved-design" };
  return { plan, design };
}

function blockedIssueCodes(result: ReturnType<typeof validateLayoutRendererSandbox>) {
  return result.ok ? [] : result.issues.map((issue) => issue.code);
}

function captureError(action: () => void): unknown {
  try {
    action();
    return undefined;
  } catch (error) {
    return error;
  }
}
