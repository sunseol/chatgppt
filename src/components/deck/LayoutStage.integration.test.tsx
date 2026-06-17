import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { StageErrorBanner } from "./stage-shared";
import { formatLayoutRenderError } from "./layout-stage-errors";

describe("layout stage error UI", () => {
  test("formats renderer failures and displays a stage error", () => {
    const message = formatLayoutRenderError(new Error("Sandbox blocked script execution."));
    const markup = renderToStaticMarkup(
      <StageErrorBanner title="레이아웃 렌더링 실패" message={message} />,
    );

    expect(message).toBe("Sandbox blocked script execution.");
    expect(markup.includes('role="alert"')).toBe(true);
    expect(markup.includes("레이아웃 렌더링 실패")).toBe(true);
    expect(markup.includes("Sandbox blocked script execution.")).toBe(true);
  });
});
