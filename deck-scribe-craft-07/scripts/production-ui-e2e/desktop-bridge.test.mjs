import { describe, expect, test } from "bun:test";
import { responseFor } from "./desktop-bridge.mjs";

describe("production UI E2E desktop bridge", () => {
  test("returns structured payloads for research, plan, design, and layout prompts", () => {
    const research = structuredPayload(
      responseFor("deckforge_codex_app_server_structured_turn", {
        request: { prompt: "# Live Research Pack", networkAccess: true },
      }),
    );
    const plan = structuredPayload(
      responseFor("deckforge_codex_app_server_structured_turn", {
        request: { prompt: "# Deck Plan Generation Package" },
      }),
    );
    const design = structuredPayload(
      responseFor("deckforge_codex_app_server_structured_turn", {
        request: { prompt: "# Design System Generation Package" },
      }),
    );
    const layout = structuredPayload(
      responseFor("deckforge_codex_app_server_structured_turn", {
        request: { prompt: "# Layout IR Generation Package" },
      }),
    );

    expect(research.id).toBe("production_ui_e2e_research_pack");
    expect(research.datasets[0]?.rows[0]?.value).toBe(5);
    expect(research.sources[0]?.capture?.rawArchivePath).toContain("production-ui-e2e");
    expect(plan.markdown).toContain("## Slide 1.");
    expect(plan.markdown).toContain("## Slide 5.");
    expect(plan.markdown).not.toContain("## Slide 6.");
    expect(plan.markdown).toContain("claim_openai_image_generation");
    expect(plan.markdown).not.toContain("claim_001");
    expect(design.id).toBe("production_ui_e2e_design_system");
    expect(layout.id).toBe("production_ui_e2e_layout_ir");
    expect(layout.slides.length).toBe(5);
  });

  test("returns deterministic live image and project artifact write evidence", () => {
    const image = responseFor("deckforge_openai_image_generate", {
      request: { prompt: "Generate slide 1", aspectRatio: "16:9" },
    });
    const write = responseFor("deckforge_write_project_artifact", {
      request: {
        projectId: "project-ui-created",
        relativePath: "slides/images/slide_001.v1.png",
        content: { kind: "base64", value: "iVBORw0KGgo=" },
      },
    });

    expect(image.imageDataUrl).toStartWith("data:image/png;base64,");
    expect(image.requestId).toContain("img_req_production_ui_e2e");
    expect(image.quality).toBe("high");
    expect(write.filePath).toContain("project-ui-created/slides/images/slide_001.v1.png");
    expect(write.bytes).toBeGreaterThan(0);
  });
});

function structuredPayload(result) {
  const item = result.notifications.find((notification) => notification.method === "item/completed")
    ?.params?.item;
  if (!item || typeof item.text !== "string") throw new Error("Missing structured payload text.");
  return JSON.parse(item.text);
}
