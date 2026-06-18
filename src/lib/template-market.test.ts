import { describe, expect, test } from "bun:test";
import type { LayoutComponentType } from "./layout-component-catalog";
import {
  TemplateInstantiationError,
  filterTemplateCatalog,
  instantiateTemplate,
  validateTemplateMarketEntry,
} from "./template-market";

describe("template market", () => {
  test("filters catalog entries by query, aspect ratio, and component type", () => {
    const matches = filterTemplateCatalog(templateCatalog(), {
      query: "board",
      aspectRatio: "16:9",
      componentType: "ChartWithInsight",
    });

    expect(matches.map((entry) => entry.id)).toEqual(["tmpl_board_update"]);
  });

  test("blocks scripts, inline handlers, and external resources in templates", () => {
    const invalid = validateTemplateMarketEntry({
      id: "tmpl_unsafe",
      name: "Unsafe",
      category: "pitch",
      aspectRatio: "16:9",
      tags: ["unsafe"],
      slides: [
        {
          id: "slide_1",
          componentType: "KeyMessage",
          html: `<section onclick="alert(1)"><img src="https://evil.example/logo.png" /><script>alert(1)</script></section>`,
        },
      ],
    });

    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.issues.map((issue) => issue.code)).toEqual([
        "script-tag",
        "inline-handler",
        "external-resource",
      ]);
    }
  });

  test("instantiates a validated template with placeholder values", () => {
    const instance = instantiateTemplate(templateCatalog()[0], {
      title: "Board Update",
      insight: "Gross margin expanded 6pt year over year.",
      source: "Finance team forecast, June 2026",
    });

    expect(instance.slides[0].html.includes("Board Update")).toBe(true);
    expect(instance.slides[0].html.includes("Gross margin expanded 6pt")).toBe(true);
    expect(instance.slides[0].componentType).toBe("ChartWithInsight");
  });

  test("rejects instantiation for templates that fail validation", () => {
    expect(() =>
      instantiateTemplate(
        {
          id: "tmpl_unsafe",
          name: "Unsafe",
          category: "pitch",
          aspectRatio: "16:9",
          tags: ["unsafe"],
          slides: [
            {
              id: "slide_1",
              componentType: "KeyMessage",
              html: `<section><script>alert(1)</script></section>`,
            },
          ],
        },
        {},
      ),
    ).toThrow(TemplateInstantiationError);
  });
});

function templateCatalog() {
  return [
    {
      id: "tmpl_board_update",
      name: "Board Update",
      category: "pitch" as const,
      aspectRatio: "16:9" as const,
      tags: ["board", "finance"],
      slides: [
        {
          id: "slide_1",
          componentType: "ChartWithInsight" as LayoutComponentType,
          html: `<section><h1>{{title}}</h1><p>{{insight}}</p><footer>{{source}}</footer></section>`,
        },
      ],
    },
    {
      id: "tmpl_ops_review",
      name: "Ops Review",
      category: "report" as const,
      aspectRatio: "4:3" as const,
      tags: ["operations"],
      slides: [
        {
          id: "slide_1",
          componentType: "MetricCards" as LayoutComponentType,
          html: `<section><h1>{{title}}</h1></section>`,
        },
      ],
    },
  ];
}
