import { describe, expect, test } from "bun:test";
import type { LayoutPrototype } from "@/lib/deck-types";
import { buildRequiredOverlayRolesBySlide } from "./review-gallery-required-roles";

describe("review gallery required roles", () => {
  test("derives unique editable review roles from layout layers", () => {
    const layout: LayoutPrototype = {
      id: "layout-1",
      slides: [
        {
          number: 1,
          componentType: "cover",
          html: "<section />",
          domLayers: [layer("title"), layer("subtitle"), layer("title"), layer("decorativeShape")],
        },
        {
          number: 2,
          componentType: "chart",
          html: "<section />",
          domLayers: [layer("title"), layer("chart"), layer("body"), layer("source")],
        },
      ],
    };

    expect(buildRequiredOverlayRolesBySlide(layout)).toEqual({
      1: ["title", "subtitle"],
      2: ["title", "chart", "body", "source"],
    });
  });
});

function layer(role: string): LayoutPrototype["slides"][number]["domLayers"][number] {
  return {
    id: `layer-${role}`,
    role,
    editable: true,
    sourceIds: [],
    datasetIds: [],
    bounds: { x: 0, y: 0, w: 10, h: 10 },
  };
}
