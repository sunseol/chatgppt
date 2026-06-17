import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { EditorTextInspector } from "./EditorTextInspector";

describe("editor text inspector", () => {
  test("renders a Korean text editing surface for editable text layers", () => {
    const markup = renderToStaticMarkup(
      <EditorTextInspector
        layer={{
          id: "title_1",
          type: "text",
          role: "title",
          text: "편집 가능한 제목",
          bounds: { x: 96, y: 96, w: 900, h: 120 },
          editable: true,
        }}
        exportHash="sha256:edited"
        onTextChange={() => undefined}
      />,
    );

    expect(markup.includes("텍스트 편집")).toBe(true);
    expect(markup.includes("편집 가능한 제목")).toBe(true);
    expect(markup.includes("sha256:edited")).toBe(true);
  });
});
